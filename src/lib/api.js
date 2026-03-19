import {
  appEventLogs as fallbackLogs,
  barbers as fallbackBarbers,
  brandConfig as fallbackBrandConfig,
  customers as fallbackCustomers,
  demoStaffSession,
  galleryPosts as fallbackGalleryPosts,
  notificationQueue as fallbackNotifications,
  sampleAppointments,
  scheduleBlocks as fallbackBlocks,
  services as fallbackServices,
  staffMembers as fallbackStaffMembers
} from "../data";
import { getActiveAuthSession, getSupabaseClient, isSupabaseConfigured } from "./supabase";

const BARBERS_TABLE = "barbers";
const BRAND_TABLE = "app_brand_settings";
const BLOCKS_TABLE = "schedule_blocks";
const CUSTOMERS_TABLE = "customers";
const GALLERY_TABLE = "gallery_posts";
const LOGS_TABLE = "app_event_logs";
const NOTIFICATIONS_TABLE = "appointment_notifications";
const PROFILES_TABLE = "staff_profiles";
const SERVICES_TABLE = "barber_services";
const SESSION_KEY = "appmobilebarbearia.local-session";
const DEFAULT_BUSINESS_WHATSAPP = "5592986202729";
const MEDIA_BUCKET = "opaitaon-media";

function getStoredFallbackSession() {
  if (typeof localStorage === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed?.authMode === "app_users" ? parsed : null;
  } catch {
    return null;
  }
}

