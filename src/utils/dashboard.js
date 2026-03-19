import { timeToMinutes } from "./schedule";

export function buildTabs(session) {
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
}

export function getVisibleAppointments(appointments, session) {
  if (session?.role === "barber") {
    return appointments.filter((appointment) => appointment.barberId === session.barberId);
  }

  return appointments;
}

export function getVisibleNotifications(notifications, session) {
  if (session?.role === "barber") {
    return notifications.filter((notification) => notification.barberId === session.barberId);
  }

  return notifications;
}

export function filterAdminAppointments(appointments, filters) {
  const { barberId, status, date } = filters;

  return appointments
    .filter((appointment) => {
      if (barberId !== "all" && appointment.barberId !== barberId) {
        return false;
      }

      if (status !== "all" && appointment.status !== status) {
        return false;
      }

      if (date !== "all" && appointment.date !== date) {
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
}

export function calculateAdminStats(appointments, barbers, today) {
  const billableAppointments = appointments.filter((appointment) => appointment.status !== "cancelled");
  const todayAppointments = billableAppointments.filter((appointment) => appointment.date === today);
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
    completed: appointments.filter((appointment) => appointment.status === "done" || appointment.status === "completed").length,
    today: todayAppointments.length,
    grossRevenue,
    todayRevenue,
    averageTicket,
    topBarber
  };
}

export function calculateOccupancyStats(barbers, bookingSchedule, scheduleBlocks, date) {
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
}
