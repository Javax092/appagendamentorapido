import { useEffect, useMemo, useState } from "react";
import {
  deleteService,
  saveService,
  saveStaffAppointment,
  setServiceActive
} from "../lib/api";
import { generateTimeSlots, getServiceTotals, groupAppointmentsByBarber } from "../utils/schedule";

function getTodayDate() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function getNormalizedStatus(status) {
  return status === "completed" ? "done" : status;
}

export function useStaffPanel({ barbers, services, appointmentsApi, scheduleBlocks, session, refreshData, showToast }) {
  const [selectedPanelBarberId, setSelectedPanelBarberId] = useState("");
  const [panelDateFilter, setPanelDateFilter] = useState(getTodayDate());
  const [statusUpdateId, setStatusUpdateId] = useState("");
  const [editorForm, setEditorForm] = useState(null);
  const [isUpdatingAppointment, setIsUpdatingAppointment] = useState(false);
  const [serviceEditorForm, setServiceEditorForm] = useState(null);
  const [serviceFeedback, setServiceFeedback] = useState("");
  const [isSavingService, setIsSavingService] = useState(false);
  const [serviceActionId, setServiceActionId] = useState("");

  useEffect(() => {
    if (!barbers.length) {
      return;
    }

    if (!selectedPanelBarberId || !barbers.some((barber) => barber.id === selectedPanelBarberId)) {
      setSelectedPanelBarberId(barbers[0].id);
    }
  }, [barbers, selectedPanelBarberId]);

  useEffect(() => {
    if (session?.role === "barber" && session.barberId) {
      setSelectedPanelBarberId(session.barberId);
    }
  }, [session]);

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

  // ALTERACAO: painel passa a consumir appointments do hook compartilhado.
  const appointmentsByBarber = useMemo(
    () => groupAppointmentsByBarber(appointmentsApi.appointments),
    [appointmentsApi.appointments]
  );

  const panelAppointments = useMemo(() => {
    const scopeBarberId = session?.role === "barber" ? session.barberId : selectedPanelBarberId;
    const scopedAppointments = appointmentsByBarber[scopeBarberId] ?? [];

    return scopedAppointments
      .map((appointment) => ({
        ...appointment,
        status: getNormalizedStatus(appointment.status)
      }))
      .slice()
      .sort((left, right) => {
        if (left.date !== right.date) {
          return left.date.localeCompare(right.date);
        }

        return left.startTime.localeCompare(right.startTime);
      });
  }, [appointmentsByBarber, selectedPanelBarberId, session]);

  const filteredPanelAppointments = useMemo(
    () => panelAppointments.filter((appointment) => !panelDateFilter || appointment.date === panelDateFilter),
    [panelAppointments, panelDateFilter]
  );

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

    return generateTimeSlots({
      barber: editorBarber,
      date: editorForm.date,
      totalDuration: editorTotals.totalDuration,
      appointments: appointmentsApi.appointments,
      scheduleBlocks,
      ignoreAppointmentId: editorForm.id
    });
  }, [appointmentsApi.appointments, editorBarber, editorForm, editorServices.length, editorTotals.totalDuration, scheduleBlocks]);

  function beginEditAppointment(appointment) {
    setEditorForm({
      ...appointment,
      serviceIds: [...appointment.serviceIds]
    });
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

  async function handleStatusChange(appointmentId, nextStatus) {
    setStatusUpdateId(appointmentId);

    try {
      if (nextStatus === "cancelled") {
        await appointmentsApi.cancelAppointment(appointmentId);
      } else {
        await appointmentsApi.updateStatus(appointmentId, nextStatus);
      }
      await refreshData(session);
      setEditorForm((current) =>
        current && current.id === appointmentId ? { ...current, status: nextStatus } : current
      );
      showToast?.({
        type: nextStatus === "cancelled" ? "info" : "success",
        title: nextStatus === "cancelled" ? "Agendamento cancelado" : "Status atualizado",
        message:
          nextStatus === "cancelled"
            ? "O horario foi liberado automaticamente na agenda."
            : "O andamento do atendimento foi atualizado."
      });
    } catch (error) {
      showToast?.({
        type: "error",
        title: "Falha ao atualizar",
        message: error.message || "Nao foi possivel atualizar o status do agendamento."
      });
    } finally {
      setStatusUpdateId("");
    }
  }

  async function handleSaveAppointmentEdits() {
    if (!editorForm || !editorBarber || !editorForm.startTime || !editorForm.serviceIds.length) {
      showToast?.({
        type: "error",
        title: "Edicao incompleta",
        message: "Revise profissional, servicos e horario antes de salvar."
      });
      return;
    }

    setIsUpdatingAppointment(true);

    try {
      await saveStaffAppointment(editorForm);
      await appointmentsApi.reload();
      await refreshData(session);
      setEditorForm(null);
      showToast?.({
        type: "success",
        title: "Agendamento atualizado",
        message: "As alteracoes foram salvas com sucesso."
      });
    } catch (error) {
      showToast?.({
        type: "error",
        title: "Falha ao salvar",
        message: error.message || "Nao foi possivel salvar as alteracoes do agendamento."
      });
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

  function resetWorkspace() {
    setEditorForm(null);
    setServiceEditorForm(null);
  }

  return {
    selectedPanelBarberId,
    setSelectedPanelBarberId,
    panelDateFilter,
    setPanelDateFilter,
    selectedPanelBarber,
    managedBarberId,
    managedServices,
    panelAppointments: filteredPanelAppointments,
    statusUpdateId,
    editorForm,
    setEditorForm,
    isUpdatingAppointment,
    serviceEditorForm,
    setServiceEditorForm,
    serviceFeedback,
    isSavingService,
    serviceActionId,
    editorServicesCatalog,
    editorTotals,
    editorAvailableSlots,
    createEmptyServiceDraft,
    beginEditAppointment,
    beginEditService,
    handleStatusChange,
    handleSaveAppointmentEdits,
    handleSaveService,
    handleToggleServiceActive,
    handleDeleteService,
    resetWorkspace
  };
}