function storeFallbackSession(session) {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function normalizeBarber(row) {
  return {
    id: row.id,
    name: row.name,
    shortCode: row.short_code ?? row.shortCode,
    role: row.role_title ?? row.role,
    phone: row.phone,
    specialty: row.specialty ?? "",
    bio: row.bio ?? "",
    photoKey: row.photo_key ?? row.photoKey ?? "heritage",
    heroTagline: row.hero_tagline ?? row.heroTagline ?? "",
    workingHours: {
      start: row.working_start?.slice?.(0, 5) ?? row.workingHours?.start ?? "09:00",
      end: row.working_end?.slice?.(0, 5) ?? row.workingHours?.end ?? "18:00"
    },
    daysOff: row.days_off ?? row.daysOff ?? [],
    breakRanges: Array.isArray(row.break_ranges) ? row.break_ranges : row.breakRanges ?? []
  };
}

function normalizeService(row) {
  return {
    id: row.id,
    barberId: row.barber_id ?? row.barberId,
    name: row.name,
    badge: row.badge ?? "",
    price: Number(row.price ?? 0),
    duration: Number(row.duration ?? 0),
    category: row.category ?? "",
    description: row.description ?? "",
    isActive: Boolean(row.is_active ?? row.isActive ?? true),
    sortOrder: row.sort_order ?? row.sortOrder ?? 0
  };
}

function normalizeBlock(row) {
  return {
    id: row.id,
    barberId: row.barber_id ?? row.barberId,
    title: row.title ?? "",
    blockType: row.block_type ?? row.blockType,
    date: row.date,
    startTime: row.start_time?.slice?.(0, 5) ?? row.startTime ?? "",
    endTime: row.end_time?.slice?.(0, 5) ?? row.endTime ?? "",
    isAllDay: Boolean(row.is_all_day ?? row.isAllDay),
    notes: row.notes ?? ""
  };
}

function normalizeAppointment(row) {
  const services = row.appointment_services ?? row.services ?? [];
  return {
    id: row.id,
    barberId: row.barber_id ?? row.barberId,
    clientId: row.customer_id ?? row.clientId ?? null,
    clientName: row.client_name ?? row.clientName,
    clientWhatsapp: row.client_whatsapp ?? row.clientWhatsapp,
    serviceIds: services.length
      ? services.map((item) => item.service_id ?? item.serviceId ?? item.id)
      : row.service_ids ?? row.serviceIds ?? [],
    date: row.date,
    startTime: row.start_time?.slice?.(0, 5) ?? row.startTime,
    endTime: row.end_time?.slice?.(0, 5) ?? row.endTime,
    status: row.status,
    totalPrice: Number(row.total_price ?? row.totalPrice ?? 0),
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt ?? row.created_at ?? row.createdAt,
    notes: row.notes ?? "",
    services: services.map((item) => ({
      id: item.service_id ?? item.serviceId ?? item.id,
      name: item.service_name ?? item.serviceName ?? item.name,
      price: Number(item.price ?? 0),
      duration: Number(item.duration ?? 0),
      sortOrder: item.sort_order ?? item.sortOrder ?? 0
    }))
  };
}

function normalizeCustomer(row) {
  return {
    id: row.id,
    fullName: row.full_name ?? row.fullName,
    whatsapp: row.whatsapp,
    email: row.email ?? "",
    notes: row.notes ?? "",
    visitCount: row.visit_count ?? row.visitCount ?? 0,
    completedVisitCount: row.completed_visit_count ?? row.completedVisitCount ?? 0,
    cancelledVisitCount: row.cancelled_visit_count ?? row.cancelledVisitCount ?? 0,
    lifetimeValue: Number(row.lifetime_value ?? row.lifetimeValue ?? 0),
    averageTicket: Number(row.average_ticket ?? row.averageTicket ?? 0),
    cadenceDays: Number(row.cadence_days ?? row.cadenceDays ?? 0),
    lastAppointmentAt: row.last_appointment_at ?? row.lastAppointmentAt ?? null,
    firstAppointmentAt: row.first_appointment_at ?? row.firstAppointmentAt ?? null,
    lastServiceNames: row.last_service_names ?? row.lastServiceNames ?? []
  };
}

function normalizeNotification(row) {
  return {
    id: row.id,
    appointmentId: row.appointment_id ?? row.appointmentId,
    customerId: row.customer_id ?? row.customerId,
    barberId: row.barber_id ?? row.barberId,
    type: row.notification_type ?? row.type,
    channel: row.channel,
    status: row.status,
    provider: row.provider,
    businessNumber: row.business_number ?? row.businessNumber ?? DEFAULT_BUSINESS_WHATSAPP,
    recipient: row.recipient,
    scheduledFor: row.scheduled_for ?? row.scheduledFor,
    messageTemplate: row.message_template ?? row.messageTemplate,
    providerMessageId: row.provider_message_id ?? row.providerMessageId ?? "",
    attemptCount: row.attempt_count ?? row.attemptCount ?? 0,
    lastAttemptAt: row.last_attempt_at ?? row.lastAttemptAt ?? null,
    sentAt: row.sent_at ?? row.sentAt ?? null,
    createdAt: row.created_at ?? row.createdAt
  };
}

function normalizeStaffMember(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name ?? row.fullName,
    role: row.role,
    barberId: row.barber_id ?? row.barberId ?? null,
    isActive: Boolean(row.is_active ?? row.isActive)
  };
}

function normalizeLog(row) {
  return {
    id: row.id,
    actorUserId: row.actor_user_id ?? row.actorUserId ?? null,
    level: row.level,
    eventType: row.event_type ?? row.eventType,
    message: row.message,
    source: row.source,
    context: row.context ?? {},
    createdAt: row.created_at ?? row.createdAt
  };
}

