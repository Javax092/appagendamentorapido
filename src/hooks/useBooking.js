import { useEffect, useMemo, useState } from "react";
import { logAppEvent } from "../lib/api";
import { dateOptions } from "../app/constants";
import {
  buildAppointmentEnd,
  generateTimeSlots,
  getServiceTotals,
  isValidWhatsapp,
  normalizeWhatsapp
} from "../utils/schedule";
import { getBookingProgress, getBookingStatusMessage, getRecommendedSlots } from "../utils/booking";
import { buildBookingMomentLabel, enrichSlotsWithHeatmap } from "../utils/experience";

export function useBooking({
  barbers,
  services,
  appointmentsApi,
  scheduleBlocks,
  session,
  refreshData,
  hydrateAppointmentView,
  showToast
}) {
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [selectedDate, setSelectedDate] = useState(dateOptions[0]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientWhatsapp, setClientWhatsapp] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!barbers.length) {
      return;
    }

    if (!selectedBarberId || !barbers.some((barber) => barber.id === selectedBarberId)) {
      setSelectedBarberId(barbers[0].id);
    }
  }, [barbers, selectedBarberId]);

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
  // ALTERACAO: agenda consumida do hook useAppointments compartilhado pelo app.
  const bookingSchedule = appointmentsApi.appointments;

  const availableSlots = useMemo(() => {
    if (!selectedBarber || !selectedServices.length) {
      return [];
    }

    return enrichSlotsWithHeatmap(
      generateTimeSlots({
        barber: selectedBarber,
        date: selectedDate,
        totalDuration: totals.totalDuration,
        appointments: bookingSchedule,
        scheduleBlocks
      })
    );
  }, [bookingSchedule, scheduleBlocks, selectedBarber, selectedDate, selectedServices.length, totals.totalDuration]);

  const summaryServices = selectedServices.map((service) => service.name).join(", ");
  const bookingProgress = useMemo(
    () =>
      getBookingProgress({
        selectedBarber,
        selectedServices,
        selectedTime,
        clientName,
        clientWhatsapp
      }),
    [clientName, clientWhatsapp, selectedBarber, selectedServices, selectedTime]
  );
  const recommendedSlots = useMemo(
    () => getRecommendedSlots(availableSlots, selectedTime),
    [availableSlots, selectedTime]
  );
  const bookingMomentLabel = useMemo(
    () =>
      buildBookingMomentLabel({
        clientName,
        barberName: selectedBarber?.name,
        selectedTime,
        selectedDate,
        summaryServices
      }),
    [clientName, selectedBarber?.name, selectedDate, selectedTime, summaryServices]
  );

  // ALTERACAO: validacao por campo para renderizar erros inline.
  function validateForm() {
    const errors = {};

    if (!selectedBarber) {
      errors.selectedBarberId = "Selecione um profissional.";
    }

    if (!selectedServices.length) {
      errors.selectedServiceIds = "Escolha pelo menos um servico.";
    }

    if (!selectedTime) {
      errors.selectedTime = "Escolha um horario disponivel.";
    }

    if (clientName.trim().length < 3) {
      errors.clientName = "Informe o nome completo do cliente.";
    }

    if (!isValidWhatsapp(clientWhatsapp)) {
      errors.clientWhatsapp = "Informe um WhatsApp valido no formato (XX) XXXXX-XXXX.";
    }

    setFieldErrors(errors);

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  const isBookingReady =
    Boolean(selectedBarber) &&
    selectedServices.length > 0 &&
    Boolean(selectedTime) &&
    clientName.trim().length >= 3 &&
    isValidWhatsapp(clientWhatsapp);
  const bookingStatusMessage = useMemo(
    () =>
      getBookingStatusMessage({
        selectedBarber,
        selectedServices,
        availableSlots,
        selectedTime,
        isReady: isBookingReady
      }),
    [availableSlots, isBookingReady, selectedBarber, selectedServices, selectedTime]
  );

  function resetBookingForm(onResetView) {
    setSelectedServiceIds(bookingServices[0] ? [bookingServices[0].id] : []);
    setSelectedDate(dateOptions[0]);
    setSelectedTime("");
    setClientName("");
    setClientWhatsapp("");
    setNotes("");
    setConfirmation(null);
    setFieldErrors({});
    onResetView?.("booking");
  }

  // ALTERACAO: construcao isolada do payload do agendamento.
  function buildAppointment() {
    return {
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
  }

  // ALTERACAO: construcao da view de confirmacao desacoplada da persistencia.
  function buildConfirmationView(appointment) {
    return hydrateAppointmentView(appointment);
  }

  function clearFieldError(field) {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleConfirmBooking() {
    const validation = validateForm();
    if (!validation.isValid) {
      showToast?.({
        type: "error",
        title: "Revise os campos",
        message: "Preencha os dados destacados para confirmar o agendamento."
      });
      return { ok: false, errors: validation.errors };
    }

    const selectedSlot = availableSlots.find((slot) => slot.value === selectedTime);
    if (!selectedSlot || selectedSlot.disabled) {
      setFieldErrors((current) => ({
        ...current,
        selectedTime: "Esse horario acabou de ficar indisponivel. Escolha outro slot."
      }));
      showToast?.({
        type: "info",
        title: "Horario indisponivel",
        message: "Esse slot foi ocupado agora. Escolha outro horario para evitar conflito."
      });
      return { ok: false };
    }

    setIsSaving(true);

    try {
      const appointmentDraft = buildAppointment();

      const persisted = await appointmentsApi.addAppointment(appointmentDraft);
      await logAppEvent({
        eventType: "booking.created",
        message: `Reserva ${persisted.id} criada para ${appointmentDraft.clientName}`,
        context: { appointmentId: persisted.id, barberId: appointmentDraft.barberId }
      });
      await refreshData(session);
      setFieldErrors({});
      setConfirmation(buildConfirmationView(persisted));
      showToast?.({
        type: "success",
        title: "Reserva confirmada",
        message: "O agendamento foi salvo com sucesso."
      });
      return { ok: true };
    } catch (saveError) {
      await logAppEvent({
        level: "error",
        eventType: "booking.failed",
        message: saveError.message || "Falha ao salvar agendamento"
      });
      showToast?.({
        type: "error",
        title: "Falha ao salvar",
        message: saveError.message || "Nao foi possivel salvar o agendamento."
      });
      return { ok: false };
    } finally {
      setIsSaving(false);
    }
  }

  return {
    bookingSchedule,
    bookingServices,
    selectedBarber,
    selectedBarberId,
    setSelectedBarberId,
    selectedDate,
    setSelectedDate,
    selectedServiceIds,
    setSelectedServiceIds,
    selectedTime,
    setSelectedTime,
    clientName,
    setClientName,
    clientWhatsapp,
    setClientWhatsapp,
    notes,
    setNotes,
    fieldErrors,
    confirmation,
    availableSlots,
    recommendedSlots,
    totals,
    summaryServices,
    bookingProgress,
    bookingStatusMessage,
    bookingMomentLabel,
    isBookingReady,
    isSaving,
    clearFieldError,
    normalizeBookingWhatsapp: normalizeWhatsapp,
    handleConfirmBooking,
    resetBookingForm
  };
}
