import { useEffect, useMemo, useState } from "react";
import { AdminView } from "./components/AdminView";
import { AppHeader } from "./components/AppHeader";
import { AutomationsView } from "./components/AutomationsView";
import { BookingView } from "./components/BookingView";
import { GalleryStrip } from "./components/GalleryStrip";
import { PanelView } from "./components/PanelView";
import { TabBar } from "./components/TabBar";
import { WhatsappView } from "./components/WhatsappView";
import {
  authenticateStaff,
  bootstrapAppData,
  clearStoredSession,
  createAppointment,
  createScheduleBlock,
  deleteScheduleBlock,
  deleteService,
  getCurrentSessionProfile,
  logAppEvent,
  processNotificationQueue,
  requestPasswordReset,
  resetStaffPassword,
  saveService,
  saveBrandSettings,
  saveGalleryPost,
  saveStaffAppointment,
  saveStaffMember,
  setServiceActive,
  setGalleryPostActive,
  toggleStaffMemberActive,
  updateOwnPassword,
  updateAppointmentStatus,
  updateCustomerNotes,
  uploadMediaAsset
} from "./lib/api";
import { subscribeToAuthChanges } from "./lib/supabase";
import {
  buildAppointmentEnd,
  buildWhatsAppLink,
  createDateOptions,
  getServiceTotals,
  groupAppointmentsByBarber,
  isValidWhatsapp,
  normalizeWhatsapp,
  timeToMinutes
} from "./utils/schedule";