function resolvePublicMediaUrl(path) {
  if (!path || !isSupabaseConfigured()) {
    return "";
  }

  const supabase = getSupabaseClient();
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function normalizeBrandConfig(row) {
  return {
    logoText: row.logo_text ?? row.logoText ?? "O Pai ta on",
    logoImagePath: row.logo_image_path ?? row.logoImagePath ?? "",
    logoImageUrl: resolvePublicMediaUrl(row.logo_image_path ?? row.logoImagePath ?? ""),
    businessWhatsapp: row.business_whatsapp ?? row.businessWhatsapp ?? DEFAULT_BUSINESS_WHATSAPP,
    heroTitle: row.hero_title ?? row.heroTitle ?? "O Pai ta on",
    heroDescription: row.hero_description ?? row.heroDescription ?? "",
    metaWebhookConfigured: Boolean(import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID)
  };
}

function normalizeGalleryPost(row) {
  return {
    id: row.id,
    title: row.title,
    caption: row.caption ?? "",
    tag: row.tag ?? "",
    imagePath: row.image_path ?? row.imagePath ?? "",
    imageUrl: resolvePublicMediaUrl(row.image_path ?? row.imagePath ?? ""),
    sortOrder: row.sort_order ?? row.sortOrder ?? 0,
    isActive: Boolean(row.is_active ?? row.isActive ?? true)
  };
}

async function getProfileForCurrentUser() {
  const supabase = getSupabaseClient();
  const authSession = await getActiveAuthSession();

  if (!authSession?.user) {
    return null;
  }

  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select("id, email, full_name, role, barber_id, is_active")
    .eq("id", authSession.user.id)
    .single();

  if (error) {
    throw error;
  }

  if (!data.is_active) {
    throw new Error("Seu acesso esta desativado.");
  }

  return {
    userId: data.id,
    email: data.email,
    fullName: data.full_name,
    role: data.role,
    barberId: data.barber_id
  };
}

async function fetchStaffData() {
  const supabase = getSupabaseClient();
  const [
    barbersResult,
    servicesResult,
    appointmentsResult,
    blocksResult,
    customersResult,
    notificationsResult,
    staffResult,
    logsResult,
    brandResult,
    galleryResult
  ] = await Promise.all([
    supabase.from(BARBERS_TABLE).select("*").eq("is_active", true).order("sort_order", { ascending: true }),
    supabase.from(SERVICES_TABLE).select("*").order("sort_order", { ascending: true }),
    supabase
      .from("appointments")
      .select(
        "id, barber_id, customer_id, client_name, client_whatsapp, date, start_time, end_time, status, total_price, notes, created_at, updated_at, appointment_services(service_id, service_name, price, duration, sort_order)"
      )
      .order("date", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase.from(BLOCKS_TABLE).select("*").order("date", { ascending: true }).order("start_time", { ascending: true }),
    supabase.from(CUSTOMERS_TABLE).select("*").order("last_appointment_at", { ascending: false, nullsFirst: false }),
    supabase.from(NOTIFICATIONS_TABLE).select("*").order("scheduled_for", { ascending: true }).limit(80),
    supabase.from(PROFILES_TABLE).select("*").order("full_name", { ascending: true }),
    supabase.from(LOGS_TABLE).select("*").order("created_at", { ascending: false }).limit(80),
    supabase.from(BRAND_TABLE).select("*").eq("id", 1).maybeSingle(),
    supabase.from(GALLERY_TABLE).select("*").order("sort_order", { ascending: true })
  ]);

  const firstError = [
    barbersResult,
    servicesResult,
    appointmentsResult,
    blocksResult,
    customersResult,
    notificationsResult,
    staffResult,
    logsResult,
    brandResult,
    galleryResult
  ].find((result) => result.error)?.error;

  if (firstError) {
    throw firstError;
  }

  return {
    barbers: barbersResult.data.map(normalizeBarber),
    services: servicesResult.data.map(normalizeService),
    appointments: appointmentsResult.data.map(normalizeAppointment),
    scheduleBlocks: blocksResult.data.map(normalizeBlock),
    customers: customersResult.data.map(normalizeCustomer),
    notifications: notificationsResult.data.map(normalizeNotification),
    staffMembers: staffResult.data.map(normalizeStaffMember),
    logs: logsResult.data.map(normalizeLog),
    brandConfig: normalizeBrandConfig(brandResult.data ?? {}),
    galleryPosts: galleryResult.data.map(normalizeGalleryPost)
  };
}

async function fetchFallbackStaffData() {
  const supabase = getSupabaseClient();
  const [barbersResult, servicesResult, appointmentsResult, blocksResult, brandResult, galleryResult] = await Promise.all([
    supabase.from(BARBERS_TABLE).select("*").eq("is_active", true).order("sort_order", { ascending: true }),
    supabase.from(SERVICES_TABLE).select("*").order("sort_order", { ascending: true }),
    supabase
      .from("appointments")
      .select(
        "id, barber_id, customer_id, client_name, client_whatsapp, date, start_time, end_time, status, total_price, notes, created_at, updated_at, appointment_services(service_id, service_name, price, duration, sort_order)"
      )
      .order("date", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase.from(BLOCKS_TABLE).select("*").order("date", { ascending: true }).order("start_time", { ascending: true }),
    supabase.from(BRAND_TABLE).select("*").eq("id", 1).maybeSingle(),
    supabase.from(GALLERY_TABLE).select("*").order("sort_order", { ascending: true })
  ]);

  const firstError = [barbersResult, servicesResult, appointmentsResult, blocksResult, brandResult, galleryResult].find(
    (result) => result.error
  )?.error;

  if (firstError) {
    throw firstError;
  }

  return {
    barbers: barbersResult.data.map(normalizeBarber),
    services: servicesResult.data.map(normalizeService),
    appointments: appointmentsResult.data.map(normalizeAppointment),
    scheduleBlocks: blocksResult.data.map(normalizeBlock),
    customers: [],
    notifications: [],
    staffMembers: [],
    logs: [],
    brandConfig: normalizeBrandConfig(brandResult.data ?? {}),
    galleryPosts: galleryResult.data.map(normalizeGalleryPost)
  };
}

async function fetchPublicBrandAndGallery() {
  const supabase = getSupabaseClient();
  const [brandResult, galleryResult] = await Promise.all([
    supabase.from(BRAND_TABLE).select("*").eq("id", 1).maybeSingle(),
    supabase.from(GALLERY_TABLE).select("*").eq("is_active", true).order("sort_order", { ascending: true })
  ]);

  const firstError = [brandResult, galleryResult].find((result) => result.error)?.error;
  if (firstError) {
    throw firstError;
  }

  return {
    brandConfig: normalizeBrandConfig(brandResult.data ?? {}),
    galleryPosts: galleryResult.data.map(normalizeGalleryPost)
  };
}

function buildBookingEvents(appointments) {
  return appointments.map((appointment) => ({
    id: appointment.id,
    barberId: appointment.barberId,
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    status: appointment.status
  }));
}

function buildBrandConfig() {
  return {
    logoText: "O Pai ta on",
    businessWhatsapp:
      import.meta.env.VITE_WHATSAPP_BUSINESS_NUMBER?.replace(/\D/g, "") || DEFAULT_BUSINESS_WHATSAPP,
    metaWebhookConfigured: Boolean(import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID)
  };
}

export async function bootstrapAppData(sessionProfile = null) {
  const brand = buildBrandConfig();

  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      barbers: fallbackBarbers,
      services: fallbackServices,
      appointments: sessionProfile ? sampleAppointments : [],
      bookingEvents: buildBookingEvents(sampleAppointments),
      scheduleBlocks: fallbackBlocks,
      customers: sessionProfile ? fallbackCustomers : [],
      notifications: sessionProfile ? fallbackNotifications : [],
      staffMembers: sessionProfile ? fallbackStaffMembers : [],
      logs: sessionProfile ? fallbackLogs : [],
      galleryPosts: fallbackGalleryPosts,
      brandConfig: fallbackBrandConfig ?? brand
    };
  }

  if (sessionProfile) {
    if (sessionProfile.authMode === "app_users") {
      const staffData = await fetchFallbackStaffData();
      return {
        source: "supabase-app-users",
        ...staffData,
        bookingEvents: buildBookingEvents(staffData.appointments)
      };
    }

    const staffData = await fetchStaffData();
    return {
      source: "supabase",
      ...staffData,
      bookingEvents: buildBookingEvents(staffData.appointments)
    };
  }

  const supabase = getSupabaseClient();
  const [{ data, error }, brandAndGallery] = await Promise.all([
    supabase.rpc("public_booking_snapshot"),
    fetchPublicBrandAndGallery()
  ]);

  if (error) {
    throw error;
  }

  return {
    source: "supabase",
    barbers: (data?.barbers ?? []).map(normalizeBarber),
    services: (data?.services ?? []).map(normalizeService),
    appointments: [],
    bookingEvents: (data?.booking_events ?? []).map((row) => ({
      id: row.id,
      barberId: row.barber_id,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      status: row.status
    })),
    scheduleBlocks: (data?.schedule_blocks ?? []).map(normalizeBlock),
    customers: [],
    notifications: [],
    staffMembers: [],
    logs: [],
    galleryPosts: brandAndGallery.galleryPosts?.length ? brandAndGallery.galleryPosts : fallbackGalleryPosts,
    brandConfig: {
      ...brand,
      ...brandAndGallery.brandConfig
    }
  };
}

export async function getCurrentSessionProfile() {
  const fallbackSession = getStoredFallbackSession();
  if (fallbackSession) {
    return fallbackSession;
  }

  if (!isSupabaseConfigured()) {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  return getProfileForCurrentUser();
}

export async function authenticateStaff(email, password) {
  if (!isSupabaseConfigured()) {
    const session = {
      ...demoStaffSession,
      email: email.trim() || demoStaffSession.email
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  const supabase = getSupabaseClient();
  const trimmedEmail = email.trim();

  const { error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password
  });

  if (!error) {
    return getProfileForCurrentUser();
  }

  const shouldFallbackToAppUsers =
    error.message?.includes("Database error querying schema") ||
    error.error_code === "unexpected_failure";

  if (!shouldFallbackToAppUsers) {
    throw error;
  }

  const { data, error: fallbackError } = await supabase.rpc("authenticate_staff", {
    input_email: trimmedEmail,
    input_password: password
  });

  if (fallbackError) {
    throw fallbackError;
  }

  const profile = Array.isArray(data) ? data[0] : data;
  if (!profile?.user_id) {
    throw new Error("Nao foi possivel autenticar com as credenciais informadas.");
  }

  const fallbackSession = {
    userId: profile.user_id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
    barberId: profile.barber_id,
    authMode: "app_users",
    fallbackSecret: password
  };

  storeFallbackSession(fallbackSession);
  return fallbackSession;
}

export async function requestPasswordReset(email) {
  if (!isSupabaseConfigured()) {
    return { source: "local" };
  }

  const supabase = getSupabaseClient();
  const redirectTo =
    import.meta.env.VITE_PASSWORD_RESET_URL ||
    `${window.location.origin}${window.location.pathname}`;

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo
  });

  if (error) {
    throw error;
  }

  return { source: "supabase" };
}

export async function updateOwnPassword(password) {
  if (!isSupabaseConfigured()) {
    return { source: "local" };
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    throw error;
  }

  return { source: "supabase" };
}

export async function clearStoredSession() {
  const fallbackSession = getStoredFallbackSession();

  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }

  if (fallbackSession) {
    return;
  }

  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function createAppointment(appointment) {
  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      id: `local-${Date.now()}`
    };
  }

  const supabase = getSupabaseClient();
  const { data: appointmentId, error } = await supabase.rpc("book_public_appointment", {
    input_barber_id: appointment.barberId,
    input_client_name: appointment.clientName.trim(),
    input_client_whatsapp: appointment.clientWhatsapp.trim(),
    input_date: appointment.date,
    input_start_time: `${appointment.startTime}:00`,
    input_notes: appointment.notes?.trim() ?? "",
    input_service_ids: appointment.serviceIds
  });

  if (error) {
    throw error;
  }

  return {
    source: "supabase",
    id: appointmentId
  };
}

