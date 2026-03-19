import { AnimatePresence, motion } from "framer-motion";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { BookingView } from "./components/BookingView";
import { GalleryStrip } from "./components/GalleryStrip";
import { TabBar } from "./components/TabBar";
import { Toast } from "./components/Toast";
import { bootstrapAppData, getCurrentSessionProfile, logAppEvent } from "./lib/api";
import { dateOptions, emptyBrandConfig } from "./app/constants";
import { isSupabaseConfigured, subscribeToRealtimeTables } from "./lib/supabase";
import { buildWhatsAppLink } from "./utils/schedule";
import { buildBarberWhatsAppMessage, buildClientWhatsAppMessage } from "./utils/whatsapp";
import { useAppointments } from "./hooks/useAppointments";
import { useBarbers } from "./hooks/useBarbers";
import { useBooking } from "./hooks/useBooking";
import { useServices } from "./hooks/useServices";
import { useStaffPanel } from "./hooks/useStaffPanel";
import { useAdminDashboard } from "./hooks/useAdminDashboard";
import { useAuthControls } from "./hooks/useAuthControls";
import { buildRealtimeStatusLabel } from "./utils/experience";

const THEME_STORAGE_KEY = "appmobilebarbearia.theme-mode";
const PanelView = lazy(() => import("./components/PanelView").then((module) => ({ default: module.PanelView })));
const AutomationsView = lazy(() =>
  import("./components/AutomationsView").then((module) => ({ default: module.AutomationsView }))
);
const WhatsappView = lazy(() =>
  import("./components/WhatsappView").then((module) => ({ default: module.WhatsappView }))
);
const AdminView = lazy(() => import("./components/AdminView").then((module) => ({ default: module.AdminView })));

function hexToRgb(value) {
  const normalized = value.replace("#", "");
  const full = normalized.length === 3
    ? normalized
        .split("")
        .map((item) => `${item}${item}`)
        .join("")
    : normalized;

  const int = Number.parseInt(full, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255
  };
}

