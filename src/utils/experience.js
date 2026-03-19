import { buildWhatsAppLink, formatCurrency, formatDateLabel, timeToMinutes } from "./schedule";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function average(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function enrichSlotsWithHeatmap(slots) {
  return slots.map((slot, index) => {
    if (slot.disabled) {
      return {
        ...slot,
        heat: "blocked",
        heatLabel: "Bloqueado",
        confidence: 0
      };
    }

    const neighborSlots = [
      slots[index - 1],
      slots[index - 2],
      slots[index + 1],
      slots[index + 2]
    ].filter(Boolean);
    const freeNeighbors = neighborSlots.filter((neighbor) => !neighbor.disabled).length;
    const confidence = clamp(Math.round((freeNeighbors / Math.max(neighborSlots.length, 1)) * 100), 35, 100);
    const heat = confidence >= 70 ? "easy" : "tight";

    return {
      ...slot,
      heat,
      heatLabel: heat === "easy" ? "Facil" : "Apertado",
      confidence
    };
  });
}

export function buildBookingMomentLabel({ clientName, barberName, selectedTime, selectedDate, summaryServices }) {
  const firstName = clientName.trim().split(/\s+/)[0] || "Cliente";
  const serviceLabel = summaryServices || "seu atendimento";
  const dateLabel = selectedDate ? formatDateLabel(selectedDate) : "na agenda";

  if (!barberName || !selectedTime) {
    return `Boa escolha, ${firstName}. Monte ${serviceLabel} e destrave o melhor horario.`;
  }

  return `Boa escolha, ${firstName}. ${barberName} te espera ${dateLabel}, as ${selectedTime}, para ${serviceLabel}.`;
}

export function getLoyaltyProfile(customer) {
  const completedVisits = customer.completedVisitCount ?? customer.visitCount ?? 0;
  const lifetimeValue = Number(customer.lifetimeValue ?? 0);

  if (completedVisits >= 10 || lifetimeValue >= 700) {
    return {
      tier: "ouro",
      label: "Ouro",
      score: 92,
      tone: "Cliente de alto valor e recorrencia forte."
    };
  }

  if (completedVisits >= 5 || lifetimeValue >= 300) {
    return {
      tier: "prata",
      label: "Prata",
      score: 68,
      tone: "Boa recorrencia, vale antecipar rebook."
    };
  }

  return {
    tier: "bronze",
    label: "Bronze",
    score: 38,
    tone: "Espaco claro para fidelizacao e upsell."
  };
}

export function getFavoriteServices(customer) {
  if (!Array.isArray(customer.lastServiceNames) || !customer.lastServiceNames.length) {
    return "Sem preferencia clara ainda";
  }

  return customer.lastServiceNames.slice(0, 2).join(", ");
}

export function buildReactivationCandidates(customers, businessWhatsapp) {
  const now = new Date();

  return customers
    .map((customer) => {
      const lastVisit = customer.lastAppointmentAt ? new Date(customer.lastAppointmentAt) : null;
      const daysSinceVisit = lastVisit
        ? Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        customer,
        daysSinceVisit
      };
    })
    .filter(({ daysSinceVisit }) => daysSinceVisit !== null && daysSinceVisit >= 30)
    .sort((left, right) => right.daysSinceVisit - left.daysSinceVisit)
    .slice(0, 6)
    .map(({ customer, daysSinceVisit }) => ({
      id: customer.id,
      fullName: customer.fullName,
      daysSinceVisit,
      segment:
        daysSinceVisit >= 60 ? "60 dias" : daysSinceVisit >= 45 ? "45 dias" : "30 dias",
      favoriteServices: getFavoriteServices(customer),
      whatsappLink: buildWhatsAppLink(
        customer.whatsapp,
        [
          `Oi, ${customer.fullName.split(" ")[0]}!`,
          "Sentimos sua falta aqui na barbearia.",
          `Seu ultimo atendimento foi ha ${daysSinceVisit} dias.`,
          "Quer reservar seu proximo horario direto no WhatsApp?"
        ].join("\n")
      ),
      businessWhatsappLink: buildWhatsAppLink(
        businessWhatsapp,
        [
          "Quero reativar um cliente.",
          `Cliente: ${customer.fullName}`,
          `Ultima visita: ha ${daysSinceVisit} dias`,
          `Preferencias: ${getFavoriteServices(customer)}`
        ].join("\n")
      )
    }));
}