export async function saveStaffAppointment(appointment) {
  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      id: appointment.id
    };
  }

  const supabase = getSupabaseClient();
  const { data: appointmentId, error } = await supabase.rpc("save_staff_appointment", {
    input_appointment_id: appointment.id,
    input_barber_id: appointment.barberId,
    input_client_name: appointment.clientName.trim(),
    input_client_whatsapp: appointment.clientWhatsapp.trim(),
    input_date: appointment.date,
    input_start_time: `${appointment.startTime}:00`,
    input_status: appointment.status,
    input_notes: appointment.notes?.trim() ?? "",
    input_service_ids: appointment.serviceIds
  });

  if (error) {
    throw error;
  }

  return {
    source: "supabase",
    id: appointmentId
  };
}

export async function updateAppointmentStatus(appointmentId, status, sessionProfile = null) {
  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      data: { id: appointmentId, status }
    };
  }

  const supabase = getSupabaseClient();
  if (sessionProfile?.authMode === "app_users") {
    const { data, error } = await supabase.rpc("update_appointment_status_app_user", {
      input_email: sessionProfile.email,
      input_password: sessionProfile.fallbackSecret,
      input_appointment_id: appointmentId,
      input_status: status
    });

    if (error) {
      throw error;
    }

    return {
      source: "supabase-app-users",
      id: data
    };
  }

  const { data, error } = await supabase.rpc("update_appointment_status", {
    input_appointment_id: appointmentId,
    input_status: status
  });

  if (error) {
    throw error;
  }

  return {
    source: "supabase",
    id: data
  };
}

