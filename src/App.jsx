import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminView } from "./components/AdminView";
import { AppHeader } from "./components/AppHeader";
import { AutomationsView } from "./components/AutomationsView";
import { BookingView } from "./components/BookingView";
import { GalleryStrip } from "./components/GalleryStrip";
import { PanelView } from "./components/PanelView";
import { TabBar } from "./components/TabBar";
import { WhatsappView } from "./components/WhatsappView";
import { bootstrapAppData, getCurrentSessionProfile, logAppEvent } from "./lib/api";
import { dateOptions, emptyBrandConfig } from "./app/constants";
import { buildWhatsAppLink } from "./utils/schedule";
import { useBooking } from "./hooks/useBooking";
import { useStaffPanel } from "./hooks/useStaffPanel";
import { useAdminDashboard } from "./hooks/useAdminDashboard";
import { useAuthControls } from "./hooks/useAuthControls";

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
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [bookingEvents, setBookingEvents] = useState([]);
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

  const refreshData = useCallback(async (sessionProfileOverride) => {
    setIsLoading(true);
    setLoadError("");

    try {
      const resolvedSession =
        sessionProfileOverride === undefined ? await getCurrentSessionProfile() : sessionProfileOverride;
      const data = await bootstrapAppData(resolvedSession);
      setSession(resolvedSession);
      setBarbers(data.barbers);
      setServices(data.services);
      setAppointments(data.appointments);
      setBookingEvents(data.bookingEvents);
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
              [
                "Seu atendimento foi confirmado.",
                `Profissional: ${barber.name}`,
                `Data: ${new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date(`${baseAppointment.date}T12:00:00`))}`,
                `Horario: ${baseAppointment.startTime}`,
                `Servicos: ${appointmentServices.map((service) => service.name).join(", ")}`,
                `WhatsApp da barbearia: ${brandConfig.businessWhatsapp}`
              ].join("\n")
            )
          : "#",
        barberWhatsappLink: barber
          ? buildWhatsAppLink(
              barber.phone,
              [
                "Atualizacao da agenda.",
                `Cliente: ${baseAppointment.clientName}`,
                `Data: ${baseAppointment.date}`,
                `Horario: ${baseAppointment.startTime} ate ${baseAppointment.endTime}`,
                `Servicos: ${appointmentServices.map((service) => service.name).join(", ")}`,
                `Observacoes: ${baseAppointment.notes || "Sem observacoes"}`
              ].join("\n")
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
    appointments,
    scheduleBlocks,
    session,
    refreshData
  });

  const booking = useBooking({
    barbers,
    services,
    appointments,
    bookingEvents,
    scheduleBlocks,
    session,
    refreshData,
    hydrateAppointmentView
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

  const bookingViewProps = useMemo(
    () => ({
      barbers,
      selectedBarberId: booking.selectedBarberId,
      onSelectBarber: (barberId) => {
        booking.setSelectedBarberId(barberId);
        booking.setSelectedTime("");
      },
      bookingServices: booking.bookingServices,
      selectedServiceIds: booking.selectedServiceIds,
      onToggleService: (serviceId) => {
        booking.setSelectedTime("");
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
      onSelectTime: booking.setSelectedTime,
      clientName: booking.clientName,
      onClientNameChange: booking.setClientName,
      clientWhatsapp: booking.clientWhatsapp,
      onClientWhatsappChange: (value) => booking.setClientWhatsapp(booking.normalizeBookingWhatsapp(value)),
      notes: booking.notes,
      onNotesChange: booking.setNotes,
      onConfirmBooking: booking.handleConfirmBooking,
      onResetBooking: () => booking.resetBookingForm(setActiveView),
      isSaving: booking.isSaving,
      isLoading,
      selectedBarber: booking.selectedBarber,
      summaryServices: booking.summaryServices,
      totals: booking.totals,
      confirmation: booking.confirmation,
      bookingProgress: booking.bookingProgress,
      bookingStatusMessage: booking.bookingStatusMessage,
      isBookingReady: booking.isBookingReady
    }),
    [barbers, booking, isLoading]
  );

  if (!barbers.length || !services.length) {
    return (
      <div className="app-shell">
        <div className="glass-card loading-card">
          <h2>Preparando a operacao</h2>
          <p>{loadError || "Carregando agenda, equipe, catalogos e automacoes."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
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
      />

      {loadError ? <div className="infra-banner error">{loadError}</div> : null}

      <GalleryStrip galleryPosts={galleryPosts} />
      <TabBar tabs={admin.tabs} activeView={activeView} onChange={setActiveView} />

      {activeView === "booking" ? <BookingView {...bookingViewProps} /> : null}

      {activeView === "panel" ? (
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
          hydrateAppointmentView={hydrateAppointmentView}
          onStatusChange={staffPanel.handleStatusChange}
          statusUpdateId={staffPanel.statusUpdateId}
          getAppointmentServiceList={(appointment) => getAppointmentServiceList(appointment, services)}
        />
      ) : null}

      {activeView === "automations" ? (
        <AutomationsView
          visibleNotifications={admin.visibleNotifications}
          brandConfig={brandConfig}
          onProcessQueue={admin.handleProcessQueue}
          isProcessingQueue={admin.isProcessingQueue}
          queueFeedback={admin.queueFeedback}
        />
      ) : null}

      {activeView === "whatsapp" ? (
        <WhatsappView
          visibleWhatsappAppointments={admin.visibleWhatsappAppointments}
          hydrateAppointmentView={hydrateAppointmentView}
        />
      ) : null}

      {activeView === "admin" ? (
        <AdminView
          adminStats={admin.adminStats}
          occupancyStats={admin.occupancyStats}
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
      ) : null}
    </div>
  );
}

export default App;
