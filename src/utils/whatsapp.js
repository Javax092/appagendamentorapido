import { formatLongDate } from "./schedule";

// ALTERACAO: extrai a montagem das mensagens de WhatsApp para um util dedicado.
export function buildClientWhatsAppMessage({ appointment, barber, services, businessWhatsapp }) {
  return [
    "Seu atendimento foi confirmado.",
    `Profissional: ${barber.name}`,
    `Data: ${formatLongDate(appointment.date)}`,
    `Horario: ${appointment.startTime}`,
    `Servicos: ${services.map((service) => service.name).join(", ")}`,
    `WhatsApp da barbearia: ${businessWhatsapp}`
  ].join("\n");
}

// ALTERACAO: centraliza a mensagem operacional enviada ao barbeiro.
export function buildBarberWhatsAppMessage({ appointment, services }) {
  return [
    "Atualizacao da agenda.",
    `Cliente: ${appointment.clientName}`,
    `Data: ${appointment.date}`,
    `Horario: ${appointment.startTime} ate ${appointment.endTime}`,
    `Servicos: ${services.map((service) => service.name).join(", ")}`,
    `Observacoes: ${appointment.notes || "Sem observacoes"}`
  ].join("\n");
}