export async function createScheduleBlock(block, session) {
  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      data: { ...block, id: `local-block-${Date.now()}` }
    };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(BLOCKS_TABLE)
    .insert({
      barber_id: block.barberId,
      title: block.title.trim(),
      block_type: block.blockType,
      date: block.date,
      start_time: block.isAllDay ? null : `${block.startTime}:00`,
      end_time: block.isAllDay ? null : `${block.endTime}:00`,
      is_all_day: block.isAllDay,
      notes: block.notes?.trim() ?? "",
      created_by: session?.userId ?? null
    })
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

export async function saveService(service, existingService = null, sessionProfile = null) {
  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      data: {
        ...service,
        id: existingService?.id ?? service.id ?? `service-${Date.now()}`
      }
    };
  }

  const supabase = getSupabaseClient();
  if (sessionProfile?.authMode === "app_users") {
    const { data, error } = await supabase.rpc("save_barber_service_app_user", {
      input_email: sessionProfile.email,
      input_password: sessionProfile.fallbackSecret,
      input_service_id: existingService?.id ?? null,
      input_barber_id: service.barberId,
      input_name: service.name.trim(),
      input_badge: service.badge?.trim() ?? "",
      input_price: Number(service.price ?? 0),
      input_duration: Number(service.duration ?? 0),
      input_category: service.category?.trim() ?? "",
      input_description: service.description?.trim() ?? "",
      input_sort_order: Number(service.sortOrder ?? existingService?.sortOrder ?? 0),
      input_is_active: service.isActive ?? true
    });

    if (error) {
      throw error;
    }

    return {
      source: "supabase-app-users",
      data: normalizeService(data)
    };
  }

  const payload = {
    barber_id: service.barberId,
    slug:
      service.slug ??
      existingService?.slug ??
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

export async function setServiceActive(serviceId, isActive, sessionProfile = null) {
  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      data: { id: serviceId, isActive }
    };
  }

  const supabase = getSupabaseClient();
  if (sessionProfile?.authMode === "app_users") {
    const { data, error } = await supabase.rpc("set_barber_service_active_app_user", {
      input_email: sessionProfile.email,
      input_password: sessionProfile.fallbackSecret,
      input_service_id: serviceId,
      input_is_active: isActive
    });

    if (error) {
      throw error;
    }

    return {
      source: "supabase-app-users",
      data: normalizeService(data)
    };
  }

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

