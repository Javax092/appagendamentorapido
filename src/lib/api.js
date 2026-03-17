import { barbers as fallbackBarbers, services as fallbackServices, sampleAppointments } from "../data";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase";

const APPOINTMENTS_TABLE = "appointments";
const BARBERS_TABLE = "barbers";
const SERVICES_TABLE = "services";
const BLOCKS_TABLE = "schedule_blocks";
const SESSION_KEY = "appmobilebarbearia.session";

function normalizeService(row) {
  return {
    id: row.id,
    name: row.name,
    badge: row.badge ?? "",
    price: Number(row.price ?? 0),
    duration: row.duration,
    category: row.category ?? "",
    description: row.description ?? "",
    isActive: Boolean(row.is_active),
    sortOrder: row.sort_order ?? 0
  };
}

function serializeService(service, existingService) {
  return {
    id:
      existingService?.id ??
      service.id?.trim() ??
      service.name
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
    name: service.name.trim(),
    badge: service.badge?.trim() ?? "",
    price: Number(service.price ?? 0),
    duration: Number(service.duration ?? 0),
    category: service.category?.trim() ?? "",
    description: service.description?.trim() ?? "",
    sort_order: Number(service.sortOrder ?? existingService?.sortOrder ?? 0),
    is_active: service.isActive ?? true
  };
}

function normalizeBarber(row) {
  return {
    id: row.id,
    name: row.name,
    shortCode: row.short_code,
    role: row.role_title,
    phone: row.phone,
    specialty: row.specialty ?? "",
    bio: row.bio ?? "",
    workingHours: {
      start: row.working_start?.slice(0, 5) ?? "09:00",
      end: row.working_end?.slice(0, 5) ?? "18:00"
    },
    daysOff: row.days_off ?? [],
    breakRanges: Array.isArray(row.break_ranges) ? row.break_ranges : []
  };
}

function normalizeAppointment(row) {
  return {
    id: row.id,
    barberId: row.barber_id,
    clientName: row.client_name,
    clientWhatsapp: row.client_whatsapp,
    serviceIds: row.service_ids,
    date: row.date,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    status: row.status,
    totalPrice: Number(row.total_price ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    notes: row.notes ?? ""
  };
}

function serializeAppointment(appointment) {
  return {
    id: appointment.id,
    barber_id: appointment.barberId,
    client_name: appointment.clientName,
    client_whatsapp: appointment.clientWhatsapp,
    service_ids: appointment.serviceIds,
    date: appointment.date,
    start_time: `${appointment.startTime}:00`,
    end_time: `${appointment.endTime}:00`,
    status: appointment.status,
    total_price: appointment.totalPrice ?? 0,
    created_at: appointment.createdAt,
    updated_at: appointment.updatedAt ?? appointment.createdAt,
    notes: appointment.notes ?? ""
  };
}

function normalizeBlock(row) {
  return {
    id: row.id,
    barberId: row.barber_id,
    title: row.title,
    blockType: row.block_type,
    date: row.date,
    startTime: row.start_time ? row.start_time.slice(0, 5) : "",
    endTime: row.end_time ? row.end_time.slice(0, 5) : "",
    isAllDay: Boolean(row.is_all_day),
    notes: row.notes ?? ""
  };
}

function serializeBlock(block, session) {
  return {
    barber_id: block.barberId || null,
    title: block.title.trim(),
    block_type: block.blockType,
    date: block.date,
    start_time: block.isAllDay ? null : `${block.startTime}:00`,
    end_time: block.isAllDay ? null : `${block.endTime}:00`,
    is_all_day: block.isAllDay,
    notes: block.notes?.trim() ?? "",
    created_by: session?.userId ?? null
  };
}

export async function bootstrapAppData() {
  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      barbers: fallbackBarbers,
      services: fallbackServices,
      appointments: sampleAppointments,
      scheduleBlocks: []
    };
  }

  const supabase = getSupabaseClient();
  const [barbersResult, servicesResult, appointmentsResult, blocksResult] = await Promise.all([
    supabase.from(BARBERS_TABLE).select("*").eq("is_active", true).order("sort_order", { ascending: true }),
    supabase.from(SERVICES_TABLE).select("*").order("sort_order", { ascending: true }),
    supabase
      .from(APPOINTMENTS_TABLE)
      .select("*")
      .order("date", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase
      .from(BLOCKS_TABLE)
      .select("*")
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })
  ]);

  const firstError = [barbersResult, servicesResult, appointmentsResult, blocksResult].find(
    (result) => result.error
  )?.error;

  if (firstError) {
    throw firstError;
  }

  return {
    source: "supabase",
    barbers: barbersResult.data.map(normalizeBarber),
    services: servicesResult.data.map(normalizeService),
    appointments: appointmentsResult.data.map(normalizeAppointment),
    scheduleBlocks: blocksResult.data.map(normalizeBlock)
  };
}