export function buildOccupancyHeatmap(barbers, appointments, scheduleBlocks, dates) {
  return barbers.map((barber) => ({
    barberId: barber.id,
    barberName: barber.name,
    cells: dates.map((date) => {
      const workingMinutes =
        timeToMinutes(barber.workingHours.end) - timeToMinutes(barber.workingHours.start);
      const bookedMinutes = appointments
        .filter(
          (appointment) =>
            appointment.barberId === barber.id &&
            appointment.date === date &&
            appointment.status !== "cancelled"
        )
        .reduce(
          (sum, appointment) =>
            sum + (timeToMinutes(appointment.endTime) - timeToMinutes(appointment.startTime)),
          0
        );
      const blockedMinutes = scheduleBlocks
        .filter((block) => block.barberId === barber.id && block.date === date)
        .reduce((sum, block) => {
          if (block.isAllDay) {
            return workingMinutes;
          }

          return sum + (timeToMinutes(block.endTime) - timeToMinutes(block.startTime));
        }, 0);
      const usableMinutes = Math.max(workingMinutes - blockedMinutes, 0);
      const occupancyRate = usableMinutes ? Math.min((bookedMinutes / usableMinutes) * 100, 100) : 0;
      const heat = occupancyRate >= 80 ? "high" : occupancyRate >= 45 ? "medium" : "low";

      return {
        date,
        label: formatDateLabel(date),
        occupancyRate,
        heat,
        tooltip: `${Math.round(occupancyRate)}% ocupado`
      };
    })
  }));
}

export function buildRevenueProjection(appointments, today) {
  const completedRevenue = appointments
    .filter((appointment) => appointment.status === "done" || appointment.status === "completed")
    .reduce((sum, appointment) => sum + appointment.totalPrice, 0);
  const confirmedRevenue = appointments
    .filter((appointment) => appointment.status === "confirmed")
    .reduce((sum, appointment) => sum + appointment.totalPrice, 0);
  const todayRevenue = appointments
    .filter((appointment) => appointment.date === today && appointment.status !== "cancelled")
    .reduce((sum, appointment) => sum + appointment.totalPrice, 0);
  const averageTicket = appointments.length
    ? appointments.reduce((sum, appointment) => sum + appointment.totalPrice, 0) / appointments.length
    : 0;

  return {
    projectedRevenue: completedRevenue + confirmedRevenue * 0.82,
    pipelineRevenue: confirmedRevenue,
    todayRevenue,
    projectedTicket: averageTicket * 1.06
  };
}

export function detectScheduleConflicts(appointments) {
  const conflicts = [];

  appointments.forEach((appointment, index) => {
    const comparable = appointments.slice(index + 1);
    comparable.forEach((candidate) => {
      const sameBarber = appointment.barberId === candidate.barberId;
      const sameDate = appointment.date === candidate.date;
      const activeStatus = appointment.status !== "cancelled" && candidate.status !== "cancelled";
      const overlaps =
        timeToMinutes(appointment.startTime) < timeToMinutes(candidate.endTime) &&
        timeToMinutes(candidate.startTime) < timeToMinutes(appointment.endTime);

      if (sameBarber && sameDate && activeStatus && overlaps) {
        conflicts.push({
          id: `${appointment.id}-${candidate.id}`,
          barberId: appointment.barberId,
          date: appointment.date,
          startTime: appointment.startTime,
          endTime: candidate.endTime,
          appointments: [appointment, candidate]
        });
      }
    });
  });

  return conflicts;
}

export function buildRealtimeStatusLabel(lastSyncAt, liveEvents) {
  if (!lastSyncAt) {
    return "Realtime em espera";
  }

  const timeLabel = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(lastSyncAt);

  return `${liveEvents} atualizacoes ao vivo. Ultimo sync ${timeLabel}.`;
}

export function formatProjectionCurrency(value) {
  return formatCurrency(Number(value ?? 0));
}

export function buildWeeklyDemandNarrative(occupancyHeatmap) {
  const allCells = occupancyHeatmap.flatMap((row) =>
    row.cells.map((cell) => ({
      barberName: row.barberName,
      ...cell
    }))
  );

  if (!allCells.length) {
    return "Sem dados suficientes para leitura de demanda.";
  }

  const best = [...allCells].sort((left, right) => right.occupancyRate - left.occupancyRate)[0];
  const weakest = [...allCells].sort((left, right) => left.occupancyRate - right.occupancyRate)[0];
  const averageRate = average(allCells.map((cell) => cell.occupancyRate));

  return `Pico em ${best.label} com ${best.barberName}. Janela mais vazia em ${weakest.label}. Media da grade: ${Math.round(averageRate)}%.`;
}