export async function deleteService(serviceId, sessionProfile = null) {
  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      data: serviceId
    };
  }

  const supabase = getSupabaseClient();
  if (sessionProfile?.authMode === "app_users") {
    const { data, error } = await supabase.rpc("delete_barber_service_app_user", {
      input_email: sessionProfile.email,
      input_password: sessionProfile.fallbackSecret,
      input_service_id: serviceId
    });

    if (error) {
      throw error;
    }

    return {
      source: "supabase-app-users",
      data
    };
  }

  const { error } = await supabase.from(SERVICES_TABLE).delete().eq("id", serviceId);

  if (error) {
    throw error;
  }

  return {
    source: "supabase",
    data: serviceId
  };
}

export async function updateCustomerNotes(customerId, notes) {
  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      data: {
        id: customerId,
        notes
      }
    };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(CUSTOMERS_TABLE)
    .update({ notes: notes.trim() })
    .eq("id", customerId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    source: "supabase",
    data: normalizeCustomer(data)
  };
}

export async function saveBrandSettings(brandConfig, sessionProfile = null) {
  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      data: brandConfig
    };
  }

  const supabase = getSupabaseClient();
  if (sessionProfile?.authMode === "app_users") {
    const { data, error } = await supabase.rpc("save_brand_settings_app_user", {
      input_email: sessionProfile.email,
      input_password: sessionProfile.fallbackSecret,
      input_logo_text: brandConfig.logoText?.trim() || "O Pai ta on",
      input_logo_image_path: brandConfig.logoImagePath ?? "",
      input_business_whatsapp: (brandConfig.businessWhatsapp ?? DEFAULT_BUSINESS_WHATSAPP).replace(/\D/g, ""),
      input_hero_title: brandConfig.heroTitle?.trim() || "O Pai ta on",
      input_hero_description: brandConfig.heroDescription?.trim() ?? ""
    });

    if (error) {
      throw error;
    }

    return {
      source: "supabase-app-users",
      data: normalizeBrandConfig(data)
    };
  }

  const { data, error } = await supabase
    .from(BRAND_TABLE)
    .upsert(
      {
        id: 1,
        logo_text: brandConfig.logoText?.trim() || "O Pai ta on",
        logo_image_path: brandConfig.logoImagePath ?? "",
        business_whatsapp: (brandConfig.businessWhatsapp ?? DEFAULT_BUSINESS_WHATSAPP).replace(/\D/g, ""),
        hero_title: brandConfig.heroTitle?.trim() || "O Pai ta on",
        hero_description: brandConfig.heroDescription?.trim() ?? ""
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    source: "supabase",
    data: normalizeBrandConfig(data)
  };
}