function rgbaFromHex(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function AppSkeleton() {
  return (
    <div className="app-shell">
      <div className="glass-card loading-card skeleton-shell">
        <div className="skeleton-line skeleton-line-lg" />
        <div className="skeleton-line skeleton-line-md" />
        <div className="skeleton-grid">
          <div className="skeleton-block" />
          <div className="skeleton-block" />
          <div className="skeleton-block" />
        </div>
      </div>
    </div>
  );
}

function ViewSkeleton() {
  return (
    <div className="glass-card loading-card skeleton-shell">
      <div className="skeleton-line skeleton-line-lg" />
      <div className="skeleton-line skeleton-line-md" />
      <div className="skeleton-grid">
        <div className="skeleton-block" />
        <div className="skeleton-block" />
      </div>
    </div>
  );
}

function getAppointmentServiceList(appointment, services) {
  if (appointment.services?.length) {
    return appointment.services;
  }

  return services
    .filter((service) => appointment.serviceIds.includes(service.id))
    .map((service) => ({
      id: service.id,
      name: service.name,
      price: service.price,
      duration: service.duration,
      sortOrder: service.sortOrder
    }));
}

function App() {
  const [scheduleBlocks, setScheduleBlocks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [galleryPosts, setGalleryPosts] = useState([]);
  const [brandConfig, setBrandConfig] = useState(emptyBrandConfig);
  const [brandEditor, setBrandEditor] = useState(emptyBrandConfig);
  const [activeView, setActiveView] = useState("booking");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [session, setSession] = useState(null);
  const [themeMode, setThemeMode] = useState(() => {
    if (typeof localStorage === "undefined") {
      return "dark";
    }

    return localStorage.getItem(THEME_STORAGE_KEY) || "dark";
  });
  const [liveEvents, setLiveEvents] = useState(0);
  const [lastRealtimeSyncAt, setLastRealtimeSyncAt] = useState(null);
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [toast, setToast] = useState(null);
  const barbersApi = useBarbers();
  const servicesApi = useServices();
  const appointmentsApi = useAppointments();
  const { barbers, loading: isLoadingBarbers, reload: reloadBarbers } = barbersApi;
  const { services, loading: isLoadingServices, reload: reloadServices } = servicesApi;
  const { appointments, loading: isLoadingAppointments, reload: reloadAppointments } = appointmentsApi;

  // ALTERACAO: camada central de notificacao efemera para todo o app.
  const showToast = useCallback(({ type = "info", title, message }) => {
    setToast({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      title,
      message
    });
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setToast((current) => (current?.id === toast.id ? null : current));
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const refreshData = useCallback(async (sessionProfileOverride) => {
    setIsLoading(true);
    setLoadError("");

    try {
      const resolvedSession =
        sessionProfileOverride === undefined ? await getCurrentSessionProfile() : sessionProfileOverride;
      const data = await bootstrapAppData(resolvedSession);
      setSession(resolvedSession);
      setScheduleBlocks(data.scheduleBlocks);
      setCustomers(data.customers);
      setNotifications(data.notifications);
      setStaffMembers(data.staffMembers);
      setLogs(data.logs);
      setGalleryPosts(data.galleryPosts);
      setBrandConfig(data.brandConfig);
      setBrandEditor(data.brandConfig);
    } catch (error) {
      setLoadError(error.message || "Falha ao carregar os dados da operacao.");
      await logAppEvent({
        level: "error",
        eventType: "app.bootstrap_failed",
        message: error.message || "Falha ao carregar o app"
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const hydrateAppointmentView = useCallback(
    (baseAppointment) => {
      const barber = barbers.find((item) => item.id === baseAppointment.barberId);
      const appointmentServices = getAppointmentServiceList(baseAppointment, services);
      const subtotal =
        baseAppointment.totalPrice ||
        appointmentServices.reduce((sum, service) => sum + Number(service.price ?? 0), 0);

      return {
        ...baseAppointment,
        barber,
        services: appointmentServices,
        subtotal,
        clientWhatsappLink: barber
          ? buildWhatsAppLink(
              baseAppointment.clientWhatsapp,
              buildClientWhatsAppMessage({
                appointment: baseAppointment,
                barber,
                services: appointmentServices,
                businessWhatsapp: brandConfig.businessWhatsapp
              })
            )
          : "#",
        barberWhatsappLink: barber
          ? buildWhatsAppLink(
              barber.phone,
              buildBarberWhatsAppMessage({
                appointment: baseAppointment,
                services: appointmentServices
              })
            )
          : "#",
        rescheduleWhatsappLink: buildWhatsAppLink(
          brandConfig.businessWhatsapp,
          [
            "Oi, quero remarcar meu agendamento.",
            `Codigo: ${baseAppointment.id}`,
            `Cliente: ${baseAppointment.clientName}`,
            `Profissional: ${barber?.name || "-"}`,
            `Data atual: ${baseAppointment.date}`,
            `Horario atual: ${baseAppointment.startTime}`
          ].join("\n")
        ),
        cancelWhatsappLink: buildWhatsAppLink(
          brandConfig.businessWhatsapp,
          [
            "Oi, quero cancelar meu agendamento.",
            `Codigo: ${baseAppointment.id}`,
            `Cliente: ${baseAppointment.clientName}`,
            `Profissional: ${barber?.name || "-"}`,
            `Data: ${baseAppointment.date}`,
            `Horario: ${baseAppointment.startTime}`
          ].join("\n")
        )
      };
    },
    [barbers, brandConfig.businessWhatsapp, services]
  );

  const staffPanel = useStaffPanel({
    barbers,
    services,
    appointmentsApi,
    scheduleBlocks,
    session,
    refreshData,
    showToast
  });

  const booking = useBooking({
    barbers,
    services,
    appointmentsApi,
    scheduleBlocks,
    session,
    refreshData,
    hydrateAppointmentView,
    showToast
  });

  const admin = useAdminDashboard({
    barbers,
    appointments,
    bookingSchedule: booking.bookingSchedule,
    scheduleBlocks,
    customers,
    notifications,
    galleryPosts,
    session,
    refreshData,
    setCustomers,
    brandConfig,
    setBrandConfig,
    brandEditor,
    setBrandEditor
  });

  const auth = useAuthControls({
    refreshData,
    setActiveView,
    resetWorkspace: () => {
      staffPanel.resetWorkspace();
      admin.resetWorkspace();
    }
  });

  useEffect(() => {
    if (!admin.tabs.some((tab) => tab.id === activeView)) {
      setActiveView("booking");
    }
  }, [activeView, admin.tabs]);

  useEffect(() => {
    // ALTERACAO: cliente sem sessao fica restrito a jornada publica de agendamento.
    if (!session?.role && activeView !== "booking") {
      setActiveView("booking");
    }
  }, [activeView, session]);

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    }
  }, [themeMode]);

  useEffect(() => {
    const root = document.documentElement;
    const accent = "#c69137";
    const accentStrong = "#f0c472";
    const support = "#81b0a5";

    root.dataset.theme = themeMode;
    root.style.setProperty("--brand-accent", accent);
    root.style.setProperty("--brand-accent-soft", rgbaFromHex(accent, themeMode === "dark" ? 0.18 : 0.12));
    root.style.setProperty("--brand-accent-strong", accentStrong);
    root.style.setProperty("--brand-support", support);
    root.style.setProperty("--brand-support-soft", rgbaFromHex(support, themeMode === "dark" ? 0.18 : 0.14));
  }, [brandConfig, themeMode]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPromptEvent(event);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = useCallback(async () => {
    if (!installPromptEvent) {
      return;
    }

    await installPromptEvent.prompt();
    setInstallPromptEvent(null);
  }, [installPromptEvent]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return () => {};
    }

    const syncLiveData = async () => {
      await refreshData(session);
      await Promise.all([reloadAppointments(), reloadBarbers(), reloadServices()]);
      setLiveEvents((current) => current + 1);
      setLastRealtimeSyncAt(new Date());
    };

    return subscribeToRealtimeTables(
      ["appointments", "schedule_blocks", "appointment_notifications", "customers"],
      syncLiveData
    );
  }, [refreshData, reloadAppointments, reloadBarbers, reloadServices, session]);

  const bookingViewProps = useMemo(
    () => ({
      barbers,
      selectedBarberId: booking.selectedBarberId,
      onSelectBarber: (barberId) => {
        booking.setSelectedBarberId(barberId);
        booking.setSelectedTime("");
        booking.clearFieldError("selectedBarberId");
      },
      bookingServices: booking.bookingServices,
      selectedServiceIds: booking.selectedServiceIds,
      onToggleService: (serviceId) => {
        booking.setSelectedTime("");
        booking.clearFieldError("selectedServiceIds");
        booking.setSelectedServiceIds((current) =>
          current.includes(serviceId)
            ? current.filter((id) => id !== serviceId)
            : [...current, serviceId]
        );
      },
      dateOptions,
      selectedDate: booking.selectedDate,
      onSelectDate: (date) => {
        booking.setSelectedDate(date);
        booking.setSelectedTime("");
      },
      availableSlots: booking.availableSlots,
      recommendedSlots: booking.recommendedSlots,
      selectedTime: booking.selectedTime,
      onSelectTime: (value) => {
        booking.setSelectedTime(value);
        booking.clearFieldError("selectedTime");
      },
      clientName: booking.clientName,
      onClientNameChange: (value) => {
        booking.setClientName(value);
        booking.clearFieldError("clientName");
      },
      clientWhatsapp: booking.clientWhatsapp,
      onClientWhatsappChange: (value) => {
        booking.setClientWhatsapp(booking.normalizeBookingWhatsapp(value));
        booking.clearFieldError("clientWhatsapp");
      },
      notes: booking.notes,
      onNotesChange: booking.setNotes,
      fieldErrors: booking.fieldErrors,
      onConfirmBooking: booking.handleConfirmBooking,
      onResetBooking: () => booking.resetBookingForm(setActiveView),
      onBookingConfirmed: () => booking.resetBookingForm(setActiveView),
      isSaving: booking.isSaving,
      isLoading: isLoading || isLoadingAppointments,
      selectedBarber: booking.selectedBarber,
      summaryServices: booking.summaryServices,
      totals: booking.totals,
      confirmation: booking.confirmation,
      bookingProgress: booking.bookingProgress,
      bookingStatusMessage: booking.bookingStatusMessage,
      bookingMomentLabel: booking.bookingMomentLabel,
      isBookingReady: booking.isBookingReady
    }),
    [barbers, booking, isLoading, isLoadingAppointments]
  );

  const isInitialLoading = isLoading || isLoadingBarbers || isLoadingServices || isLoadingAppointments;

  if (isInitialLoading && (!barbers.length || !services.length)) {
    return <AppSkeleton />;
  }

  if (!barbers.length || !services.length) {
    return <AppSkeleton />;
  }

  return (
    <div className={`app-shell view-${activeView}`}>
      <AppHeader
        selectedBarber={booking.selectedBarber}
        session={session}
        loginForm={auth.loginForm}
        onLoginFormChange={(field, value) => auth.setLoginForm((current) => ({ ...current, [field]: value }))}
        onLogin={auth.handleLogin}
        onLogout={auth.handleLogout}
        authError={auth.authError}
        isAuthenticating={auth.isAuthenticating}
        recoveryEmail={auth.recoveryEmail}
        onRecoveryEmailChange={auth.setRecoveryEmail}
        onRequestPasswordReset={auth.handleRequestPasswordReset}
        isRequestingPasswordReset={auth.isRequestingPasswordReset}
        passwordResetFeedback={auth.passwordResetFeedback}
        isRecoveryMode={auth.isRecoveryMode}
        recoveryPassword={auth.recoveryPassword}
        onRecoveryPasswordChange={auth.setRecoveryPassword}
        onFinishRecovery={auth.handleFinishRecovery}
        isFinishingRecovery={auth.isFinishingRecovery}
        adminStats={admin.adminStats}
        queuedNotifications={admin.queuedNotifications}
        brandConfig={brandConfig}
        themeMode={themeMode}
        onToggleTheme={() => setThemeMode((current) => (current === "dark" ? "light" : "dark"))}
        canInstallApp={Boolean(installPromptEvent)}
        onInstallApp={handleInstallApp}
      />

      {loadError ? <div className="infra-banner error">{loadError}</div> : null}
      <div className="infra-banner">
        <span>Realtime</span>
        <strong>{buildRealtimeStatusLabel(lastRealtimeSyncAt, liveEvents)}</strong>
      </div>

      <GalleryStrip galleryPosts={galleryPosts} />
      {session?.role ? <TabBar tabs={admin.tabs} activeView={activeView} onChange={setActiveView} /> : null}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          className={`view-stage ${activeView === "booking" ? "booking-stage" : "ambient-stage"}`}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -18 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          {activeView === "booking" ? <BookingView {...bookingViewProps} /> : null}

          {activeView === "panel" ? (
            <Suspense fallback={<ViewSkeleton />}>
              <PanelView
                session={session}
                barbers={barbers}
                selectedPanelBarberId={staffPanel.selectedPanelBarberId}
                onSelectPanelBarber={staffPanel.setSelectedPanelBarberId}
                selectedPanelBarber={staffPanel.selectedPanelBarber}
                managedServices={staffPanel.managedServices}
                serviceEditorForm={staffPanel.serviceEditorForm}
                onBeginEditService={staffPanel.beginEditService}
                onServiceEditorChange={(field, value) =>
                  staffPanel.setServiceEditorForm((current) => ({
                    ...(current ?? staffPanel.createEmptyServiceDraft()),
                    [field]: value
                  }))
                }
                onSaveService={staffPanel.handleSaveService}
                isSavingService={staffPanel.isSavingService}
                serviceActionId={staffPanel.serviceActionId}
                onToggleServiceActive={staffPanel.handleToggleServiceActive}
                onDeleteService={staffPanel.handleDeleteService}
                onBeginCreateService={() => staffPanel.setServiceEditorForm(staffPanel.createEmptyServiceDraft())}
                serviceFeedback={staffPanel.serviceFeedback}
                panelAppointments={staffPanel.panelAppointments}
                panelDateFilter={staffPanel.panelDateFilter}
                onPanelDateFilterChange={staffPanel.setPanelDateFilter}
                hydrateAppointmentView={hydrateAppointmentView}
                onStatusChange={staffPanel.handleStatusChange}
                statusUpdateId={staffPanel.statusUpdateId}
                getAppointmentServiceList={(appointment) => getAppointmentServiceList(appointment, services)}
              />
            </Suspense>
          ) : null}

          {activeView === "automations" ? (
            <Suspense fallback={<ViewSkeleton />}>
              <AutomationsView
                visibleNotifications={admin.visibleNotifications}
                brandConfig={brandConfig}
                onProcessQueue={admin.handleProcessQueue}
                isProcessingQueue={admin.isProcessingQueue}
                queueFeedback={admin.queueFeedback}
              />
            </Suspense>
          ) : null}

          {activeView === "whatsapp" ? (
            <Suspense fallback={<ViewSkeleton />}>
              <WhatsappView
                visibleWhatsappAppointments={admin.visibleWhatsappAppointments}
                hydrateAppointmentView={hydrateAppointmentView}
              />
            </Suspense>
          ) : null}

          {activeView === "admin" ? (
            <Suspense fallback={<ViewSkeleton />}>
              <AdminView
                adminStats={admin.adminStats}
                occupancyStats={admin.occupancyStats}
                occupancyHeatmap={admin.occupancyHeatmap}
                revenueProjection={admin.revenueProjection}
                reactivationCandidates={admin.reactivationCandidates}
                scheduleConflicts={admin.scheduleConflicts}
                weeklyDemandNarrative={admin.weeklyDemandNarrative}
                realtimeStatusLabel={buildRealtimeStatusLabel(lastRealtimeSyncAt, liveEvents)}
                customers={customers}
                customerDrafts={admin.customerDrafts}
                onCustomerDraftChange={(customerId, value) =>
                  admin.setCustomerDrafts((current) => ({ ...current, [customerId]: value }))
                }
                onSaveCustomerNotes={admin.handleSaveCustomerNotes}
                customerActionId={admin.customerActionId}
                blockForm={admin.blockForm}
                onBlockFormChange={(field, value) => admin.setBlockForm((current) => ({ ...current, [field]: value }))}
                onCreateBlock={admin.handleCreateBlock}
                blockFeedback={admin.blockFeedback}
                barbers={barbers}
                scheduleBlocks={scheduleBlocks}
                blockActionId={admin.blockActionId}
                onDeleteBlock={admin.handleDeleteBlock}
                editorForm={staffPanel.editorForm}
                onEditorChange={(field, value) =>
                  staffPanel.setEditorForm((current) => {
                    if (!current) {
                      return current;
                    }

                    if (field === "barberId") {
                      return { ...current, barberId: value, serviceIds: [], startTime: "" };
                    }

                    if (field === "date") {
                      return { ...current, date: value, startTime: "" };
                    }

                    return { ...current, [field]: value };
                  })
                }
                editorAvailableSlots={staffPanel.editorAvailableSlots}
                editorServicesCatalog={staffPanel.editorServicesCatalog}
                onToggleEditorService={(serviceId) =>
                  staffPanel.setEditorForm((current) => {
                    if (!current) {
                      return current;
                    }

                    const nextIds = current.serviceIds.includes(serviceId)
                      ? current.serviceIds.filter((id) => id !== serviceId)
                      : [...current.serviceIds, serviceId];

                    return { ...current, serviceIds: nextIds, startTime: "" };
                  })
                }
                onSaveAppointmentEdits={staffPanel.handleSaveAppointmentEdits}
                isUpdatingAppointment={staffPanel.isUpdatingAppointment}
                editorTotals={staffPanel.editorTotals}
                staffMembers={staffMembers}
                staffForm={admin.staffForm}
                onStaffFormChange={(field, value) =>
                  admin.setStaffForm((current) => ({
                    ...current,
                    [field]: value,
                    ...(field === "role" && value === "admin" ? { barberId: "" } : {})
                  }))
                }
                onSaveStaff={admin.handleSaveStaff}
                isSavingStaff={admin.isSavingStaff}
                staffActionId={admin.staffActionId}
                onEditStaffMember={admin.handleEditStaffMember}
                onToggleStaffActive={admin.handleToggleStaffActive}
                onResetStaffPassword={admin.handleResetStaffPassword}
                staffFeedback={admin.staffFeedback}
                brandConfig={brandEditor}
                onBrandConfigChange={(field, value) => setBrandEditor((current) => ({ ...current, [field]: value }))}
                onSaveBrandSettings={admin.handleSaveBrandSettings}
                isSavingBrand={admin.isSavingBrand}
                onUploadBrandLogo={admin.handleUploadBrandLogo}
                galleryPosts={galleryPosts}
                galleryEditorForm={admin.galleryEditorForm}
                onGalleryEditorChange={(field, value) =>
                  admin.setGalleryEditorForm((current) => ({ ...current, [field]: value }))
                }
                onSaveGalleryPost={admin.handleSaveGalleryPost}
                isSavingGalleryPost={admin.isSavingGalleryPost}
                galleryActionId={admin.galleryActionId}
                onEditGalleryPost={admin.setGalleryEditorForm}
                onCreateGalleryPost={() =>
                  admin.setGalleryEditorForm({
                    id: "",
                    title: "",
                    caption: "",
                    tag: "",
                    imagePath: "",
                    imageUrl: "",
                    sortOrder: galleryPosts.length + 1,
                    isActive: true
                  })
                }
                onToggleGalleryPostActive={admin.handleToggleGalleryPostActive}
                onUploadGalleryImage={admin.handleUploadGalleryImage}
                logs={logs}
                adminBarberFilter={admin.adminBarberFilter}
                onAdminBarberFilterChange={admin.setAdminBarberFilter}
                adminStatusFilter={admin.adminStatusFilter}
                onAdminStatusFilterChange={admin.setAdminStatusFilter}
                adminDateFilter={admin.adminDateFilter}
                onAdminDateFilterChange={admin.setAdminDateFilter}
                dateOptions={dateOptions}
                adminAppointments={admin.adminAppointments}
                onBeginEditAppointment={staffPanel.beginEditAppointment}
                statusUpdateId={staffPanel.statusUpdateId}
                onStatusChange={staffPanel.handleStatusChange}
                hydrateAppointmentView={hydrateAppointmentView}
                getAppointmentServiceList={(appointment) => getAppointmentServiceList(appointment, services)}
              />
            </Suspense>
          ) : null}
        </motion.div>
      </AnimatePresence>
      <Toast toast={toast} />
    </div>
  );
}

export default App;
