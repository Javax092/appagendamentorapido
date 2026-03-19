export function getBookingProgress({ selectedBarber, selectedServices, selectedTime, clientName, clientWhatsapp }) {
  const steps = [
    {
      id: "barber",
      label: "Profissional",
      complete: Boolean(selectedBarber)
    },
    {
      id: "services",
      label: "Servicos",
      complete: selectedServices.length > 0
    },
    {
      id: "time",
      label: "Horario",
      complete: Boolean(selectedTime)
    },
    {
      id: "client",
      label: "Dados",
      complete: clientName.trim().length >= 3 && clientWhatsapp.replace(/\D/g, "").length >= 10
    }
  ];

  return {
    steps,
    completed: steps.filter((step) => step.complete).length,
    total: steps.length
  };
}

export function getRecommendedSlots(availableSlots, selectedTime, limit = 3) {
  const enabledSlots = availableSlots.filter((slot) => !slot.disabled);

  if (selectedTime && enabledSlots.some((slot) => slot.value === selectedTime)) {
    const selectedIndex = enabledSlots.findIndex((slot) => slot.value === selectedTime);
    return enabledSlots.slice(selectedIndex, selectedIndex + limit);
  }

  return enabledSlots.slice(0, limit);
}

export function getBookingStatusMessage({ selectedBarber, selectedServices, availableSlots, selectedTime, isReady }) {
  if (!selectedBarber) {
    return "Escolha um profissional para destravar servicos e horarios.";
  }

  if (!selectedServices.length) {
    return "Selecione um ou mais servicos para calcular o tempo ideal.";
  }

  if (!availableSlots.length || availableSlots.every((slot) => slot.disabled)) {
    return "Nao ha horarios livres nessa data. Troque o dia para continuar rapido.";
  }

  if (!selectedTime) {
    return "Selecione um dos horarios recomendados para concluir mais rapido.";
  }

  if (!isReady) {
    return "Preencha nome e WhatsApp para confirmar sem retrabalho.";
  }

  return "Tudo pronto. Agora e so confirmar a reserva.";
}