export async function saveGalleryPost(post, sessionProfile = null) {
  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      data: { ...post, id: post.id || `post-${Date.now()}` }
    };
  }

  const supabase = getSupabaseClient();
  if (sessionProfile?.authMode === "app_users") {
    const { data, error } = await supabase.rpc("save_gallery_post_app_user", {
      input_email: sessionProfile.email,
      input_password: sessionProfile.fallbackSecret,
      input_post_id: post.id || null,
      input_title: post.title.trim(),
      input_caption: post.caption?.trim() ?? "",
      input_tag: post.tag?.trim() ?? "",
      input_image_path: post.imagePath ?? "",
      input_sort_order: Number(post.sortOrder ?? 0),
      input_is_active: post.isActive ?? true
    });

    if (error) {
      throw error;
    }

    return {
      source: "supabase-app-users",
      data: normalizeGalleryPost(data)
    };
  }

  const payload = {
    title: post.title.trim(),
    caption: post.caption?.trim() ?? "",
    tag: post.tag?.trim() ?? "",
    image_path: post.imagePath ?? "",
    sort_order: Number(post.sortOrder ?? 0),
    is_active: post.isActive ?? true
  };

  const query = post.id
    ? supabase.from(GALLERY_TABLE).update(payload).eq("id", post.id)
    : supabase.from(GALLERY_TABLE).insert(payload);

  const { data, error } = await query.select().single();

  if (error) {
    throw error;
  }

  return {
    source: "supabase",
    data: normalizeGalleryPost(data)
  };
}

