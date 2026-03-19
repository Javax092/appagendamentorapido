import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabase";

function normalizeAppointment(row) {
  const relations = row.appointment_services ?? [];
  const serviceIds = relations.map((item) => item.service_id ?? item.serviceId);

  return {
    id: row.id,
    barberId: row.barber_id ?? row.barberId,
    clientName: row.client_name ?? row.clientName,
    clientWhatsapp: row.client_whatsapp ?? row.clientWhatsapp,
    serviceIds,
    date: row.date,
    startTime: row.start_time?.slice?.(0, 5) ?? row.startTime,
    endTime: row.end_time?.slice?.(0, 5) ?? row.endTime,
    status: row.status,
    totalPrice: Number(row.total_price ?? row.totalPrice ?? 0),
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
    notes: row.notes ?? "",
    services: relations
      .map((item) => item.services ?? item.service ?? null)
      .filter(Boolean)
      .map((service) => ({
        id: service.id,
        name: service.name,
        price: Number(service.price ?? 0),
        duration: Number(service.duration ?? 0),
        sortOrder: service.sort_order ?? service.sortOrder ?? 0
      }))
  };
}

async function fetchAppointments() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, barber_id, client_name, client_whatsapp, date, start_time, end_time, status, total_price, notes, created_at, updated_at, appointment_services(service_id, services(id, name, price, duration, sort_order))"
    )
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(normalizeAppointment);
}

export function useAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // ALTERACAO: hook central de appointments com leitura e mutacoes no Supabase.
  const reload = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setAppointments([]);
      setLoading(false);
      return [];
    }

    setLoading(true);
    const nextAppointments = await fetchAppointments();
    setAppointments(nextAppointments);
    setLoading(false);
    return nextAppointments;
  }, []);

  useEffect(() => {
    reload().catch(() => setLoading(false));
  }, [reload]);

  const addAppointment = useCallback(async (data) => {
    if (!isSupabaseConfigured()) {
      throw new Error("Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para salvar agendamentos.");
    }

    const supabase = getSupabaseClient();

    const appointmentPayload = {
      id: data.id ?? `APT-${Date.now()}`,
      barber_id: data.barberId,
      client_name: data.clientName.trim(),
      client_whatsapp: data.clientWhatsapp.trim(),
      date: data.date,
      start_time: `${data.startTime}:00`,
      end_time: `${data.endTime}:00`,
      status: data.status,
      total_price: Number(data.totalPrice ?? 0),
      notes: data.notes?.trim() ?? ""
    };

    const { data: insertedAppointment, error: appointmentError } = await supabase
      .from("appointments")
      .insert(appointmentPayload)
      .select("id, barber_id, client_name, client_whatsapp, date, start_time, end_time, status, total_price, notes, created_at, updated_at")
      .single();

    if (appointmentError) {
      throw appointmentError;
    }

    if (Array.isArray(data.serviceIds) && data.serviceIds.length) {
      const joinRows = data.serviceIds.map((serviceId) => ({
        appointment_id: insertedAppointment.id,
        service_id: serviceId
      }));

      const { error: joinError } = await supabase.from("appointment_services").insert(joinRows);
      if (joinError) {
        throw joinError;
      }
    }

    const nextAppointments = await fetchAppointments();
    setAppointments(nextAppointments);
    return nextAppointments.find((appointment) => appointment.id === insertedAppointment.id) ?? normalizeAppointment(insertedAppointment);
  }, []);

  const updateStatus = useCallback(async (id, status) => {
    if (!isSupabaseConfigured()) {
      throw new Error("Configure o Supabase para atualizar agendamentos.");
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);

    if (error) {
      throw error;
    }

    setAppointments((current) => current.map((appointment) => (appointment.id === id ? { ...appointment, status } : appointment)));
    return { id, status };
  }, []);

  const cancelAppointment = useCallback(async (id) => {
    return updateStatus(id, "cancelled");
  }, [updateStatus]);

  return {
    appointments,
    loading,
    addAppointment,
    updateStatus,
    cancelAppointment,
    reload
  };
}