const dateOptions = createDateOptions(12);
const loginInitialState = { email: "", password: "" };
const blockInitialState = {
  barberId: "",
  date: dateOptions[0],
  blockType: "unavailable",
  title: "",
  startTime: "12:00",
  endTime: "13:00",
  isAllDay: false,
  notes: ""
};
const emptyBrandConfig = {
  logoText: "O Pai ta on",
  businessWhatsapp: "5592986202729",
  metaWebhookConfigured: false
};
const emptyStaffForm = {
  id: "",
  fullName: "",
  email: "",
  role: "barber",
  barberId: "",
  password: "",
  isActive: true
};
const emptyGalleryPostForm = {
  id: "",
  title: "",
  caption: "",
  tag: "",
  imagePath: "",
  imageUrl: "",
  sortOrder: 1,
  isActive: true
};

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
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [selectedDate, setSelectedDate] = useState(dateOptions[0]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientWhatsapp, setClientWhatsapp] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [activeView, setActiveView] = useState("booking");
  const [selectedPanelBarberId, setSelectedPanelBarberId] = useState("");
  const [adminBarberFilter, setAdminBarberFilter] = useState("all");
  const [adminStatusFilter, setAdminStatusFilter] = useState("all");
  const [adminDateFilter, setAdminDateFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusUpdateId, setStatusUpdateId] = useState("");
  const [loadError, setLoadError] = useState("");
  const [session, setSession] = useState(null);
  const [loginForm, setLoginForm] = useState(loginInitialState);
  const [authError, setAuthError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [blockForm, setBlockForm] = useState(blockInitialState);
  const [blockFeedback, setBlockFeedback] = useState("");
  const [blockActionId, setBlockActionId] = useState("");
  const [editorForm, setEditorForm] = useState(null);
  const [isUpdatingAppointment, setIsUpdatingAppointment] = useState(false);
  const [serviceEditorForm, setServiceEditorForm] = useState(null);
  const [serviceFeedback, setServiceFeedback] = useState("");
  const [isSavingService, setIsSavingService] = useState(false);
  const [serviceActionId, setServiceActionId] = useState("");
  const [customerDrafts, setCustomerDrafts] = useState({});
  const [customerActionId, setCustomerActionId] = useState("");
  const [staffForm, setStaffForm] = useState(emptyStaffForm);
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [staffActionId, setStaffActionId] = useState("");
  const [staffFeedback, setStaffFeedback] = useState("");
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [queueFeedback, setQueueFeedback] = useState("");
  const [isSavingBrand, setIsSavingBrand] = useState(false);
  const [galleryEditorForm, setGalleryEditorForm] = useState(emptyGalleryPostForm);
  const [isSavingGalleryPost, setIsSavingGalleryPost] = useState(false);
  const [galleryActionId, setGalleryActionId] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [passwordResetFeedback, setPasswordResetFeedback] = useState("");
  const [isRequestingPasswordReset, setIsRequestingPasswordReset] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [isFinishingRecovery, setIsFinishingRecovery] = useState(false);

  async function refreshData(sessionProfileOverride) {
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
      setGalleryEditorForm((current) =>
        current.id ? current : data.galleryPosts[0] ?? emptyGalleryPostForm
      );
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
  }

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
        setPasswordResetFeedback("");
      }
    });

    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      setIsRecoveryMode(true);
    }

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!barbers.length) {
      return;
    }

    if (!selectedBarberId || !barbers.some((barber) => barber.id === selectedBarberId)) {
      setSelectedBarberId(barbers[0].id);
    }

    if (!selectedPanelBarberId || !barbers.some((barber) => barber.id === selectedPanelBarberId)) {
      setSelectedPanelBarberId(barbers[0].id);
    }

    setBlockForm((current) => ({
      ...current,
      barberId: current.barberId || barbers[0].id
    }));
  }, [barbers, selectedBarberId, selectedPanelBarberId]);

  useEffect(() => {
    if (session?.role === "barber" && session.barberId) {
      setSelectedPanelBarberId(session.barberId);
    }
  }, [session]);

  const selectedBarber = useMemo(
    () => barbers.find((barber) => barber.id === selectedBarberId) ?? null,
    [barbers, selectedBarberId]
  );

  const bookingServices = useMemo(
    () =>
      services
        .filter((service) => service.barberId === selectedBarberId && service.isActive)
        .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)),
    [selectedBarberId, services]
  );

  useEffect(() => {
    if (!bookingServices.length) {
      setSelectedServiceIds([]);
      return;
    }

    setSelectedServiceIds((current) => {
      const valid = current.filter((serviceId) => bookingServices.some((service) => service.id === serviceId));
      return valid.length ? valid : [bookingServices[0].id];
    });
    setSelectedTime("");
  }, [bookingServices]);

  const selectedServices = useMemo(
    () => bookingServices.filter((service) => selectedServiceIds.includes(service.id)),
    [bookingServices, selectedServiceIds]
  );

  const totals = useMemo(() => getServiceTotals(selectedServices), [selectedServices]);
  const bookingSchedule = appointments.length ? appointments : bookingEvents;
  const appointmentsByBarber = useMemo(() => groupAppointmentsByBarber(appointments), [appointments]);

  const availableSlots = useMemo(() => {
    if (!selectedBarber || !selectedServices.length) {
      return [];
    }

    return createTimeSlots({
      barber: selectedBarber,
      date: selectedDate,
      totalDuration: totals.totalDuration,
      appointments: bookingSchedule,
      scheduleBlocks
    });
  }, [bookingSchedule, scheduleBlocks, selectedBarber, selectedDate, selectedServices.length, totals.totalDuration]);

  const tabs = useMemo(() => {
    const items = [{ id: "booking", label: "Reservas" }];

    if (session?.role === "barber") {
      items.push({ id: "panel", label: "Minha agenda" });
      items.push({ id: "automations", label: "Automacoes" });
      items.push({ id: "whatsapp", label: "WhatsApp" });
    }

    if (session?.role === "admin") {
      items.push({ id: "panel", label: "Equipe" });
      items.push({ id: "automations", label: "Automacoes" });
      items.push({ id: "whatsapp", label: "WhatsApp" });
      items.push({ id: "admin", label: "Gestao" });
    }

    return items;
  }, [session]);

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeView)) {
      setActiveView("booking");
    }
  }, [activeView, tabs]);

  const selectedPanelBarber = useMemo(
    () => barbers.find((barber) => barber.id === selectedPanelBarberId) ?? null,
    [barbers, selectedPanelBarberId]
  );

  const managedBarberId = session?.role === "barber" ? session.barberId : selectedPanelBarberId;

  const managedServices = useMemo(
    () =>
      services
        .filter((service) => service.barberId === managedBarberId)
        .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)),
    [managedBarberId, services]
  );

  useEffect(() => {
    if (!session || !managedBarberId) {
      return;
    }

    setServiceEditorForm((current) => {
      if (!current || current.barberId !== managedBarberId) {
        return createEmptyServiceDraft(managedBarberId);
      }

      return current;
    });
  }, [managedBarberId, session]);

  const panelAppointments = useMemo(() => {
    const scopeBarberId = session?.role === "barber" ? session.barberId : selectedPanelBarberId;
    const scopedAppointments = appointmentsByBarber[scopeBarberId] ?? [];

    return scopedAppointments.slice().sort((left, right) => {
      if (left.date !== right.date) {
        return left.date.localeCompare(right.date);
      }

      return left.startTime.localeCompare(right.startTime);
    });
  }, [appointmentsByBarber, selectedPanelBarberId, session]);

  const visibleWhatsappAppointments = useMemo(() => {
    if (session?.role === "barber") {
      return appointments.filter((appointment) => appointment.barberId === session.barberId);
    }

    return appointments;
  }, [appointments, session]);

  const visibleNotifications = useMemo(() => {
    if (session?.role === "barber") {
      return notifications.filter((notification) => notification.barberId === session.barberId);
    }

    return notifications;
  }, [notifications, session]);

  const adminAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => {
        if (adminBarberFilter !== "all" && appointment.barberId !== adminBarberFilter) {
          return false;
        }

        if (adminStatusFilter !== "all" && appointment.status !== adminStatusFilter) {
          return false;
        }

        if (adminDateFilter !== "all" && appointment.date !== adminDateFilter) {
          return false;
        }

        return true;
      })
      .slice()
      .sort((left, right) => {
        if (left.date !== right.date) {
          return left.date.localeCompare(right.date);
        }

        return left.startTime.localeCompare(right.startTime);
      });
  }, [adminBarberFilter, adminDateFilter, adminStatusFilter, appointments]);

  const adminStats = useMemo(() => {
    const billableAppointments = appointments.filter((appointment) => appointment.status !== "cancelled");
    const todayAppointments = billableAppointments.filter((appointment) => appointment.date === dateOptions[0]);
    const grossRevenue = billableAppointments.reduce((sum, appointment) => sum + appointment.totalPrice, 0);
    const todayRevenue = todayAppointments.reduce((sum, appointment) => sum + appointment.totalPrice, 0);
    const averageTicket = billableAppointments.length ? grossRevenue / billableAppointments.length : 0;
    const revenueByBarber = barbers.map((barber) => ({
      barber,
      revenue: billableAppointments
        .filter((appointment) => appointment.barberId === barber.id)
        .reduce((sum, appointment) => sum + appointment.totalPrice, 0)
    }));
    const topBarber = revenueByBarber.sort((left, right) => right.revenue - left.revenue)[0];

    return {
      total: appointments.length,
      confirmed: appointments.filter((appointment) => appointment.status === "confirmed").length,
      cancelled: appointments.filter((appointment) => appointment.status === "cancelled").length,
      completed: appointments.filter((appointment) => appointment.status === "completed").length,
      today: todayAppointments.length,
      grossRevenue,
      todayRevenue,
      averageTicket,
      topBarber
    };
  }, [appointments, barbers]);

  const occupancyStats = useMemo(() => {
    const date = dateOptions[0];
    let availableMinutes = 0;

    barbers.forEach((barber) => {
      const day = new Date(`${date}T12:00:00`).getDay();
      if (barber.daysOff.includes(day)) {
        return;
      }

      let minutes = timeToMinutes(barber.workingHours.end) - timeToMinutes(barber.workingHours.start);
      minutes -= barber.breakRanges.reduce(
        (sum, range) => sum + (timeToMinutes(range.end) - timeToMinutes(range.start)),
        0
      );

      const blocks = scheduleBlocks.filter((block) => block.date === date && block.barberId === barber.id);
      minutes -= blocks.reduce((sum, block) => {
        if (block.isAllDay) {
          return timeToMinutes(barber.workingHours.end) - timeToMinutes(barber.workingHours.start);
        }

        return sum + (timeToMinutes(block.endTime) - timeToMinutes(block.startTime));
      }, 0);

      availableMinutes += Math.max(minutes, 0);
    });

    const bookedMinutes = bookingSchedule
      .filter((appointment) => appointment.date === date && appointment.status !== "cancelled")
      .reduce((sum, appointment) => sum + (timeToMinutes(appointment.endTime) - timeToMinutes(appointment.startTime)), 0);

    return {
      availableMinutes,
      bookedMinutes,
      rate: availableMinutes ? Math.min((bookedMinutes / availableMinutes) * 100, 100) : 0
    };
  }, [barbers, bookingSchedule, scheduleBlocks]);

  const editorBarber = useMemo(
    () => barbers.find((barber) => barber.id === editorForm?.barberId) ?? null,
    [barbers, editorForm]
  );

  const editorServicesCatalog = useMemo(
    () => services.filter((service) => service.barberId === editorForm?.barberId && service.isActive),
    [editorForm, services]
  );

  useEffect(() => {
    if (!editorForm) {
      return;
    }

    const validServiceIds = editorForm.serviceIds.filter((serviceId) =>
      editorServicesCatalog.some((service) => service.id === serviceId)
    );

    if (validServiceIds.length !== editorForm.serviceIds.length) {
      setEditorForm((current) => (current ? { ...current, serviceIds: validServiceIds, startTime: "" } : current));
    }
  }, [editorForm, editorServicesCatalog]);

  const editorServices = useMemo(
    () => editorServicesCatalog.filter((service) => editorForm?.serviceIds?.includes(service.id)),
    [editorForm, editorServicesCatalog]
  );

  const editorTotals = useMemo(() => getServiceTotals(editorServices), [editorServices]);

  const editorAvailableSlots = useMemo(() => {
    if (!editorForm || !editorBarber || !editorServices.length) {
      return [];
    }

    return createTimeSlots({
      barber: editorBarber,
      date: editorForm.date,
      totalDuration: editorTotals.totalDuration,
      appointments,
      scheduleBlocks,
      ignoreAppointmentId: editorForm.id
    });
  }, [appointments, editorBarber, editorForm, editorServices.length, editorTotals.totalDuration, scheduleBlocks]);

  const summaryServices = selectedServices.map((service) => service.name).join(", ");
  const queuedNotifications = visibleNotifications.filter((item) => item.status === "queued");

  function hydrateAppointmentView(baseAppointment) {
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
  }

  function resetBookingForm() {
    setSelectedServiceIds(bookingServices[0] ? [bookingServices[0].id] : []);
    setSelectedDate(dateOptions[0]);
    setSelectedTime("");
    setClientName("");
    setClientWhatsapp("");
    setNotes("");
    setConfirmation(null);
    setActiveView("booking");
  }

  function validateBookingForm() {
    if (!selectedBarber) {
      return "Selecione um profissional.";
    }

    if (!selectedServices.length) {
      return "Escolha pelo menos um servico.";
    }

    if (!selectedTime) {
      return "Escolha um horario disponivel.";
    }

    if (clientName.trim().length < 3) {
      return "Informe o nome do cliente.";
    }

    if (!isValidWhatsapp(clientWhatsapp)) {
      return "Informe um WhatsApp valido.";
    }

    return "";
  }

  async function handleConfirmBooking() {
    const error = validateBookingForm();
    if (error) {
      window.alert(error);
      return;
    }

    setIsSaving(true);

    try {
      const appointmentDraft = {
        barberId: selectedBarber.id,
        clientName: clientName.trim(),
        clientWhatsapp: clientWhatsapp.replace(/\D/g, ""),
        serviceIds: selectedServiceIds,
        date: selectedDate,
        startTime: selectedTime,
        endTime: buildAppointmentEnd(selectedTime, totals.totalDuration),
        status: "confirmed",
        totalPrice: totals.subtotal,
        notes: notes.trim()
      };

      const persisted = await createAppointment(appointmentDraft);
      await logAppEvent({
        eventType: "booking.created",
        message: `Reserva ${persisted.id} criada para ${appointmentDraft.clientName}`,
        context: { appointmentId: persisted.id, barberId: appointmentDraft.barberId }
      });
      await refreshData(session);
      setConfirmation(hydrateAppointmentView({ ...appointmentDraft, id: persisted.id }));
      setLoadError("");
    } catch (saveError) {
      await logAppEvent({
        level: "error",
        eventType: "booking.failed",
        message: saveError.message || "Falha ao salvar agendamento"
      });
      window.alert(saveError.message || "Nao foi possivel salvar o agendamento.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(appointmentId, nextStatus) {
    setStatusUpdateId(appointmentId);

    try {
      await updateAppointmentStatus(appointmentId, nextStatus, session);
      await refreshData(session);
      setEditorForm((current) =>
        current && current.id === appointmentId ? { ...current, status: nextStatus } : current
      );
    } finally {
      setStatusUpdateId("");
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setIsAuthenticating(true);
    setAuthError("");

    try {
      const nextSession = await authenticateStaff(loginForm.email, loginForm.password);
      setLoginForm(loginInitialState);
      setActiveView(nextSession.role === "admin" ? "admin" : "panel");
      await logAppEvent({
        eventType: "auth.login",
        message: `${nextSession.email} autenticado com sucesso`
      });
      await refreshData(nextSession);
    } catch (error) {
      setAuthError(error.message || "Nao foi possivel autenticar.");
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleRequestPasswordReset(event) {
    event.preventDefault();

    if (!recoveryEmail.trim()) {
      setPasswordResetFeedback("Informe o email para recuperar a senha.");
      return;
    }

    setIsRequestingPasswordReset(true);
    setPasswordResetFeedback("");

    try {
      await requestPasswordReset(recoveryEmail);
      setPasswordResetFeedback("Link de recuperacao enviado para o email informado.");
    } catch (error) {
      setPasswordResetFeedback(error.message || "Nao foi possivel enviar a recuperacao.");
    } finally {
      setIsRequestingPasswordReset(false);
    }
  }

  async function handleFinishRecovery(event) {
    event.preventDefault();

    if (recoveryPassword.trim().length < 6) {
      setPasswordResetFeedback("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setIsFinishingRecovery(true);
    setPasswordResetFeedback("");

    try {
      await updateOwnPassword(recoveryPassword.trim());
      setPasswordResetFeedback("Senha atualizada. Voce ja pode entrar normalmente.");
      setRecoveryPassword("");
      setIsRecoveryMode(false);
      if (typeof window !== "undefined") {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (error) {
      setPasswordResetFeedback(error.message || "Nao foi possivel redefinir a senha.");
    } finally {
      setIsFinishingRecovery(false);
    }
  }

  async function handleLogout() {
    await clearStoredSession();
    setEditorForm(null);
    setServiceEditorForm(null);
    setStaffForm(emptyStaffForm);
    await refreshData(null);
  }

  async function handleCreateBlock(event) {
    event.preventDefault();

    if (!blockForm.title.trim()) {
      setBlockFeedback("Informe um titulo para o bloqueio.");
      return;
    }

    if (!blockForm.isAllDay && (!blockForm.startTime || !blockForm.endTime)) {
      setBlockFeedback("Defina inicio e fim para o bloqueio.");
      return;
    }

    try {
      await createScheduleBlock(blockForm, session);
      setBlockForm({
        ...blockInitialState,
        barberId: blockForm.barberId || barbers[0]?.id || "",
        date: blockForm.date
      });
      setBlockFeedback("Bloqueio salvo com sucesso.");
      await refreshData(session);
    } catch (error) {
      setBlockFeedback(error.message || "Nao foi possivel salvar o bloqueio.");
    }
  }

  async function handleDeleteBlock(blockId) {
    setBlockActionId(blockId);

    try {
      await deleteScheduleBlock(blockId);
      await refreshData(session);
    } finally {
      setBlockActionId("");
    }
  }

  function beginEditAppointment(appointment) {
    setEditorForm({
      ...appointment,
      serviceIds: [...appointment.serviceIds]
    });
  }

  function createEmptyServiceDraft(barberId = managedBarberId) {
    return {
      id: "",
      barberId,
      name: "",
      badge: "",
      price: "",
      duration: "",
      category: "",
      description: "",
      isActive: true,
      sortOrder: managedServices.length + 1
    };
  }

  function beginEditService(service) {
    setServiceEditorForm({
      id: service.id,
      barberId: service.barberId,
      name: service.name,
      badge: service.badge,
      price: String(service.price),
      duration: String(service.duration),
      category: service.category,
      description: service.description,
      isActive: service.isActive,
      sortOrder: service.sortOrder
    });
    setServiceFeedback("");
  }

  async function handleSaveAppointmentEdits() {
    if (!editorForm || !editorBarber || !editorForm.startTime || !editorForm.serviceIds.length) {
      window.alert("Revise profissional, servicos e horario antes de salvar.");
      return;
    }

    setIsUpdatingAppointment(true);

    try {
      await saveStaffAppointment(editorForm);
      await refreshData(session);
      setEditorForm(null);
    } finally {
      setIsUpdatingAppointment(false);
    }
  }

  async function handleSaveService(event) {
    event.preventDefault();

    if (!session) {
      setServiceFeedback("Faca login para editar o catalogo.");
      return;
    }

    if (!serviceEditorForm?.name?.trim()) {
      setServiceFeedback("Informe o nome do servico.");
      return;
    }

    setIsSavingService(true);

    try {
      const existingService = managedServices.find((service) => service.id === serviceEditorForm.id) ?? null;
      await saveService({ ...serviceEditorForm, barberId: managedBarberId }, existingService, session);
      setServiceFeedback("Servico salvo com sucesso.");
      await refreshData(session);
      setServiceEditorForm(createEmptyServiceDraft(managedBarberId));
    } catch (error) {
      setServiceFeedback(error.message || "Nao foi possivel salvar o servico.");
    } finally {
      setIsSavingService(false);
    }
  }

  async function handleToggleServiceActive(service) {
    setServiceActionId(service.id);
    setServiceFeedback("");

    try {
      await setServiceActive(service.id, !service.isActive, session);
      setServiceFeedback(service.isActive ? "Servico retirado do catalogo." : "Servico reativado.");
      await refreshData(session);
      beginEditService({ ...service, isActive: !service.isActive });
    } finally {
      setServiceActionId("");
    }
  }

  async function handleDeleteService(service) {
    const confirmed = window.confirm(`Excluir o servico "${service.name}" em definitivo?`);
    if (!confirmed) {
      return;
    }

    setServiceActionId(service.id);
    setServiceFeedback("");

    try {
      await deleteService(service.id, session);
      setServiceFeedback("Servico excluido com sucesso.");
      await refreshData(session);
      setServiceEditorForm(createEmptyServiceDraft(managedBarberId));
    } catch (error) {
      setServiceFeedback(error.message || "Nao foi possivel excluir o servico.");
    } finally {
      setServiceActionId("");
    }
  }

  async function handleSaveCustomerNotes(customer) {
    setCustomerActionId(customer.id);

    try {
      const saved = await updateCustomerNotes(customer.id, customerDrafts[customer.id] ?? customer.notes);
      setCustomers((current) => current.map((item) => (item.id === customer.id ? saved.data : item)));
    } finally {
      setCustomerActionId("");
    }
  }

  async function handleSaveStaff(event) {
    event.preventDefault();

    if (!staffForm.fullName.trim() || !staffForm.email.trim()) {
      setStaffFeedback("Preencha nome e email.");
      return;
    }

    setIsSavingStaff(true);
    setStaffFeedback("");

    try {
      await saveStaffMember(staffForm);
      setStaffForm(emptyStaffForm);
      setStaffFeedback("Equipe atualizada.");
      await refreshData(session);
    } catch (error) {
      setStaffFeedback(error.message || "Nao foi possivel salvar a equipe.");
    } finally {
      setIsSavingStaff(false);
    }
  }

  function handleEditStaffMember(staff) {
    setStaffForm({
      id: staff.id,
      fullName: staff.fullName,
      email: staff.email,
      role: staff.role,
      barberId: staff.barberId ?? "",
      password: "",
      isActive: staff.isActive
    });
    setStaffFeedback("");
  }

  async function handleResetStaffPassword(staff) {
    const nextPassword = window.prompt(`Nova senha para ${staff.fullName}:`);
    if (!nextPassword) {
      return;
    }

    setStaffActionId(staff.id);

    try {
      await resetStaffPassword(staff.id, nextPassword);
      setStaffFeedback(`Senha redefinida para ${staff.fullName}.`);
    } catch (error) {
      setStaffFeedback(error.message || "Nao foi possivel redefinir a senha.");
    } finally {
      setStaffActionId("");
    }
  }

  async function handleToggleStaffActive(staff) {
    setStaffActionId(staff.id);

    try {
      await toggleStaffMemberActive(staff.id, !staff.isActive);
      await refreshData(session);
    } finally {
      setStaffActionId("");
    }
  }

  async function handleProcessQueue() {
    setIsProcessingQueue(true);
    setQueueFeedback("");

    try {
      const result = await processNotificationQueue(20);
      setQueueFeedback(
        result.data?.error
          ? result.data.error
          : `Fila processada. ${result.data?.processed ?? 0} notificacoes enviadas/tentadas.`
      );
      await refreshData(session);
    } catch (error) {
      setQueueFeedback(error.message || "Nao foi possivel processar a fila.");
    } finally {
      setIsProcessingQueue(false);
    }
  }

  async function handleSaveBrandSettings(event) {
    event.preventDefault();
    setIsSavingBrand(true);

    try {
      const saved = await saveBrandSettings(brandEditor);
      setBrandConfig(saved.data);
      setBrandEditor(saved.data);
      setStaffFeedback("Marca atualizada.");
    } catch (error) {
      setStaffFeedback(error.message || "Nao foi possivel salvar a marca.");
    } finally {
      setIsSavingBrand(false);
    }
  }

  async function handleUploadBrandLogo(file) {
    if (!file) {
      return;
    }

    try {
      const uploaded = await uploadMediaAsset(file, "branding");
      setBrandEditor((current) => ({
        ...current,
        logoImagePath: uploaded.data.path,
        logoImageUrl: uploaded.data.publicUrl
      }));
    } catch (error) {
      setStaffFeedback(error.message || "Nao foi possivel enviar a logo.");
    }
  }

  async function handleSaveGalleryPost(event) {
    event.preventDefault();

    if (!galleryEditorForm.title.trim()) {
      setStaffFeedback("Informe o titulo do post.");
      return;
    }

    setIsSavingGalleryPost(true);

    try {
      const saved = await saveGalleryPost(galleryEditorForm);
      setGalleryEditorForm(saved.data);
      await refreshData(session);
      setStaffFeedback("Post da galeria salvo.");
    } catch (error) {
      setStaffFeedback(error.message || "Nao foi possivel salvar o post.");
    } finally {
      setIsSavingGalleryPost(false);
    }
  }

  async function handleToggleGalleryPostActive(post) {
    setGalleryActionId(post.id);

    try {
      await setGalleryPostActive(post.id, !post.isActive);
      await refreshData(session);
    } finally {
      setGalleryActionId("");
    }
  }

  async function handleUploadGalleryImage(file) {
    if (!file) {
      return;
    }

    try {
      const uploaded = await uploadMediaAsset(file, "gallery");
      setGalleryEditorForm((current) => ({
        ...current,
        imagePath: uploaded.data.path,
        imageUrl: uploaded.data.publicUrl
      }));
    } catch (error) {
      setStaffFeedback(error.message || "Nao foi possivel enviar a imagem.");
    }
  }

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
        selectedBarber={selectedBarber}
        session={session}
        loginForm={loginForm}
        onLoginFormChange={(field, value) => setLoginForm((current) => ({ ...current, [field]: value }))}
        onLogin={handleLogin}
        onLogout={handleLogout}
        authError={authError}
        isAuthenticating={isAuthenticating}
        recoveryEmail={recoveryEmail}
        onRecoveryEmailChange={setRecoveryEmail}
        onRequestPasswordReset={handleRequestPasswordReset}
        isRequestingPasswordReset={isRequestingPasswordReset}
        passwordResetFeedback={passwordResetFeedback}
        isRecoveryMode={isRecoveryMode}
        recoveryPassword={recoveryPassword}
        onRecoveryPasswordChange={setRecoveryPassword}
        onFinishRecovery={handleFinishRecovery}
        isFinishingRecovery={isFinishingRecovery}
        adminStats={adminStats}
        queuedNotifications={queuedNotifications}
        brandConfig={brandConfig}
      />

      {loadError ? <div className="infra-banner error">{loadError}</div> : null}

      <GalleryStrip galleryPosts={galleryPosts} />
      <TabBar tabs={tabs} activeView={activeView} onChange={setActiveView} />

      {activeView === "booking" ? (
        <BookingView
          barbers={barbers}
          selectedBarberId={selectedBarberId}
          onSelectBarber={(barberId) => {
            setSelectedBarberId(barberId);
            setSelectedTime("");
          }}
          bookingServices={bookingServices}
          selectedServiceIds={selectedServiceIds}
          onToggleService={(serviceId) => {
            setSelectedTime("");
            setSelectedServiceIds((current) =>
              current.includes(serviceId)
                ? current.filter((id) => id !== serviceId)
                : [...current, serviceId]
            );
          }}
          dateOptions={dateOptions}
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setSelectedTime("");
          }}
          availableSlots={availableSlots}
          selectedTime={selectedTime}
          onSelectTime={setSelectedTime}
          clientName={clientName}
          onClientNameChange={setClientName}
          clientWhatsapp={clientWhatsapp}
          onClientWhatsappChange={(value) => setClientWhatsapp(normalizeWhatsapp(value))}
          notes={notes}
          onNotesChange={setNotes}
          onConfirmBooking={handleConfirmBooking}
          onResetBooking={resetBookingForm}
          isSaving={isSaving}
          isLoading={isLoading}
          selectedBarber={selectedBarber}
          summaryServices={summaryServices}
          totals={totals}
          confirmation={confirmation}
        />
      ) : null}

      {activeView === "panel" ? (
        <PanelView
          session={session}
          barbers={barbers}
          selectedPanelBarberId={selectedPanelBarberId}
          onSelectPanelBarber={setSelectedPanelBarberId}
          selectedPanelBarber={selectedPanelBarber}
          managedServices={managedServices}
          serviceEditorForm={serviceEditorForm}
          onBeginEditService={beginEditService}
          onServiceEditorChange={(field, value) =>
            setServiceEditorForm((current) => ({
              ...(current ?? createEmptyServiceDraft()),
              [field]: value
            }))
          }
          onSaveService={handleSaveService}
          isSavingService={isSavingService}
          serviceActionId={serviceActionId}
          onToggleServiceActive={handleToggleServiceActive}
          onDeleteService={handleDeleteService}
          onBeginCreateService={() => setServiceEditorForm(createEmptyServiceDraft())}
          serviceFeedback={serviceFeedback}
          panelAppointments={panelAppointments}
          hydrateAppointmentView={hydrateAppointmentView}
          onStatusChange={handleStatusChange}
          statusUpdateId={statusUpdateId}
          getAppointmentServiceList={(appointment) => getAppointmentServiceList(appointment, services)}
        />
      ) : null}

      {activeView === "automations" ? (
        <AutomationsView
          visibleNotifications={visibleNotifications}
          brandConfig={brandConfig}
          onProcessQueue={handleProcessQueue}
          isProcessingQueue={isProcessingQueue}
          queueFeedback={queueFeedback}
        />
      ) : null}

      {activeView === "whatsapp" ? (
        <WhatsappView
          visibleWhatsappAppointments={visibleWhatsappAppointments}
          hydrateAppointmentView={hydrateAppointmentView}
        />
      ) : null}

      {activeView === "admin" ? (
        <AdminView
          adminStats={adminStats}
          occupancyStats={occupancyStats}
          customers={customers}
          customerDrafts={customerDrafts}
          onCustomerDraftChange={(customerId, value) =>
            setCustomerDrafts((current) => ({ ...current, [customerId]: value }))
          }
          onSaveCustomerNotes={handleSaveCustomerNotes}
          customerActionId={customerActionId}
          blockForm={blockForm}
          onBlockFormChange={(field, value) => setBlockForm((current) => ({ ...current, [field]: value }))}
          onCreateBlock={handleCreateBlock}
          blockFeedback={blockFeedback}
          barbers={barbers}
          scheduleBlocks={scheduleBlocks}
          blockActionId={blockActionId}
          onDeleteBlock={handleDeleteBlock}
          editorForm={editorForm}
          onEditorChange={(field, value) =>
            setEditorForm((current) => {
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
          editorAvailableSlots={editorAvailableSlots}
          editorServicesCatalog={editorServicesCatalog}
          onToggleEditorService={(serviceId) =>
            setEditorForm((current) => {
              if (!current) {
                return current;
              }

              const nextIds = current.serviceIds.includes(serviceId)
                ? current.serviceIds.filter((id) => id !== serviceId)
                : [...current.serviceIds, serviceId];

              return { ...current, serviceIds: nextIds, startTime: "" };
            })
          }
          onSaveAppointmentEdits={handleSaveAppointmentEdits}
          isUpdatingAppointment={isUpdatingAppointment}
          editorTotals={editorTotals}
          staffMembers={staffMembers}
          staffForm={staffForm}
          onStaffFormChange={(field, value) =>
            setStaffForm((current) => ({
              ...current,
              [field]: field === "role" && value === "admin" ? value : value,
              ...(field === "role" && value === "admin" ? { barberId: "" } : {})
            }))
          }
          onSaveStaff={handleSaveStaff}
          isSavingStaff={isSavingStaff}
          staffActionId={staffActionId}
          onEditStaffMember={handleEditStaffMember}
          onToggleStaffActive={handleToggleStaffActive}
          onResetStaffPassword={handleResetStaffPassword}
          staffFeedback={staffFeedback}
          brandConfig={brandEditor}
          onBrandConfigChange={(field, value) => setBrandEditor((current) => ({ ...current, [field]: value }))}
          onSaveBrandSettings={handleSaveBrandSettings}
          isSavingBrand={isSavingBrand}
          onUploadBrandLogo={handleUploadBrandLogo}
          galleryPosts={galleryPosts}
          galleryEditorForm={galleryEditorForm}
          onGalleryEditorChange={(field, value) =>
            setGalleryEditorForm((current) => ({ ...current, [field]: value }))
          }
          onSaveGalleryPost={handleSaveGalleryPost}
          isSavingGalleryPost={isSavingGalleryPost}
          galleryActionId={galleryActionId}
          onEditGalleryPost={setGalleryEditorForm}
          onCreateGalleryPost={() =>
            setGalleryEditorForm({
              ...emptyGalleryPostForm,
              sortOrder: galleryPosts.length + 1
            })
          }
          onToggleGalleryPostActive={handleToggleGalleryPostActive}
          onUploadGalleryImage={handleUploadGalleryImage}
          logs={logs}
          adminBarberFilter={adminBarberFilter}
          onAdminBarberFilterChange={setAdminBarberFilter}
          adminStatusFilter={adminStatusFilter}
          onAdminStatusFilterChange={setAdminStatusFilter}
          adminDateFilter={adminDateFilter}
          onAdminDateFilterChange={setAdminDateFilter}
          dateOptions={dateOptions}
          adminAppointments={adminAppointments}
          onBeginEditAppointment={beginEditAppointment}
          statusUpdateId={statusUpdateId}
          onStatusChange={handleStatusChange}
          hydrateAppointmentView={hydrateAppointmentView}
          getAppointmentServiceList={(appointment) => getAppointmentServiceList(appointment, services)}
        />
      ) : null}
    </div>
  );
}

function createTimeSlots({
  barber,
  date,
  totalDuration,
  appointments,
  scheduleBlocks,
  ignoreAppointmentId = ""
}) {
  const slots = [];
  const start = timeToMinutes(barber.workingHours.start);
  const end = timeToMinutes(barber.workingHours.end);

  for (let cursor = start; cursor <= end - totalDuration; cursor += 10) {
    const hours = String(Math.floor(cursor / 60)).padStart(2, "0");
    const minutes = String(cursor % 60).padStart(2, "0");
    const value = `${hours}:${minutes}`;
    const nextEnd = cursor + totalDuration;
    const blocked = isBlocked({
      barber,
      date,
      start: cursor,
      end: nextEnd,
      appointments,
      scheduleBlocks,
      ignoreAppointmentId
    });

    slots.push({ value, disabled: blocked });
  }

  return slots;
}

function isBlocked({ barber, date, start, end, appointments, scheduleBlocks, ignoreAppointmentId }) {
  const day = new Date(`${date}T12:00:00`).getDay();
  if (barber.daysOff.includes(day)) {
    return true;
  }

  const workingStart = timeToMinutes(barber.workingHours.start);
  const workingEnd = timeToMinutes(barber.workingHours.end);
  if (start < workingStart || end > workingEnd) {
    return true;
  }

  if (
    barber.breakRanges.some(
      (range) => start < timeToMinutes(range.end) && end > timeToMinutes(range.start)
    )
  ) {
    return true;
  }

  if (
    scheduleBlocks
      .filter((block) => block.date === date && block.barberId === barber.id)
      .some((block) => block.isAllDay || (start < timeToMinutes(block.endTime) && end > timeToMinutes(block.startTime)))
  ) {
    return true;
  }

  return appointments
    .filter(
      (appointment) =>
        appointment.id !== ignoreAppointmentId &&
        appointment.barberId === barber.id &&
        appointment.date === date &&
        appointment.status !== "cancelled"
    )
    .some((appointment) => start < timeToMinutes(appointment.endTime) && end > timeToMinutes(appointment.startTime));
}

export default App;