export async function setGalleryPostActive(postId, isActive, sessionProfile = null) {
  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      data: { id: postId, isActive }
    };
  }

  const supabase = getSupabaseClient();
  if (sessionProfile?.authMode === "app_users") {
    const { data, error } = await supabase.rpc("set_gallery_post_active_app_user", {
      input_email: sessionProfile.email,
      input_password: sessionProfile.fallbackSecret,
      input_post_id: postId,
      input_is_active: isActive
    });

    if (error) {
      throw error;
    }

    return {
      source: "supabase-app-users",
      data: normalizeGalleryPost(data)
    };
  }

  const { data, error } = await supabase
    .from(GALLERY_TABLE)
    .update({ is_active: isActive })
    .eq("id", postId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    source: "supabase",
    data: normalizeGalleryPost(data)
  };
}

export async function uploadMediaAsset(file, folder = "general", sessionProfile = null) {
  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      data: {
        path: "",
        publicUrl: ""
      }
    };
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeBaseName = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const path = `${folder}/${Date.now()}-${safeBaseName || "asset"}.${extension}`;
  const supabase = getSupabaseClient();

  if (sessionProfile?.authMode === "app_users") {
    throw new Error("Upload de imagem exige login admin completo no Supabase Auth.");
  }

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false
  });

  if (error) {
    throw error;
  }

  return {
    source: "supabase",
    data: {
      path,
      publicUrl: resolvePublicMediaUrl(path)
    }
  };
}

export async function saveStaffMember(staffMember) {
  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      data: {
        ...staffMember,
        id: staffMember.id || `staff-${Date.now()}`
      }
    };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke("manage-staff-user", {
    body: {
      action: "upsert",
      staff: {
        id: staffMember.id || null,
        email: staffMember.email.trim(),
        fullName: staffMember.fullName.trim(),
        role: staffMember.role,
        barberId: staffMember.role === "barber" ? staffMember.barberId : null,
        isActive: staffMember.isActive ?? true,
        password: staffMember.password?.trim() || null
      }
    }
  });

  if (error) {
    throw error;
  }

  return {
    source: "supabase",
    data: normalizeStaffMember(data.staff)
  };
}

export async function toggleStaffMemberActive(staffMemberId, isActive) {
  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      data: {
        id: staffMemberId,
        isActive
      }
    };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke("manage-staff-user", {
    body: {
      action: "toggle-active",
      staff: {
        id: staffMemberId,
        isActive
      }
    }
  });

  if (error) {
    throw error;
  }

  return {
    source: "supabase",
    data: normalizeStaffMember(data.staff)
  };
}

export async function resetStaffPassword(staffMemberId, password) {
  if (!isSupabaseConfigured()) {
    return { source: "local" };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke("manage-staff-user", {
    body: {
      action: "reset-password",
      staff: {
        id: staffMemberId,
        password
      }
    }
  });

  if (error) {
    throw error;
  }

  return {
    source: "supabase",
    data: normalizeStaffMember(data.staff)
  };
}

export async function processNotificationQueue(limit = 20) {
  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      data: {
        processed: 0,
        provider: "official_whatsapp_pending"
      }
    };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke("process-whatsapp-queue", {
    body: { limit }
  });

  if (error) {
    throw error;
  }

  return {
    source: "supabase",
    data
  };
}

export async function logAppEvent({
  level = "info",
  eventType,
  message,
  source = "web",
  context = {}
}) {
  if (!eventType || !message) {
    return null;
  }

  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      data: {
        id: `log-${Date.now()}`,
        level,
        eventType,
        message,
        source,
        context
      }
    };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("log_app_event", {
    input_level: level,
    input_event_type: eventType,
    input_message: message,
    input_source: source,
    input_context: context
  });

  if (error) {
    return null;
  }

  return {
    source: "supabase",
    data: { id: data }
  };
}