export async function createAppointment(appointment) {
  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      data: appointment
    };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(APPOINTMENTS_TABLE)
    .insert(serializeAppointment(appointment))
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    source: "supabase",
    data: normalizeAppointment(data)
  };
}

export async function updateAppointment(appointmentId, appointment) {
  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      data: appointment
    };
  }

  const supabase = getSupabaseClient();
  const payload = serializeAppointment(appointment);
  delete payload.id;
  delete payload.created_at;

  const { data, error } = await supabase
    .from(APPOINTMENTS_TABLE)
    .update(payload)
    .eq("id", appointmentId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    source: "supabase",
    data: normalizeAppointment(data)
  };
}

export async function updateAppointmentStatus(appointmentId, status) {
  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      data: {
        id: appointmentId,
        status
      }
    };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(APPOINTMENTS_TABLE)
    .update({ status })
    .eq("id", appointmentId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    source: "supabase",
    data: normalizeAppointment(data)
  };
}

export async function createScheduleBlock(block, session) {
  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      data: { ...block, id: `local-${Date.now()}` }
    };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(BLOCKS_TABLE)
    .insert(serializeBlock(block, session))
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    source: "supabase",
    data: normalizeBlock(data)
  };
}

export async function saveService(service, existingService = null) {
  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      data: { ...service, id: existingService?.id ?? service.id ?? `service-${Date.now()}` }
    };
  }

  const supabase = getSupabaseClient();
  const payload = serializeService(service, existingService);
  const query = existingService
    ? supabase.from(SERVICES_TABLE).update(payload).eq("id", existingService.id)
    : supabase.from(SERVICES_TABLE).insert(payload);

  const { data, error } = await query.select().single();

  if (error) {
    throw error;
  }

  return {
    source: "supabase",
    data: normalizeService(data)
  };
}

export async function setServiceActive(serviceId, isActive) {
  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      data: { id: serviceId, isActive }
    };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(SERVICES_TABLE)
    .update({ is_active: isActive })
    .eq("id", serviceId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    source: "supabase",
    data: normalizeService(data)
  };
}

export async function deleteScheduleBlock(blockId) {
  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      data: blockId
    };
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from(BLOCKS_TABLE).delete().eq("id", blockId);

  if (error) {
    throw error;
  }

  return {
    source: "supabase",
    data: blockId
  };
}

export async function authenticateStaff(email, password) {
  if (!isSupabaseConfigured()) {
    throw new Error("Autenticacao indisponivel sem Supabase.");
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("authenticate_staff", {
    input_email: email.trim(),
    input_password: password
  });

  if (error) {
    throw error;
  }

  if (!data?.length) {
    throw new Error("Email ou senha invalidos.");
  }

  const staff = data[0];
  const session = {
    userId: staff.user_id,
    email: staff.email,
    fullName: staff.full_name,
    role: staff.role,
    barberId: staff.barber_id
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getStoredSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_KEY);
}
