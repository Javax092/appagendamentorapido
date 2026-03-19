import { useEffect, useMemo, useState } from "react";
import { createAppointment, logAppEvent } from "../lib/api";
import { dateOptions } from "../app/constants";
import {
  buildAppointmentEnd,
  generateTimeSlots,
  getServiceTotals,
  isValidWhatsapp,
  normalizeWhatsapp
} from "../utils/schedule";
import { getBookingProgress, getBookingStatusMessage, getRecommendedSlots } from "../utils/booking";

export function useBooking({ barbers, services, appointments, bookingEvents, scheduleBlocks, session, refreshData, hydrateAppointmentView }) {
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [selectedDate, setSelectedDate] = useState(dateOptions[0]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientWhatsapp, setClientWhatsapp] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

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
  const bookingSchedule = appointments.length ? appointments : bookingEvents;

  const availableSlots = useMemo(() => {
    if (!selectedBarber || !selectedServices.length) {
      return [];
    }

    return generateTimeSlots({
      barber: selectedBarber,
      date: selectedDate,
      totalDuration: totals.totalDuration,
      appointments: bookingSchedule,
      scheduleBlocks
    });
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

  const bookingValidationError = validateBookingForm();
  const isBookingReady = !bookingValidationError;
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
    onResetView?.("booking");
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
      return { ok: true };
    } catch (saveError) {
      await logAppEvent({
        level: "error",
        eventType: "booking.failed",
        message: saveError.message || "Falha ao salvar agendamento"
      });
      window.alert(saveError.message || "Nao foi possivel salvar o agendamento.");
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
    confirmation,
    availableSlots,
    recommendedSlots,
    totals,
    summaryServices,
    bookingProgress,
    bookingStatusMessage,
    isBookingReady,
    isSaving,
    normalizeBookingWhatsapp: normalizeWhatsapp,
    handleConfirmBooking,
    resetBookingForm
  };
}
