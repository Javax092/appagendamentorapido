import { useEffect, useMemo, useState } from "react";
import {
  authenticateStaff,
  bootstrapAppData,
  clearStoredSession,
  createAppointment,
  createScheduleBlock,
  deleteScheduleBlock,
  getStoredSession,
  saveService,
  setServiceActive,
  updateAppointment,
  updateAppointmentStatus
} from "./lib/api";
import {
  buildAppointmentEnd,
  buildBookingCode,
  buildWhatsAppLink,
  createDateOptions,
  formatCurrency,
  formatDateLabel,
  formatLongDate,
  generateTimeSlots,
  getServiceTotals,
  groupAppointmentsByBarber,
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

const roleLabels = {
  client: "Cliente",
  barber: "Barbeiro",
  admin: "Admin"
};

function App() {
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [scheduleBlocks, setScheduleBlocks] = useState([]);
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
  const [session, setSession] = useState(() => getStoredSession());
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

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setIsLoading(true);
      setLoadError("");

      try {
        const data = await bootstrapAppData();
        if (ignore) {
          return;
        }

        setBarbers(data.barbers);
        setServices(data.services);
        setAppointments(data.appointments);
        setScheduleBlocks(data.scheduleBlocks);
      } catch (error) {
        if (!ignore) {
          setLoadError(error.message || "Falha ao carregar os dados da operacao.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
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

  const activeServices = useMemo(
    () => services.filter((service) => service.isActive),
    [services]
  );

  useEffect(() => {
    if (!activeServices.length || selectedServiceIds.length) {
      return;
    }

    setSelectedServiceIds([activeServices[0].id]);
  }, [activeServices, selectedServiceIds.length]);

  useEffect(() => {
    if (session?.role === "barber" && session.barberId) {
      setSelectedPanelBarberId(session.barberId);
    }
  }, [session]);

  const tabs = useMemo(() => {
    const items = [{ id: "booking", label: "Agenda" }];

    if (session?.role === "barber") {
      items.push({ id: "panel", label: "Minha agenda" });
      items.push({ id: "whatsapp", label: "WhatsApp" });
    }

    if (session?.role === "admin") {
      items.push({ id: "panel", label: "Equipe" });
      items.push({ id: "whatsapp", label: "WhatsApp" });
      items.push({ id: "admin", label: "Gestao" });
    }

    return items;
  }, [session]);

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeView)) {
      setActiveView(tabs[0]?.id ?? "booking");
    }
  }, [activeView, tabs]);

  const selectedBarber = useMemo(
    () => barbers.find((barber) => barber.id === selectedBarberId) ?? null,
    [barbers, selectedBarberId]
  );

  const selectedPanelBarber = useMemo(
    () => barbers.find((barber) => barber.id === selectedPanelBarberId) ?? null,
    [barbers, selectedPanelBarberId]
  );

  const selectedServices = useMemo(
    () => services.filter((service) => selectedServiceIds.includes(service.id)),
    [services, selectedServiceIds]
  );

  const totals = useMemo(() => getServiceTotals(selectedServices), [selectedServices]);

  const appointmentsByBarber = useMemo(
    () => groupAppointmentsByBarber(appointments),
    [appointments]
  );

  const availableSlots = useMemo(() => {
    if (!selectedBarber || !selectedServices.length) {
      return [];
    }

    return generateTimeSlots({
      barber: selectedBarber,
      date: selectedDate,
      totalDuration: totals.totalDuration,
      appointments,
      scheduleBlocks
    });
  }, [appointments, scheduleBlocks, selectedBarber, selectedDate, selectedServices.length, totals.totalDuration]);

  const panelAppointments = useMemo(() => {
    const scopeBarberId = session?.role === "barber" ? session.barberId : selectedPanelBarberId;
    const barberAppointments = appointmentsByBarber[scopeBarberId] ?? [];

    return barberAppointments.slice().sort((left, right) => {
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
    const confirmed = appointments.filter((appointment) => appointment.status === "confirmed");
    const cancelled = appointments.filter((appointment) => appointment.status === "cancelled");
    const completed = appointments.filter((appointment) => appointment.status === "completed");
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
      confirmed: confirmed.length,
      cancelled: cancelled.length,
      completed: completed.length,
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
    let bookedMinutes = 0;

    barbers.forEach((barber) => {
      const day = new Date(`${date}T12:00:00`).getDay();
      if (barber.daysOff.includes(day)) {
        return;
      }

      let minutes =
        timeToMinutes(barber.workingHours.end) -
        timeToMinutes(barber.workingHours.start);

      minutes -= barber.breakRanges.reduce(
        (sum, range) => sum + (timeToMinutes(range.end) - timeToMinutes(range.start)),
        0
      );

      const blocks = scheduleBlocks.filter(
        (block) => block.date === date && (block.barberId === barber.id || !block.barberId)
      );

      minutes -= blocks.reduce((sum, block) => {
        if (block.isAllDay) {
          return timeToMinutes(barber.workingHours.end) - timeToMinutes(barber.workingHours.start);
        }

        return sum + (timeToMinutes(block.endTime) - timeToMinutes(block.startTime));
      }, 0);

      availableMinutes += Math.max(minutes, 0);
    });

    bookedMinutes = appointments
      .filter((appointment) => appointment.date === date && appointment.status !== "cancelled")
      .reduce((sum, appointment) => sum + (timeToMinutes(appointment.endTime) - timeToMinutes(appointment.startTime)), 0);

    return {
      availableMinutes,
      bookedMinutes,
      rate: availableMinutes ? Math.min((bookedMinutes / availableMinutes) * 100, 100) : 0
    };
  }, [appointments, barbers, scheduleBlocks]);

  const upcomingBlocks = useMemo(
    () =>
      scheduleBlocks
        .slice()
        .sort((left, right) => {
          if (left.date !== right.date) {
            return left.date.localeCompare(right.date);
          }

          return (left.startTime || "00:00").localeCompare(right.startTime || "00:00");
        }),
    [scheduleBlocks]
  );

  const summaryServices = selectedServices.map((service) => service.name).join(", ");

  const editorBarber = useMemo(
    () => barbers.find((barber) => barber.id === editorForm?.barberId) ?? null,
    [barbers, editorForm]
  );

  const editorServices = useMemo(
    () => services.filter((service) => editorForm?.serviceIds?.includes(service.id)),
    [editorForm, services]
  );

  const editorTotals = useMemo(() => getServiceTotals(editorServices), [editorServices]);

  const editorAvailableSlots = useMemo(() => {
    if (!editorForm || !editorBarber || !editorServices.length) {
      return [];
    }

    return generateTimeSlots({
      barber: editorBarber,
      date: editorForm.date,
      totalDuration: editorTotals.totalDuration,
      appointments,
      scheduleBlocks,
      ignoreAppointmentId: editorForm.id
    });
  }, [appointments, editorBarber, editorForm, editorServices.length, editorTotals.totalDuration, scheduleBlocks]);

  function hydrateAppointmentView(baseAppointment) {
    const barber = barbers.find((item) => item.id === baseAppointment.barberId);
    const appointmentServices = services.filter((service) =>
      baseAppointment.serviceIds.includes(service.id)
    );
    const appointmentTotals = getServiceTotals(appointmentServices);
    const subtotal = baseAppointment.totalPrice || appointmentTotals.subtotal;

    return {
      ...baseAppointment,
      barber,
      services: appointmentServices,
      subtotal,
      serviceDuration: appointmentTotals.serviceDuration,
      totalDuration: appointmentTotals.totalDuration,
      clientWhatsappLink: barber
        ? buildWhatsAppLink(
            baseAppointment.clientWhatsapp,
            buildClientWhatsAppMessage({
              ...baseAppointment,
              barber,
              services: appointmentServices,
              subtotal
            })
          )
        : "#",
      barberWhatsappLink: barber
        ? buildWhatsAppLink(
            barber.phone,
            buildBarberWhatsAppMessage({
              ...baseAppointment,
              barber,
              services: appointmentServices
            })
          )
        : "#"
    };
  }

  function buildClientWhatsAppMessage(appointment) {
    const serviceList = appointment.services.map((service) => service.name).join(", ");
    return [
      "Seu agendamento foi confirmado.",
      `Codigo: ${appointment.id}`,
      `Profissional: ${appointment.barber.name}`,
      `Data: ${formatLongDate(appointment.date)}`,
      `Horario: ${appointment.startTime}`,
      `Servicos: ${serviceList}`,
      `Valor: ${formatCurrency(appointment.subtotal)}`
    ].join("\n");
  }

  function buildBarberWhatsAppMessage(appointment) {
    const serviceList = appointment.services.map((service) => service.name).join(", ");
    return [
      "Novo agendamento recebido.",
      `Codigo: ${appointment.id}`,
      `Cliente: ${appointment.clientName}`,
      `WhatsApp: ${appointment.clientWhatsapp}`,
      `Data: ${formatLongDate(appointment.date)}`,
      `Horario: ${appointment.startTime} ate ${appointment.endTime}`,
      `Servicos: ${serviceList}`,
      `Observacoes: ${appointment.notes || "Sem observacoes"}`
    ].join("\n");
  }

  function toggleService(serviceId, target = "booking") {
    if (target === "editor") {
      setEditorForm((current) => {
        if (!current) {
          return current;
        }

        const nextIds = current.serviceIds.includes(serviceId)
          ? current.serviceIds.filter((id) => id !== serviceId)
          : [...current.serviceIds, serviceId];

        return {
          ...current,
          serviceIds: nextIds,
          startTime: ""
        };
      });
      return;
    }

    setSelectedTime("");
    setSelectedServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    );
  }

  function resetBookingForm() {
    setSelectedServiceIds(activeServices[0] ? [activeServices[0].id] : []);
    setSelectedBarberId(barbers[0]?.id ?? "");
    setSelectedDate(dateOptions[0]);
    setSelectedTime("");
    setClientName("");
    setClientWhatsapp("");
    setNotes("");
    setConfirmation(null);
    setActiveView("booking");
  }

  function validateBookingForm() {
    if (!selectedServices.length) {
      return "Escolha pelo menos um servico.";
    }

    if (!selectedTime) {
      return "Escolha um horario disponivel.";
    }

    if (clientName.trim().length < 3) {
      return "Informe o nome do cliente.";
    }

    if (clientWhatsapp.replace(/\D/g, "").length < 10) {
      return "Informe um WhatsApp valido.";
    }

    return "";
  }

  async function handleConfirmBooking() {
    const error = validateBookingForm();
    if (error || !selectedBarber) {
      window.alert(error || "Selecione um profissional.");
      return;
    }

    setIsSaving(true);

    try {
      const barberAppointments = (appointmentsByBarber[selectedBarber.id] ?? []).filter(
        (appointment) => appointment.date === selectedDate
      );
      const bookingCode = buildBookingCode(
        selectedBarber.shortCode,
        selectedDate,
        barberAppointments.length
      );
      const endTime = buildAppointmentEnd(selectedTime, totals.totalDuration);

      const appointmentDraft = {
        id: bookingCode,
        barberId: selectedBarber.id,
        clientName: clientName.trim(),
        clientWhatsapp: clientWhatsapp.trim(),
        serviceIds: selectedServiceIds,
        date: selectedDate,
        startTime: selectedTime,
        endTime,
        status: "confirmed",
        totalPrice: totals.subtotal,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: notes.trim()
      };

      const persisted = await createAppointment(appointmentDraft);
      setAppointments((current) => [...current, persisted.data]);
      setConfirmation(hydrateAppointmentView(persisted.data));
      setLoadError("");
    } catch (saveError) {
      window.alert(saveError.message || "Nao foi possivel salvar o agendamento.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(appointmentId, nextStatus) {
    setStatusUpdateId(appointmentId);

    try {
      const updated = await updateAppointmentStatus(appointmentId, nextStatus);
      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === appointmentId ? { ...appointment, ...updated.data } : appointment
        )
      );

      setEditorForm((current) =>
        current && current.id === appointmentId
          ? { ...current, status: nextStatus }
          : current
      );
    } catch (error) {
      window.alert(error.message || "Nao foi possivel atualizar o status.");
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
      setSession(nextSession);
      setLoginForm(loginInitialState);
      setActiveView(nextSession.role === "admin" ? "admin" : "panel");
    } catch (error) {
      setAuthError(error.message || "Nao foi possivel autenticar.");
    } finally {
      setIsAuthenticating(false);
    }
  }

  function handleLogout() {
    clearStoredSession();
    setSession(null);
    setActiveView("booking");
    setEditorForm(null);
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
      const created = await createScheduleBlock(blockForm, session);
      setScheduleBlocks((current) => [...current, created.data]);
      setBlockForm({
        ...blockInitialState,
        barberId: blockForm.barberId || barbers[0]?.id || "",
        date: blockForm.date
      });
      setBlockFeedback("Bloqueio salvo com sucesso.");
    } catch (error) {
      setBlockFeedback(error.message || "Nao foi possivel salvar o bloqueio.");
    }
  }

  async function handleDeleteBlock(blockId) {
    setBlockActionId(blockId);

    try {
      await deleteScheduleBlock(blockId);
      setScheduleBlocks((current) => current.filter((block) => block.id !== blockId));
    } catch (error) {
      window.alert(error.message || "Nao foi possivel remover o bloqueio.");
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

  function createEmptyServiceDraft() {
    return {
      id: "",
      name: "",
      badge: "",
      price: "",
      duration: "",
      category: "",
      description: "",
      isActive: true,
      sortOrder: services.length + 1
    };
  }

  function beginCreateService() {
    setServiceEditorForm(createEmptyServiceDraft());
    setServiceFeedback("");
  }

  function beginEditService(service) {
    setServiceEditorForm({
      id: service.id,
      name: service.name,
      badge: service.badge,
      price: String(service.price),
      duration: String(service.duration),
      category: service.category,
      description: service.description,
      isActive: true,
      sortOrder: services.findIndex((item) => item.id === service.id) + 1
    });
    setServiceFeedback("");
  }

  function cancelServiceEdit() {
    setServiceEditorForm(null);
    setServiceFeedback("");
  }

  function cancelEditAppointment() {
    setEditorForm(null);
  }

  async function handleSaveAppointmentEdits() {
    if (!editorForm || !editorBarber || !editorForm.startTime || !editorForm.serviceIds.length) {
      window.alert("Revise profissional, servicos e horario antes de salvar.");
      return;
    }

    setIsUpdatingAppointment(true);

    try {
      const updatedAppointment = {
        ...editorForm,
        endTime: buildAppointmentEnd(editorForm.startTime, editorTotals.totalDuration),
        totalPrice: editorTotals.subtotal
      };

      const updated = await updateAppointment(editorForm.id, updatedAppointment);
      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === updated.data.id ? updated.data : appointment
        )
      );
      setEditorForm(updated.data);
    } catch (error) {
      window.alert(error.message || "Nao foi possivel salvar as alteracoes.");
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
      const existingService = services.find((service) => service.id === serviceEditorForm.id) ?? null;
      const saved = await saveService(serviceEditorForm, existingService);
      setServices((current) => {
        const hasExisting = current.some((service) => service.id === saved.data.id);
        const next = hasExisting
          ? current.map((service) => (service.id === saved.data.id ? saved.data : service))
          : [...current, saved.data];

        return next.slice().sort((left, right) => left.name.localeCompare(right.name));
      });
      setServiceFeedback("Servico salvo com sucesso.");
      beginEditService(saved.data);
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
      const saved = await setServiceActive(service.id, !service.isActive);
      setServices((current) =>
        current.map((item) => (item.id === service.id ? saved.data : item))
      );
      if (selectedServiceIds.includes(service.id) && !saved.data.isActive) {
        setSelectedServiceIds((current) => current.filter((id) => id !== service.id));
      }
      setServiceFeedback(saved.data.isActive ? "Servico reativado." : "Servico excluido do catalogo.");
      beginEditService(saved.data);
    } catch (error) {
      setServiceFeedback(error.message || "Nao foi possivel atualizar o servico.");
    } finally {
      setServiceActionId("");
    }
  }

  if (!barbers.length || !services.length) {
    return (
      <div className="app-shell">
        <div className="glass-card loading-card">
          <h2>Preparando a operacao</h2>
          <p>{loadError || "Carregando agenda, equipe, servicos e indicadores."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">Operacao conectada</span>
          <h1>O Pai ta on</h1>
          <p>
            Agenda digital com controle de equipe, bloqueios operacionais, remarcacao
            e leitura de performance em tempo real.
          </p>
          <div className="hero-pills">
            <span>Reservas online</span>
            <span>Painel da equipe</span>
            <span>Gestao de agenda</span>
            <span>Financeiro</span>
            <span>WhatsApp</span>
          </div>
        </div>
        <div className="hero-stats">
          <div className="stat-card">
            <strong>{adminStats.today}</strong>
            <span>atendimentos hoje</span>
          </div>
          <div className="stat-card">
            <strong>{formatCurrency(adminStats.todayRevenue)}</strong>
            <span>faturamento do dia</span>
          </div>
          <div className="stat-card">
            <strong>{occupancyStats.rate.toFixed(0)}%</strong>
            <span>ocupacao da agenda hoje</span>
          </div>
          <div className="stat-card auth-card">
            <span className="mini-badge">{roleLabels[session?.role ?? "client"]}</span>
            {session ? (
              <>
                <strong>{session.fullName}</strong>
                <span>{session.email}</span>
                <button className="secondary-button compact-button" onClick={handleLogout}>
                  Sair
                </button>
              </>
            ) : (
              <form className="auth-form" onSubmit={handleLogin}>
                <input
                  type="email"
                  placeholder="Email da equipe"
                  value={loginForm.email}
                  onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                />
                <input
                  type="password"
                  placeholder="Senha"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                />
                <button className="primary-button compact-button" type="submit" disabled={isAuthenticating}>
                  {isAuthenticating ? "Entrando..." : "Entrar"}
                </button>
                {authError ? <small>{authError}</small> : null}
              </form>
            )}
          </div>
        </div>
      </header>

      {loadError ? <div className="infra-banner error">{loadError}</div> : null}

      <nav className="tabbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={activeView === tab.id ? "active" : ""}
            onClick={() => setActiveView(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeView === "booking" ? (
        <section className="layout-grid">
          <section className="glass-card">
            <div className="section-head">
              <div>
                <span className="mini-badge">Reserva</span>
                <h2>Monte o atendimento</h2>
              </div>
              <p>Escolha servicos, profissional e horario com bloqueios e folgas ja refletidos na agenda.</p>
            </div>

            <div className="service-grid">
              {activeServices.map((service) => {
                const active = selectedServiceIds.includes(service.id);
                return (
                  <button
                    key={service.id}
                    className={`service-card ${active ? "active" : ""}`}
                    onClick={() => toggleService(service.id)}
                  >
                    <span className="tag">{service.badge}</span>
                    <div className="service-topline">
                      <strong>{service.name}</strong>
                      <span>{formatCurrency(service.price)}</span>
                    </div>
                    <small>{service.category}</small>
                    <p>{service.description}</p>
                    <em>{service.duration} min</em>
                  </button>
                );
              })}
            </div>

            <div className="section-head">
              <div>
                <span className="mini-badge">Equipe</span>
                <h2>Defina o profissional</h2>
              </div>
              <p>Horarios de trabalho, pausa fixa e indisponibilidades manuais ja entram no calculo.</p>
            </div>

            <div className="barber-grid">
              {barbers.map((barber) => (
                <button
                  key={barber.id}
                  className={`barber-card ${selectedBarberId === barber.id ? "active" : ""}`}
                  onClick={() => {
                    setSelectedBarberId(barber.id);
                    setSelectedTime("");
                  }}
                >
                  <div className="avatar">{barber.shortCode}</div>
                  <div>
                    <span className="tag">{barber.role}</span>
                    <strong>{barber.name}</strong>
                    <p>{barber.specialty}</p>
                    <small>
                      Expediente {barber.workingHours.start} - {barber.workingHours.end}
                    </small>
                  </div>
                </button>
              ))}
            </div>

            <div className="section-head">
              <div>
                <span className="mini-badge">Disponibilidade</span>
                <h2>Escolha data e horario</h2>
              </div>
              <p>Slots livres sao gerados com base no tempo de servico e nos bloqueios ativos.</p>
            </div>

            <div className="day-row">
              {dateOptions.map((date) => (
                <button
                  key={date}
                  className={`day-chip ${selectedDate === date ? "active" : ""}`}
                  onClick={() => {
                    setSelectedDate(date);
                    setSelectedTime("");
                  }}
                >
                  <span>{formatDateLabel(date)}</span>
                </button>
              ))}
            </div>

            <div className="time-grid">
              {availableSlots.map((slot) => (
                <button
                  key={slot.value}
                  className={`time-chip ${selectedTime === slot.value ? "active" : ""}`}
                  disabled={slot.disabled || isLoading}
                  onClick={() => setSelectedTime(slot.value)}
                >
                  {slot.value}
                </button>
              ))}
            </div>

            <div className="section-head">
              <div>
                <span className="mini-badge">Cliente</span>
                <h2>Confirme os dados</h2>
              </div>
              <p>Os dados abaixo entram no historico da agenda e nos atalhos do WhatsApp.</p>
            </div>

            <div className="form-grid">
              <label>
                Nome
                <input value={clientName} onChange={(event) => setClientName(event.target.value)} />
              </label>
              <label>
                WhatsApp
                <input value={clientWhatsapp} onChange={(event) => setClientWhatsapp(event.target.value)} />
              </label>
              <label className="full">
                Observacoes
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
              </label>
            </div>

            <div className="actions-row">
              <button className="primary-button" onClick={handleConfirmBooking} disabled={isSaving || isLoading}>
                {isSaving ? "Salvando..." : "Confirmar reserva"}
              </button>
              <button className="secondary-button" onClick={resetBookingForm}>
                Limpar formulario
              </button>
            </div>
          </section>

          <aside className="glass-card summary-card">
            <div className="section-head">
              <div>
                <span className="mini-badge">Resumo</span>
                <h2>Visao da reserva</h2>
              </div>
            </div>

            <dl className="summary-list">
              <div><dt>Servicos</dt><dd>{summaryServices || "Selecione ao menos um servico"}</dd></div>
              <div><dt>Profissional</dt><dd>{selectedBarber?.name || "-"}</dd></div>
              <div><dt>Data</dt><dd>{formatLongDate(selectedDate)}</dd></div>
              <div><dt>Horario</dt><dd>{selectedTime || "Selecione um horario"}</dd></div>
              <div><dt>Duracao</dt><dd>{totals.serviceDuration} min</dd></div>
              <div><dt>Preparacao</dt><dd>{totals.buffer} min</dd></div>
              <div><dt>Tempo reservado</dt><dd>{totals.totalDuration} min</dd></div>
              <div><dt>Total</dt><dd>{formatCurrency(totals.subtotal)}</dd></div>
            </dl>

            {confirmation ? (
              <div className="confirmation-box">
                <div className="confirmation-top">
                  <span className="mini-badge">Confirmado</span>
                  <strong>{confirmation.id}</strong>
                </div>
                <p>
                  {confirmation.clientName}, seu horario com {confirmation.barber?.name} foi reservado para{" "}
                  {formatLongDate(confirmation.date)} as {confirmation.startTime}.
                </p>
                <div className="actions-stack">
                  <a className="primary-button" href={confirmation.clientWhatsappLink} target="_blank" rel="noreferrer">
                    Confirmar com cliente
                  </a>
                  <a className="secondary-button" href={confirmation.barberWhatsappLink} target="_blank" rel="noreferrer">
                    Avisar barbeiro
                  </a>
                </div>
              </div>
            ) : (
              <div className="notice-box">
                {isLoading
                  ? "Carregando agenda..."
                  : "Revise os dados e confirme a reserva para registrar na agenda."}
              </div>
            )}
          </aside>
        </section>
      ) : null}

      {activeView === "panel" ? (
        <section className="layout-grid single-column">
          <section className="glass-card">
            <div className="section-head">
              <div>
                <span className="mini-badge">Equipe</span>
                <h2>{session?.role === "barber" ? "Minha agenda" : "Agenda da equipe"}</h2>
              </div>
              <p>Visualize os horarios reservados, status e dados de contato para atendimento rapido.</p>
            </div>

            {session?.role === "admin" ? (
              <div className="panel-toolbar">
                <div className="pill-switch">
                  {barbers.map((barber) => (
                    <button
                      key={barber.id}
                      className={selectedPanelBarberId === barber.id ? "active" : ""}
                      onClick={() => setSelectedPanelBarberId(barber.id)}
                    >
                      {barber.name}
                    </button>
                  ))}
                </div>
                {selectedPanelBarber ? (
                  <div className="panel-meta">
                    <strong>{selectedPanelBarber.name}</strong>
                    <span>{selectedPanelBarber.bio}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {session ? (
              <div className="service-manager">
                <div className="section-head compact">
                  <div>
                    <span className="mini-badge">Catalogo</span>
                    <h2>Servicos e valores</h2>
                  </div>
                  <p>Barbeiros autenticados podem ajustar preco, descricao, duracao e cadastrar novos itens.</p>
                </div>

                <div className="service-manager-layout">
                  <div className="service-list">
                    {services.map((service) => (
                      <button
                        key={service.id}
                        className={`service-card ${serviceEditorForm?.id === service.id ? "active" : ""} ${service.isActive ? "" : "inactive"}`}
                        onClick={() => beginEditService(service)}
                      >
                        <span className="tag">{service.isActive ? service.badge : "Inativo"}</span>
                        <div className="service-topline">
                          <strong>{service.name}</strong>
                          <span>{formatCurrency(service.price)}</span>
                        </div>
                        <small>{service.category}</small>
                        <p>{service.description}</p>
                        <em>{service.duration} min</em>
                      </button>
                    ))}
                  </div>

                  <form className="subsection-card service-editor" onSubmit={handleSaveService}>
                    <div className="section-head compact">
                      <div>
                        <span className="mini-badge">Editor</span>
                        <h2>{serviceEditorForm?.id ? "Atualizar servico" : "Novo servico"}</h2>
                      </div>
                    </div>

                    <div className="form-grid">
                      <label>
                        Nome
                        <input
                          value={serviceEditorForm?.name ?? ""}
                          onChange={(event) =>
                            setServiceEditorForm((current) => ({ ...(current ?? createEmptyServiceDraft()), name: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Badge
                        <input
                          value={serviceEditorForm?.badge ?? ""}
                          onChange={(event) =>
                            setServiceEditorForm((current) => ({ ...(current ?? createEmptyServiceDraft()), badge: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Preco
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={serviceEditorForm?.price ?? ""}
                          onChange={(event) =>
                            setServiceEditorForm((current) => ({ ...(current ?? createEmptyServiceDraft()), price: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Duracao
                        <input
                          type="number"
                          min="5"
                          step="5"
                          value={serviceEditorForm?.duration ?? ""}
                          onChange={(event) =>
                            setServiceEditorForm((current) => ({ ...(current ?? createEmptyServiceDraft()), duration: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Categoria
                        <input
                          value={serviceEditorForm?.category ?? ""}
                          onChange={(event) =>
                            setServiceEditorForm((current) => ({ ...(current ?? createEmptyServiceDraft()), category: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Ordem
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={serviceEditorForm?.sortOrder ?? ""}
                          onChange={(event) =>
                            setServiceEditorForm((current) => ({ ...(current ?? createEmptyServiceDraft()), sortOrder: event.target.value }))
                          }
                        />
                      </label>
                      <label className="full">
                        Descricao
                        <textarea
                          value={serviceEditorForm?.description ?? ""}
                          onChange={(event) =>
                            setServiceEditorForm((current) => ({ ...(current ?? createEmptyServiceDraft()), description: event.target.value }))
                          }
                        />
                      </label>
                    </div>

                    <div className="actions-row">
                      <button className="primary-button" type="submit" disabled={isSavingService}>
                        {isSavingService ? "Salvando..." : "Salvar servico"}
                      </button>
                      {serviceEditorForm?.id ? (
                        <button
                          className="secondary-button danger-button"
                          type="button"
                          onClick={() =>
                            handleToggleServiceActive(
                              services.find((service) => service.id === serviceEditorForm.id) ?? serviceEditorForm
                            )
                          }
                          disabled={serviceActionId === serviceEditorForm.id}
                        >
                          {serviceActionId === serviceEditorForm.id
                            ? "Atualizando..."
                            : services.find((service) => service.id === serviceEditorForm.id)?.isActive
                              ? "Excluir servico"
                              : "Restaurar servico"}
                        </button>
                      ) : null}
                      <button className="secondary-button" type="button" onClick={beginCreateService}>
                        Novo servico
                      </button>
                      <button className="secondary-button" type="button" onClick={cancelServiceEdit}>
                        Fechar
                      </button>
                    </div>
                    {serviceFeedback ? <p className="feedback-line">{serviceFeedback}</p> : null}
                  </form>
                </div>
              </div>
            ) : null}

            <div className="agenda-list">
              {panelAppointments.map((appointment) => {
                const bookedServices = services.filter((service) =>
                  appointment.serviceIds.includes(service.id)
                );

                return (
                  <article key={appointment.id} className="agenda-card">
                    <div>
                      <span className="tag">{appointment.id}</span>
                      <h3>{appointment.clientName}</h3>
                      <p>{bookedServices.map((service) => service.name).join(", ")}</p>
                      <span className={`status-pill ${appointment.status}`}>{appointment.status}</span>
                    </div>
                    <div className="agenda-meta">
                      <strong>{formatLongDate(appointment.date)}</strong>
                      <span>{appointment.startTime} ate {appointment.endTime}</span>
                      <small>{appointment.clientWhatsapp}</small>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </section>
      ) : null}

      {activeView === "whatsapp" ? (
        <section className="layout-grid single-column">
          <section className="glass-card">
            <div className="section-head">
              <div>
                <span className="mini-badge">Relacionamento</span>
                <h2>Central de WhatsApp</h2>
              </div>
              <p>Atalhos prontos para contato com clientes e equipe a partir das reservas do sistema.</p>
            </div>

            <div className="whatsapp-grid">
              {visibleWhatsappAppointments.slice().reverse().map((appointment) => {
                const hydrated = hydrateAppointmentView(appointment);

                return (
                  <article key={appointment.id} className="whatsapp-card">
                    <div>
                      <span className="tag">{appointment.id}</span>
                      <h3>{appointment.clientName}</h3>
                      <p>{hydrated.barber?.name || "Sem profissional"}</p>
                      <span className={`status-pill ${appointment.status}`}>{appointment.status}</span>
                    </div>
                    <div className="actions-stack">
                      <a className="primary-button" href={hydrated.clientWhatsappLink} target="_blank" rel="noreferrer">
                        Falar com cliente
                      </a>
                      <a className="secondary-button" href={hydrated.barberWhatsappLink} target="_blank" rel="noreferrer">
                        Falar com barbeiro
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </section>
      ) : null}

      {activeView === "admin" ? (
        <section className="layout-grid single-column">
          <section className="glass-card">
            <div className="section-head">
              <div>
                <span className="mini-badge">Gestao</span>
                <h2>Controle da operacao</h2>
              </div>
              <p>Painel completo para agenda, bloqueios, remarcacao e leitura financeira.</p>
            </div>

            <div className="admin-stats">
              <div className="metric-card">
                <strong>{formatCurrency(adminStats.grossRevenue)}</strong>
                <span>faturamento total</span>
              </div>
              <div className="metric-card">
                <strong>{formatCurrency(adminStats.averageTicket)}</strong>
                <span>ticket medio</span>
              </div>
              <div className="metric-card">
                <strong>{occupancyStats.rate.toFixed(0)}%</strong>
                <span>ocupacao hoje</span>
              </div>
              <div className="metric-card">
                <strong>{adminStats.topBarber?.barber?.name || "-"}</strong>
                <span>lider em receita</span>
              </div>
            </div>

            <div className="finance-strip">
              <div className="finance-card">
                <span>Receita do dia</span>
                <strong>{formatCurrency(adminStats.todayRevenue)}</strong>
              </div>
              <div className="finance-card">
                <span>Reservas confirmadas</span>
                <strong>{adminStats.confirmed}</strong>
              </div>
              <div className="finance-card">
                <span>Atendimentos concluidos</span>
                <strong>{adminStats.completed}</strong>
              </div>
              <div className="finance-card">
                <span>Cancelamentos</span>
                <strong>{adminStats.cancelled}</strong>
              </div>
            </div>

            <div className="admin-columns">
              <section className="subsection-card">
                <div className="section-head compact">
                  <div>
                    <span className="mini-badge">Bloqueios</span>
                    <h2>Agenda manual</h2>
                  </div>
                  <p>Cadastre folgas, almocos e indisponibilidades por data.</p>
                </div>

                <form className="form-grid block-form" onSubmit={handleCreateBlock}>
                  <label>
                    Profissional
                    <select
                      value={blockForm.barberId}
                      onChange={(event) => setBlockForm((current) => ({ ...current, barberId: event.target.value }))}
                    >
                      {barbers.map((barber) => (
                        <option key={barber.id} value={barber.id}>
                          {barber.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Data
                    <input
                      type="date"
                      value={blockForm.date}
                      onChange={(event) => setBlockForm((current) => ({ ...current, date: event.target.value }))}
                    />
                  </label>
                  <label>
                    Tipo
                    <select
                      value={blockForm.blockType}
                      onChange={(event) => setBlockForm((current) => ({ ...current, blockType: event.target.value }))}
                    >
                      <option value="unavailable">Indisponivel</option>
                      <option value="lunch">Almoco</option>
                      <option value="day_off">Folga</option>
                    </select>
                  </label>
                  <label className="full">
                    Titulo
                    <input
                      value={blockForm.title}
                      onChange={(event) => setBlockForm((current) => ({ ...current, title: event.target.value }))}
                    />
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={blockForm.isAllDay}
                      onChange={(event) => setBlockForm((current) => ({ ...current, isAllDay: event.target.checked }))}
                    />
                    Bloqueio o dia todo
                  </label>
                  {!blockForm.isAllDay ? (
                    <>
                      <label>
                        Inicio
                        <input
                          type="time"
                          value={blockForm.startTime}
                          onChange={(event) => setBlockForm((current) => ({ ...current, startTime: event.target.value }))}
                        />
                      </label>
                      <label>
                        Fim
                        <input
                          type="time"
                          value={blockForm.endTime}
                          onChange={(event) => setBlockForm((current) => ({ ...current, endTime: event.target.value }))}
                        />
                      </label>
                    </>
                  ) : null}
                  <label className="full">
                    Observacoes
                    <textarea
                      value={blockForm.notes}
                      onChange={(event) => setBlockForm((current) => ({ ...current, notes: event.target.value }))}
                    />
                  </label>
                  <div className="actions-row">
                    <button className="primary-button" type="submit">
                      Salvar bloqueio
                    </button>
                  </div>
                  {blockFeedback ? <p className="feedback-line">{blockFeedback}</p> : null}
                </form>

                <div className="block-list">
                  {upcomingBlocks.map((block) => {
                    const blockBarber = barbers.find((barber) => barber.id === block.barberId);
                    return (
                      <article key={block.id} className="block-card">
                        <div>
                          <span className="tag">{block.blockType}</span>
                          <strong>{block.title}</strong>
                          <p>
                            {blockBarber?.name || "Equipe"} • {formatLongDate(block.date)}
                          </p>
                          <small>
                            {block.isAllDay ? "Dia todo" : `${block.startTime} ate ${block.endTime}`}
                          </small>
                        </div>
                        <button
                          className="secondary-button compact-button"
                          onClick={() => handleDeleteBlock(block.id)}
                          disabled={blockActionId === block.id}
                        >
                          {blockActionId === block.id ? "Removendo..." : "Remover"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="subsection-card">
                <div className="section-head compact">
                  <div>
                    <span className="mini-badge">Edicao</span>
                    <h2>Remarcar e editar</h2>
                  </div>
                  <p>Abra um agendamento para alterar servicos, data, horario, profissional ou status.</p>
                </div>

                {editorForm ? (
                  <div className="editor-card">
                    <div className="form-grid">
                      <label>
                        Cliente
                        <input
                          value={editorForm.clientName}
                          onChange={(event) => setEditorForm((current) => ({ ...current, clientName: event.target.value }))}
                        />
                      </label>
                      <label>
                        WhatsApp
                        <input
                          value={editorForm.clientWhatsapp}
                          onChange={(event) => setEditorForm((current) => ({ ...current, clientWhatsapp: event.target.value }))}
                        />
                      </label>
                      <label>
                        Profissional
                        <select
                          value={editorForm.barberId}
                          onChange={(event) => setEditorForm((current) => ({ ...current, barberId: event.target.value, startTime: "" }))}
                        >
                          {barbers.map((barber) => (
                            <option key={barber.id} value={barber.id}>
                              {barber.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Status
                        <select
                          value={editorForm.status}
                          onChange={(event) => setEditorForm((current) => ({ ...current, status: event.target.value }))}
                        >
                          <option value="confirmed">Confirmado</option>
                          <option value="completed">Concluido</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                      </label>
                      <label>
                        Data
                        <input
                          type="date"
                          value={editorForm.date}
                          onChange={(event) => setEditorForm((current) => ({ ...current, date: event.target.value, startTime: "" }))}
                        />
                      </label>
                      <label>
                        Horario
                        <select
                          value={editorForm.startTime}
                          onChange={(event) => setEditorForm((current) => ({ ...current, startTime: event.target.value }))}
                        >
                          <option value="">Selecione</option>
                          {editorAvailableSlots.map((slot) => (
                            <option key={slot.value} value={slot.value} disabled={slot.disabled}>
                              {slot.value}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="full">
                        Servicos
                        <div className="service-grid compact-grid">
                          {services.map((service) => {
                            const active = editorForm.serviceIds.includes(service.id);
                            return (
                              <button
                                type="button"
                                key={service.id}
                                className={`service-card compact-card ${active ? "active" : ""}`}
                                onClick={() => toggleService(service.id, "editor")}
                              >
                                <strong>{service.name}</strong>
                                <small>{formatCurrency(service.price)}</small>
                              </button>
                            );
                          })}
                        </div>
                      </label>
                      <label className="full">
                        Observacoes
                        <textarea
                          value={editorForm.notes}
                          onChange={(event) => setEditorForm((current) => ({ ...current, notes: event.target.value }))}
                        />
                      </label>
                    </div>

                    <div className="editor-summary">
                      <span>Total recalculado: {formatCurrency(editorTotals.subtotal)}</span>
                      <span>Tempo reservado: {editorTotals.totalDuration} min</span>
                    </div>

                    <div className="actions-row">
                      <button className="primary-button" onClick={handleSaveAppointmentEdits} disabled={isUpdatingAppointment}>
                        {isUpdatingAppointment ? "Salvando..." : "Salvar alteracoes"}
                      </button>
                      <button className="secondary-button" onClick={cancelEditAppointment}>
                        Fechar edicao
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="notice-box">
                    Selecione um agendamento abaixo para abrir o editor e remarcar.
                  </div>
                )}
              </section>
            </div>

            <div className="admin-filters">
              <label>
                Profissional
                <select value={adminBarberFilter} onChange={(event) => setAdminBarberFilter(event.target.value)}>
                  <option value="all">Todos</option>
                  {barbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select value={adminStatusFilter} onChange={(event) => setAdminStatusFilter(event.target.value)}>
                  <option value="all">Todos</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="completed">Concluido</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </label>
              <label>
                Data
                <select value={adminDateFilter} onChange={(event) => setAdminDateFilter(event.target.value)}>
                  <option value="all">Todas</option>
                  {dateOptions.map((date) => (
                    <option key={date} value={date}>
                      {formatDateLabel(date)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="admin-list">
              {adminAppointments.map((appointment) => {
                const hydrated = hydrateAppointmentView(appointment);

                return (
                  <article key={appointment.id} className="admin-card">
                    <div className="admin-card-main">
                      <div className="admin-card-head">
                        <span className="tag">{appointment.id}</span>
                        <span className={`status-pill ${appointment.status}`}>{appointment.status}</span>
                      </div>
                      <h3>{appointment.clientName}</h3>
                      <p>{hydrated.services.map((service) => service.name).join(", ")}</p>
                      <div className="admin-card-meta">
                        <span>{hydrated.barber?.name || "-"}</span>
                        <span>{formatLongDate(appointment.date)}</span>
                        <span>{appointment.startTime} ate {appointment.endTime}</span>
                        <span>{appointment.clientWhatsapp}</span>
                        <span>{formatCurrency(appointment.totalPrice)}</span>
                      </div>
                    </div>
                    <div className="admin-card-actions">
                      <button className="secondary-button" onClick={() => beginEditAppointment(appointment)}>
                        Editar
                      </button>
                      <button
                        className="secondary-button"
                        disabled={statusUpdateId === appointment.id || appointment.status === "confirmed"}
                        onClick={() => handleStatusChange(appointment.id, "confirmed")}
                      >
                        {statusUpdateId === appointment.id ? "Atualizando..." : "Confirmar"}
                      </button>
                      <button
                        className="secondary-button"
                        disabled={statusUpdateId === appointment.id || appointment.status === "completed"}
                        onClick={() => handleStatusChange(appointment.id, "completed")}
                      >
                        {statusUpdateId === appointment.id ? "Atualizando..." : "Concluir"}
                      </button>
                      <button
                        className="secondary-button danger-button"
                        disabled={statusUpdateId === appointment.id || appointment.status === "cancelled"}
                        onClick={() => handleStatusChange(appointment.id, "cancelled")}
                      >
                        {statusUpdateId === appointment.id ? "Atualizando..." : "Cancelar"}
                      </button>
                      <a className="primary-button" href={hydrated.barberWhatsappLink} target="_blank" rel="noreferrer">
                        Avisar barbeiro
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </section>
      ) : null}
    </div>
  );
}

export default App;
