create extension if not exists btree_gist;
create extension if not exists pgcrypto;

create table if not exists public.barbers (
  id text primary key,
  name text not null,
  short_code text not null,
  role_title text not null,
  phone text not null,
  specialty text not null default '',
  bio text not null default '',
  photo_key text not null default 'heritage',
  hero_tagline text not null default '',
  working_start time not null,
  working_end time not null,
  days_off smallint[] not null default '{}',
  break_ranges jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.barbers
  add column if not exists photo_key text not null default 'heritage';

alter table public.barbers
  add column if not exists hero_tagline text not null default '';

create table if not exists public.staff_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('barber', 'admin')),
  barber_id text references public.barbers (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint staff_profiles_role_barber_check check (
    (role = 'admin' and barber_id is null) or
    (role = 'barber' and barber_id is not null)
  )
);

create table if not exists public.barber_services (
  id uuid primary key default gen_random_uuid(),
  barber_id text not null references public.barbers (id) on delete cascade,
  slug text not null,
  name text not null,
  badge text not null default '',
  price numeric(10, 2) not null check (price >= 0),
  duration integer not null check (duration > 0),
  category text not null default '',
  description text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (barber_id, slug)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  whatsapp text not null unique,
  email text not null default '',
  notes text not null default '',
  first_appointment_at timestamptz,
  last_appointment_at timestamptz,
  visit_count integer not null default 0,
  completed_visit_count integer not null default 0,
  cancelled_visit_count integer not null default 0,
  lifetime_value numeric(10, 2) not null default 0,
  average_ticket numeric(10, 2) not null default 0,
  cadence_days numeric(10, 2) not null default 0,
  last_service_names text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  barber_id text not null references public.barbers (id) on delete cascade,
  title text not null,
  block_type text not null check (block_type in ('day_off', 'lunch', 'unavailable')),
  date date not null,
  start_time time,
  end_time time,
  is_all_day boolean not null default false,
  notes text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint schedule_blocks_time_window check (
    is_all_day = true or (start_time is not null and end_time is not null and start_time < end_time)
  )
);

create table if not exists public.appointments (
  id text primary key,
  barber_id text not null references public.barbers (id) on delete restrict,
  customer_id uuid references public.customers (id) on delete set null,
  client_name text not null,
  client_whatsapp text not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'completed', 'cancelled')),
  total_price numeric(10, 2) not null default 0,
  notes text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.appointments
  add column if not exists customer_id uuid references public.customers (id) on delete set null;

alter table public.appointments
  add column if not exists created_by uuid references auth.users (id) on delete set null;

alter table public.appointments
  add column if not exists service_ids text[] not null default '{}';

create table if not exists public.appointment_services (
  id uuid primary key default gen_random_uuid(),
  appointment_id text not null references public.appointments (id) on delete cascade,
  service_id uuid not null references public.barber_services (id) on delete restrict,
  service_name text not null,
  price numeric(10, 2) not null check (price >= 0),
  duration integer not null check (duration > 0),
  sort_order integer not null default 0,
  unique (appointment_id, service_id)
);

create table if not exists public.appointment_notifications (
  id uuid primary key default gen_random_uuid(),
  appointment_id text not null references public.appointments (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  barber_id text references public.barbers (id) on delete set null,
  notification_type text not null check (notification_type in ('confirmation', 'reminder', 'reschedule', 'cancellation')),
  channel text not null default 'whatsapp' check (channel in ('whatsapp')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'sent', 'failed', 'cancelled')),
  provider text not null default 'official_whatsapp_pending',
  business_number text not null default '5592986202729',
  recipient text not null,
  scheduled_for timestamptz not null,
  message_template text not null,
  payload jsonb not null default '{}'::jsonb,
  provider_message_id text not null default '',
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  last_error text not null default '',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.appointment_notifications
  add column if not exists business_number text not null default '5592986202729';

alter table public.appointment_notifications
  add column if not exists provider_message_id text not null default '';

alter table public.appointment_notifications
  add column if not exists attempt_count integer not null default 0;

alter table public.appointment_notifications
  add column if not exists last_attempt_at timestamptz;

create table if not exists public.app_event_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  level text not null default 'info' check (level in ('info', 'warning', 'error')),
  event_type text not null,
  message text not null,
  source text not null default 'web',
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.app_brand_settings (
  id integer primary key default 1,
  logo_text text not null default 'O Pai ta on',
  logo_image_path text not null default '',
  business_whatsapp text not null default '5592986202729',
  hero_title text not null default 'O Pai ta on',
  hero_description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_brand_settings_singleton check (id = 1)
);

create table if not exists public.gallery_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text not null default '',
  tag text not null default '',
  image_path text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_brand_settings
  add column if not exists logo_image_path text not null default '';

alter table public.gallery_posts
  add column if not exists image_path text not null default '';

create index if not exists barber_services_barber_idx
  on public.barber_services (barber_id, is_active, sort_order);

create index if not exists customers_whatsapp_idx
  on public.customers (whatsapp);

create index if not exists appointments_barber_date_idx
  on public.appointments (barber_id, date, start_time);

create index if not exists appointments_customer_idx
  on public.appointments (customer_id, date desc);

create index if not exists appointment_notifications_schedule_idx
  on public.appointment_notifications (status, scheduled_for);

create index if not exists app_event_logs_created_idx
  on public.app_event_logs (created_at desc);

create index if not exists schedule_blocks_barber_date_idx
  on public.schedule_blocks (barber_id, date);

alter table public.appointments
  drop constraint if exists appointments_no_overlap;

alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    barber_id with =,
    date with =,
    tsrange(
      (date + start_time)::timestamp,
      (date + end_time)::timestamp,
      '[)'
    ) with &&
  )
  where (status in ('confirmed', 'completed'));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row
execute function public.set_updated_at();

drop trigger if exists app_brand_settings_set_updated_at on public.app_brand_settings;
create trigger app_brand_settings_set_updated_at
before update on public.app_brand_settings
for each row
execute function public.set_updated_at();

drop trigger if exists gallery_posts_set_updated_at on public.gallery_posts;
create trigger gallery_posts_set_updated_at
before update on public.gallery_posts
for each row
execute function public.set_updated_at();

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at
before update on public.appointments
for each row
execute function public.set_updated_at();

create or replace function public.current_staff_profile()
returns table (
  user_id uuid,
  role text,
  barber_id text,
  is_active boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sp.id,
    sp.role,
    sp.barber_id,
    sp.is_active
  from public.staff_profiles sp
  where sp.id = auth.uid();
$$;

create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.current_staff_profile() limit 1), '');
$$;

create or replace function public.current_staff_barber_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select (select barber_id from public.current_staff_profile() limit 1);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_staff_role() = 'admin';
$$;

create or replace function public.can_manage_barber(target_barber_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or (
    public.current_staff_role() = 'barber'
    and public.current_staff_barber_id() = target_barber_id
  );
$$;

create or replace function public.normalize_phone(input_phone text)
returns text
language sql
immutable
as $$
  select regexp_replace(coalesce(input_phone, ''), '\D', '', 'g');
$$;

create or replace function public.log_app_event(
  input_level text,
  input_event_type text,
  input_message text,
  input_source text default 'web',
  input_context jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  event_id uuid;
begin
  insert into public.app_event_logs (
    actor_user_id,
    level,
    event_type,
    message,
    source,
    context
  )
  values (
    auth.uid(),
    coalesce(input_level, 'info'),
    input_event_type,
    input_message,
    coalesce(input_source, 'web'),
    coalesce(input_context, '{}'::jsonb)
  )
  returning id into event_id;

  return event_id;
end;
$$;

create or replace function public.barber_service_buffer_minutes(service_count integer)
returns integer
language sql
immutable
as $$
  select case when coalesce(service_count, 0) > 1 then 15 else 10 end;
$$;

create or replace function public.sync_customer_metrics(target_customer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  completed_count integer := 0;
  cancelled_count integer := 0;
  total_count integer := 0;
  lifetime_total numeric(10, 2) := 0;
  average_total numeric(10, 2) := 0;
  cadence numeric(10, 2) := 0;
  first_visit timestamptz;
  last_visit timestamptz;
  recent_services text[] := '{}';
begin
  if target_customer_id is null then
    return;
  end if;

  select
    count(*) filter (where a.status <> 'cancelled'),
    count(*) filter (where a.status = 'completed'),
    count(*) filter (where a.status = 'cancelled'),
    coalesce(sum(a.total_price) filter (where a.status <> 'cancelled'), 0),
    coalesce(avg(a.total_price) filter (where a.status <> 'cancelled'), 0),
    min((a.date + a.start_time)::timestamptz) filter (where a.status <> 'cancelled'),
    max((a.date + a.start_time)::timestamptz) filter (where a.status <> 'cancelled')
  into
    total_count,
    completed_count,
    cancelled_count,
    lifetime_total,
    average_total,
    first_visit,
    last_visit
  from public.appointments a
  where a.customer_id = target_customer_id;

  select coalesce(avg(gap_days), 0)
  into cadence
  from (
    select
      extract(epoch from (
        (a.date + a.start_time)::timestamp -
        lag((a.date + a.start_time)::timestamp) over (order by a.date, a.start_time)
      )) / 86400.0 as gap_days
    from public.appointments a
    where a.customer_id = target_customer_id
      and a.status <> 'cancelled'
  ) gaps
  where gap_days is not null;

  select coalesce(array_agg(service_name order by sort_order), '{}')
  into recent_services
  from public.appointment_services aps
  where aps.appointment_id = (
    select a.id
    from public.appointments a
    where a.customer_id = target_customer_id
      and a.status <> 'cancelled'
    order by a.date desc, a.start_time desc
    limit 1
  );

  update public.customers
  set
    first_appointment_at = first_visit,
    last_appointment_at = last_visit,
    visit_count = total_count,
    completed_visit_count = completed_count,
    cancelled_visit_count = cancelled_count,
    lifetime_value = lifetime_total,
    average_ticket = average_total,
    cadence_days = cadence,
    last_service_names = recent_services
  where id = target_customer_id;
end;
$$;

create or replace function public.sync_customer_metrics_from_appointment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_customer_metrics(old.customer_id);
    return old;
  end if;

  perform public.sync_customer_metrics(new.customer_id);

  if tg_op = 'UPDATE' and old.customer_id is distinct from new.customer_id then
    perform public.sync_customer_metrics(old.customer_id);
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_sync_customer_metrics on public.appointments;
create trigger appointments_sync_customer_metrics
after insert or update or delete on public.appointments
for each row
execute function public.sync_customer_metrics_from_appointment();

create or replace function public.build_notification_message(
  input_type text,
  input_client_name text,
  input_barber_name text,
  input_date date,
  input_start_time time,
  input_service_names text[]
)
returns text
language sql
stable
as $$
  select case input_type
    when 'confirmation' then
      format(
        'Oi %s, seu horario com %s foi confirmado para %s as %s. Servicos: %s.',
        input_client_name,
        input_barber_name,
        to_char(input_date, 'DD/MM/YYYY'),
        to_char(input_start_time, 'HH24:MI'),
        array_to_string(input_service_names, ', ')
      )
    when 'reminder' then
      format(
        'Lembrete: voce tem horario com %s em %s as %s. Servicos: %s.',
        input_barber_name,
        to_char(input_date, 'DD/MM/YYYY'),
        to_char(input_start_time, 'HH24:MI'),
        array_to_string(input_service_names, ', ')
      )
    when 'reschedule' then
      format(
        'Seu agendamento foi remarcado com %s para %s as %s. Servicos: %s.',
        input_barber_name,
        to_char(input_date, 'DD/MM/YYYY'),
        to_char(input_start_time, 'HH24:MI'),
        array_to_string(input_service_names, ', ')
      )
    when 'cancellation' then
      format(
        'Seu agendamento com %s em %s as %s foi cancelado. Entre em contato para remarcar.',
        input_barber_name,
        to_char(input_date, 'DD/MM/YYYY'),
        to_char(input_start_time, 'HH24:MI')
      )
    else ''
  end;
$$;

create or replace function public.enqueue_notification(
  input_appointment_id text,
  input_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  appointment_row public.appointments%rowtype;
  barber_row public.barbers%rowtype;
  service_names text[] := '{}';
  schedule_at timestamptz;
begin
  select * into appointment_row
  from public.appointments
  where id = input_appointment_id;

  if not found then
    return;
  end if;

  select * into barber_row
  from public.barbers
  where id = appointment_row.barber_id;

  select coalesce(array_agg(service_name order by sort_order), '{}')
  into service_names
  from public.appointment_services
  where appointment_id = input_appointment_id;

  schedule_at := case
    when input_type = 'reminder' then greatest(
      now(),
      ((appointment_row.date + appointment_row.start_time)::timestamptz - interval '24 hours')
    )
    else now()
  end;

  insert into public.appointment_notifications (
    appointment_id,
    customer_id,
    barber_id,
    notification_type,
    business_number,
    recipient,
    scheduled_for,
    message_template,
    payload
  )
  values (
    appointment_row.id,
    appointment_row.customer_id,
    appointment_row.barber_id,
    input_type,
    '5592986202729',
    appointment_row.client_whatsapp,
    schedule_at,
    public.build_notification_message(
      input_type,
      appointment_row.client_name,
      coalesce(barber_row.name, 'sua barbearia'),
      appointment_row.date,
      appointment_row.start_time,
      service_names
    ),
    jsonb_build_object(
      'appointment_id', appointment_row.id,
      'customer_name', appointment_row.client_name,
      'barber_name', barber_row.name,
      'date', appointment_row.date,
      'start_time', appointment_row.start_time,
      'services', service_names
    )
  );
end;
$$;

create or replace function public.upsert_customer_record(
  input_client_name text,
  input_client_whatsapp text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_customer_id uuid;
  normalized_whatsapp text := public.normalize_phone(input_client_whatsapp);
begin
  insert into public.customers (full_name, whatsapp)
  values (trim(input_client_name), normalized_whatsapp)
  on conflict (whatsapp) do update
  set full_name = excluded.full_name
  returning id into target_customer_id;

  return target_customer_id;
end;
$$;

create or replace function public.save_appointment_services(
  input_appointment_id text,
  input_barber_id text,
  input_service_ids uuid[]
)
returns table (
  subtotal numeric,
  total_duration integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  service_count integer := cardinality(input_service_ids);
begin
  if coalesce(service_count, 0) = 0 then
    raise exception 'Selecione ao menos um servico.';
  end if;

  if exists (
    select 1
    from unnest(input_service_ids) service_id
    left join public.barber_services bs on bs.id = service_id
    where bs.id is null
      or bs.barber_id <> input_barber_id
      or bs.is_active = false
  ) then
    raise exception 'Os servicos selecionados nao pertencem ao profissional.';
  end if;

  delete from public.appointment_services
  where appointment_id = input_appointment_id;

  insert into public.appointment_services (
    appointment_id,
    service_id,
    service_name,
    price,
    duration,
    sort_order
  )
  select
    input_appointment_id,
    bs.id,
    bs.name,
    bs.price,
    bs.duration,
    row_number() over ()
  from public.barber_services bs
  join unnest(input_service_ids) with ordinality selected(service_id, sort_order)
    on selected.service_id = bs.id
  order by selected.sort_order;

  return query
  select
    coalesce(sum(price), 0)::numeric(10, 2),
    coalesce(sum(duration), 0)::integer + public.barber_service_buffer_minutes(service_count)
  from public.appointment_services
  where appointment_id = input_appointment_id;
end;
$$;

create or replace function public.validate_booking_window(
  input_barber_id text,
  input_date date,
  input_start_time time,
  input_end_time time,
  input_ignore_appointment_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  barber_row public.barbers%rowtype;
  target_day integer;
begin
  select * into barber_row
  from public.barbers
  where id = input_barber_id
    and is_active = true;

  if not found then
    raise exception 'Profissional invalido.';
  end if;

  if input_start_time >= input_end_time then
    raise exception 'Intervalo de horario invalido.';
  end if;

  target_day := extract(dow from input_date);

  if target_day = any (barber_row.days_off) then
    raise exception 'O profissional nao atende nesta data.';
  end if;

  if input_start_time < barber_row.working_start or input_end_time > barber_row.working_end then
    raise exception 'Horario fora do expediente do profissional.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(barber_row.break_ranges) as break_item(start text, "end" text)
    where input_start_time < break_item."end"::time
      and input_end_time > break_item.start::time
  ) then
    raise exception 'Horario conflita com a pausa fixa do profissional.';
  end if;

  if exists (
    select 1
    from public.schedule_blocks sb
    where sb.barber_id = input_barber_id
      and sb.date = input_date
      and (
        sb.is_all_day = true
        or (
          input_start_time < sb.end_time
          and input_end_time > sb.start_time
        )
      )
  ) then
    raise exception 'Horario bloqueado na agenda operacional.';
  end if;

  if exists (
    select 1
    from public.appointments a
    where a.id <> coalesce(input_ignore_appointment_id, '')
      and a.barber_id = input_barber_id
      and a.date = input_date
      and a.status <> 'cancelled'
      and input_start_time < a.end_time
      and input_end_time > a.start_time
  ) then
    raise exception 'Horario indisponivel para este profissional.';
  end if;
end;
$$;

create or replace function public.book_public_appointment(
  input_barber_id text,
  input_client_name text,
  input_client_whatsapp text,
  input_date date,
  input_start_time time,
  input_notes text,
  input_service_ids uuid[]
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  barber_row public.barbers%rowtype;
  target_customer_id uuid;
  totals record;
  appointment_id text;
  appointment_end time;
  serial_count integer;
begin
  select * into barber_row
  from public.barbers
  where id = input_barber_id
    and is_active = true;

  if not found then
    raise exception 'Profissional invalido.';
  end if;

  target_customer_id := public.upsert_customer_record(input_client_name, input_client_whatsapp);

  select count(*) into serial_count
  from public.appointments
  where barber_id = input_barber_id
    and date = input_date;

  appointment_id := format(
    '%s-%s-%s',
    barber_row.short_code,
    to_char(input_date, 'MMDD'),
    lpad((serial_count + 1)::text, 2, '0')
  );

  insert into public.appointments (
    id,
    barber_id,
    customer_id,
    client_name,
    client_whatsapp,
    service_ids,
    date,
    start_time,
    end_time,
    status,
    total_price,
    notes
  )
  values (
    appointment_id,
    input_barber_id,
    target_customer_id,
    trim(input_client_name),
    public.normalize_phone(input_client_whatsapp),
    array(select service_id::text from unnest(input_service_ids) service_id),
    input_date,
    input_start_time,
    input_start_time,
    'confirmed',
    0,
    coalesce(trim(input_notes), '')
  );

  select * into totals
  from public.save_appointment_services(appointment_id, input_barber_id, input_service_ids);

  appointment_end := (input_start_time + make_interval(mins => totals.total_duration));

  perform public.validate_booking_window(
    input_barber_id,
    input_date,
    input_start_time,
    appointment_end,
    null
  );

  update public.appointments
  set
    total_price = totals.subtotal,
    service_ids = array(select service_id::text from unnest(input_service_ids) service_id),
    end_time = appointment_end
  where id = appointment_id;

  perform public.enqueue_notification(appointment_id, 'confirmation');
  perform public.enqueue_notification(appointment_id, 'reminder');

  return appointment_id;
end;
$$;

create or replace function public.save_staff_appointment(
  input_appointment_id text,
  input_barber_id text,
  input_client_name text,
  input_client_whatsapp text,
  input_date date,
  input_start_time time,
  input_status text,
  input_notes text,
  input_service_ids uuid[]
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_appointment public.appointments%rowtype;
  target_customer_id uuid;
  totals record;
  appointment_end time;
  was_rescheduled boolean := false;
begin
  select * into existing_appointment
  from public.appointments
  where id = input_appointment_id;

  if not found then
    raise exception 'Agendamento nao encontrado.';
  end if;

  if not public.can_manage_barber(existing_appointment.barber_id) then
    raise exception 'Sem permissao para editar este agendamento.';
  end if;

  if not public.can_manage_barber(input_barber_id) then
    raise exception 'Sem permissao para mover o agendamento para este profissional.';
  end if;

  target_customer_id := public.upsert_customer_record(input_client_name, input_client_whatsapp);

  select * into totals
  from public.save_appointment_services(input_appointment_id, input_barber_id, input_service_ids);

  appointment_end := (input_start_time + make_interval(mins => totals.total_duration));

  perform public.validate_booking_window(
    input_barber_id,
    input_date,
    input_start_time,
    appointment_end,
    input_appointment_id
  );

  was_rescheduled := existing_appointment.barber_id is distinct from input_barber_id
    or existing_appointment.date is distinct from input_date
    or existing_appointment.start_time is distinct from input_start_time;

  update public.appointments
  set
    barber_id = input_barber_id,
    customer_id = target_customer_id,
    client_name = trim(input_client_name),
    client_whatsapp = public.normalize_phone(input_client_whatsapp),
    service_ids = array(select service_id::text from unnest(input_service_ids) service_id),
    date = input_date,
    start_time = input_start_time,
    end_time = appointment_end,
    status = input_status,
    total_price = totals.subtotal,
    notes = coalesce(trim(input_notes), ''),
    created_by = auth.uid()
  where id = input_appointment_id;

  if input_status = 'cancelled' and existing_appointment.status <> 'cancelled' then
    perform public.enqueue_notification(input_appointment_id, 'cancellation');
  elsif was_rescheduled then
    perform public.enqueue_notification(input_appointment_id, 'reschedule');
    perform public.enqueue_notification(input_appointment_id, 'reminder');
  end if;

  return input_appointment_id;
end;
$$;

create or replace function public.update_appointment_status(
  input_appointment_id text,
  input_status text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_appointment public.appointments%rowtype;
begin
  select * into existing_appointment
  from public.appointments
  where id = input_appointment_id;

  if not found then
    raise exception 'Agendamento nao encontrado.';
  end if;

  if not public.can_manage_barber(existing_appointment.barber_id) then
    raise exception 'Sem permissao para atualizar este agendamento.';
  end if;

  update public.appointments
  set status = input_status
  where id = input_appointment_id;

  if input_status = 'cancelled' and existing_appointment.status <> 'cancelled' then
    perform public.enqueue_notification(input_appointment_id, 'cancellation');
  end if;

  return input_appointment_id;
end;
$$;

create or replace function public.public_booking_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'barbers',
    coalesce(
      (
        select jsonb_agg(row_to_json(b) order by b.sort_order, b.name)
        from (
          select
            id,
            name,
            short_code,
            role_title,
            phone,
            specialty,
            bio,
            photo_key,
            hero_tagline,
            to_char(working_start, 'HH24:MI') as working_start,
            to_char(working_end, 'HH24:MI') as working_end,
            days_off,
            break_ranges,
            sort_order
          from public.barbers
          where is_active = true
        ) b
      ),
      '[]'::jsonb
    ),
    'services',
    coalesce(
      (
        select jsonb_agg(row_to_json(s) order by s.sort_order, s.name)
        from (
          select
            id,
            barber_id,
            slug,
            name,
            badge,
            price,
            duration,
            category,
            description,
            is_active,
            sort_order
          from public.barber_services
          where is_active = true
        ) s
      ),
      '[]'::jsonb
    ),
    'schedule_blocks',
    coalesce(
      (
        select jsonb_agg(row_to_json(sb) order by sb.date, sb.start_time)
        from (
          select
            id,
            barber_id,
            block_type,
            date,
            to_char(start_time, 'HH24:MI') as start_time,
            to_char(end_time, 'HH24:MI') as end_time,
            is_all_day
          from public.schedule_blocks
        ) sb
      ),
      '[]'::jsonb
    ),
    'booking_events',
    coalesce(
      (
        select jsonb_agg(row_to_json(a) order by a.date, a.start_time)
        from (
          select
            id,
            barber_id,
            date,
            to_char(start_time, 'HH24:MI') as start_time,
            to_char(end_time, 'HH24:MI') as end_time,
            status
          from public.appointments
          where status <> 'cancelled'
        ) a
      ),
      '[]'::jsonb
    )
  );
$$;

revoke all on function public.current_staff_profile() from public;
grant execute on function public.current_staff_profile() to authenticated;

grant execute on function public.public_booking_snapshot() to anon, authenticated;
grant execute on function public.book_public_appointment(text, text, text, date, time, text, uuid[]) to anon, authenticated;
grant execute on function public.save_staff_appointment(text, text, text, text, date, time, text, text, uuid[]) to authenticated;
grant execute on function public.update_appointment_status(text, text) to authenticated;
grant execute on function public.log_app_event(text, text, text, text, jsonb) to anon, authenticated;

alter table public.barbers enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.barber_services enable row level security;
alter table public.customers enable row level security;
alter table public.schedule_blocks enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_services enable row level security;
alter table public.appointment_notifications enable row level security;
alter table public.app_event_logs enable row level security;
alter table public.app_brand_settings enable row level security;
alter table public.gallery_posts enable row level security;

drop policy if exists "public_read_barbers" on public.barbers;
create policy "public_read_barbers"
  on public.barbers
  for select
  using (is_active = true);

drop policy if exists "staff_read_own_profile" on public.staff_profiles;
create policy "staff_read_own_profile"
  on public.staff_profiles
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "admin_manage_profiles" on public.staff_profiles;
create policy "admin_manage_profiles"
  on public.staff_profiles
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "public_read_active_barber_services" on public.barber_services;
create policy "public_read_active_barber_services"
  on public.barber_services
  for select
  using (
    is_active = true or public.can_manage_barber(barber_id)
  );

drop policy if exists "staff_manage_barber_services" on public.barber_services;
create policy "staff_manage_barber_services"
  on public.barber_services
  for all
  to authenticated
  using (public.can_manage_barber(barber_id))
  with check (public.can_manage_barber(barber_id));

drop policy if exists "staff_read_customers" on public.customers;
create policy "staff_read_customers"
  on public.customers
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.appointments a
      where a.customer_id = customers.id
        and public.can_manage_barber(a.barber_id)
    )
  );

drop policy if exists "admin_manage_customers" on public.customers;
create policy "admin_manage_customers"
  on public.customers
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "staff_read_schedule_blocks" on public.schedule_blocks;
create policy "staff_read_schedule_blocks"
  on public.schedule_blocks
  for select
  using (true);

drop policy if exists "staff_manage_schedule_blocks" on public.schedule_blocks;
create policy "staff_manage_schedule_blocks"
  on public.schedule_blocks
  for all
  to authenticated
  using (public.can_manage_barber(barber_id))
  with check (public.can_manage_barber(barber_id));

drop policy if exists "staff_read_appointments" on public.appointments;
create policy "staff_read_appointments"
  on public.appointments
  for select
  to authenticated
  using (public.can_manage_barber(barber_id));

drop policy if exists "admin_manage_appointments_directly" on public.appointments;
create policy "admin_manage_appointments_directly"
  on public.appointments
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "staff_read_appointment_services" on public.appointment_services;
create policy "staff_read_appointment_services"
  on public.appointment_services
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.appointments a
      where a.id = appointment_services.appointment_id
        and public.can_manage_barber(a.barber_id)
    )
  );

drop policy if exists "admin_manage_appointment_services_directly" on public.appointment_services;
create policy "admin_manage_appointment_services_directly"
  on public.appointment_services
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "staff_read_notifications" on public.appointment_notifications;
create policy "staff_read_notifications"
  on public.appointment_notifications
  for select
  to authenticated
  using (public.can_manage_barber(barber_id));

drop policy if exists "staff_manage_notifications" on public.appointment_notifications;
create policy "staff_manage_notifications"
  on public.appointment_notifications
  for update
  to authenticated
  using (public.can_manage_barber(barber_id))
  with check (public.can_manage_barber(barber_id));

drop policy if exists "public_insert_app_event_logs" on public.app_event_logs;
create policy "public_insert_app_event_logs"
  on public.app_event_logs
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "admin_read_app_event_logs" on public.app_event_logs;
create policy "admin_read_app_event_logs"
  on public.app_event_logs
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "public_read_brand_settings" on public.app_brand_settings;
create policy "public_read_brand_settings"
  on public.app_brand_settings
  for select
  using (true);

drop policy if exists "admin_manage_brand_settings" on public.app_brand_settings;
create policy "admin_manage_brand_settings"
  on public.app_brand_settings
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "public_read_gallery_posts" on public.gallery_posts;
create policy "public_read_gallery_posts"
  on public.gallery_posts
  for select
  using (is_active = true or public.is_admin());

drop policy if exists "admin_manage_gallery_posts" on public.gallery_posts;
create policy "admin_manage_gallery_posts"
  on public.gallery_posts
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('opaitaon-media', 'opaitaon-media', true)
on conflict (id) do update
set public = true;

drop policy if exists "public_read_opaitaon_media" on storage.objects;
create policy "public_read_opaitaon_media"
  on storage.objects
  for select
  using (bucket_id = 'opaitaon-media');

drop policy if exists "admin_insert_opaitaon_media" on storage.objects;
create policy "admin_insert_opaitaon_media"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'opaitaon-media' and public.is_admin());

drop policy if exists "admin_update_opaitaon_media" on storage.objects;
create policy "admin_update_opaitaon_media"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'opaitaon-media' and public.is_admin())
  with check (bucket_id = 'opaitaon-media' and public.is_admin());

drop policy if exists "admin_delete_opaitaon_media" on storage.objects;
create policy "admin_delete_opaitaon_media"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'opaitaon-media' and public.is_admin());

insert into public.barbers (
  id,
  name,
  short_code,
  role_title,
  phone,
  specialty,
  bio,
  photo_key,
  hero_tagline,
  working_start,
  working_end,
  days_off,
  break_ranges,
  sort_order
)
values
  (
    'lucas',
    'Lucas',
    'LC',
    'Master barber',
    '5592999991111',
    'Precisao, acabamento classico e atendimento premium.',
    'Perfil ideal para corte social, executivo e clientes recorrentes.',
    'heritage',
    'Corte social de assinatura com cadencia premium.',
    '09:00',
    '20:00',
    array[0]::smallint[],
    '[{"start":"12:00","end":"13:00"}]'::jsonb,
    1
  ),
  (
    'luquinhas',
    'Luquinhas',
    'LQ',
    'Style specialist',
    '5592999992222',
    'Visagismo, barba premium e finalizacao moderna.',
    'Ideal para combo completo, barba e servicos de detalhe.',
    'editorial',
    'Acabamento moderno para agenda de alto giro.',
    '10:00',
    '21:00',
    array[1]::smallint[],
    '[{"start":"14:00","end":"15:00"}]'::jsonb,
    2
  )
on conflict (id) do update
set
  name = excluded.name,
  short_code = excluded.short_code,
  role_title = excluded.role_title,
  phone = excluded.phone,
  specialty = excluded.specialty,
  bio = excluded.bio,
  photo_key = excluded.photo_key,
  hero_tagline = excluded.hero_tagline,
  working_start = excluded.working_start,
  working_end = excluded.working_end,
  days_off = excluded.days_off,
  break_ranges = excluded.break_ranges,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.barber_services (barber_id, slug, name, badge, price, duration, category, description, sort_order)
values
  ('lucas', 'corte-assinatura', 'Corte assinatura', 'Mais pedido', 55, 45, 'Cabelo', 'Tesoura, maquina e acabamento classico para cliente recorrente.', 1),
  ('lucas', 'barba-toalha', 'Barba com toalha', 'Toalha quente', 38, 30, 'Barba', 'Contorno detalhado com relaxamento e balm.', 2),
  ('lucas', 'acabamento-rapido', 'Acabamento rapido', 'Express', 25, 20, 'Detalhes', 'Pezinho, nuca e alinhamento para manutencao.', 3),
  ('luquinhas', 'corte-fade-premium', 'Fade premium', 'Alta demanda', 60, 50, 'Cabelo', 'Degrade preciso com finalizacao e textura.', 1),
  ('luquinhas', 'combo-style', 'Combo style', 'Experiencia completa', 92, 80, 'Combo', 'Corte, barba e finalizacao para sessao completa.', 2),
  ('luquinhas', 'sobrancelha-design', 'Design de sobrancelha', 'Detalhe fino', 18, 20, 'Detalhes', 'Alinhamento rapido para completar o visual.', 3)
on conflict (barber_id, slug) do update
set
  name = excluded.name,
  badge = excluded.badge,
  price = excluded.price,
  duration = excluded.duration,
  category = excluded.category,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'admin@opaitaon.com',
    extensions.crypt('Admin123!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Administrador"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'lucas@opaitaon.com',
    extensions.crypt('Lucas123!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Lucas"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'luquinhas@opaitaon.com',
    extensions.crypt('Luquinhas123!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Luquinhas"}'::jsonb,
    now(),
    now()
  )
on conflict (id) do update
set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"admin@opaitaon.com"}'::jsonb,
    'email',
    'admin@opaitaon.com',
    now(),
    now(),
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"lucas@opaitaon.com"}'::jsonb,
    'email',
    'lucas@opaitaon.com',
    now(),
    now(),
    now()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    '{"sub":"33333333-3333-3333-3333-333333333333","email":"luquinhas@opaitaon.com"}'::jsonb,
    'email',
    'luquinhas@opaitaon.com',
    now(),
    now(),
    now()
  )
on conflict (id) do update
set
  identity_data = excluded.identity_data,
  provider = excluded.provider,
  provider_id = excluded.provider_id,
  updated_at = now();

insert into public.staff_profiles (id, email, full_name, role, barber_id, is_active)
values
  ('11111111-1111-1111-1111-111111111111', 'admin@opaitaon.com', 'Administrador', 'admin', null, true),
  ('22222222-2222-2222-2222-222222222222', 'lucas@opaitaon.com', 'Lucas', 'barber', 'lucas', true),
  ('33333333-3333-3333-3333-333333333333', 'luquinhas@opaitaon.com', 'Luquinhas', 'barber', 'luquinhas', true)
on conflict (id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  role = excluded.role,
  barber_id = excluded.barber_id,
  is_active = excluded.is_active;

insert into public.app_brand_settings (
  id,
  logo_text,
  business_whatsapp,
  hero_title,
  hero_description
)
values (
  1,
  'O Pai ta on',
  '5592986202729',
  'O Pai ta on',
  'Agenda premium com equipe conectada, CRM de clientes e visual pronto para operacao publicada.'
)
on conflict (id) do update
set
  logo_text = excluded.logo_text,
  business_whatsapp = excluded.business_whatsapp,
  hero_title = excluded.hero_title,
  hero_description = excluded.hero_description;

insert into public.gallery_posts (title, caption, tag, image_path, sort_order, is_active)
select *
from (
  values
    ('Fade premium', 'Degrade limpo com acabamento de linha e finalizacao fosca.', 'Alta demanda', '', 1, true),
    ('Barba com toalha', 'Contorno preciso, toalha quente e desenho de volume natural.', 'Experiencia', '', 2, true),
    ('Corte assinatura', 'Leitura de volume e acabamento classico para cliente recorrente.', 'Assinatura', '', 3, true)
) seed(title, caption, tag, image_path, sort_order, is_active)
where not exists (
  select 1
  from public.gallery_posts gp
  where gp.sort_order = seed.sort_order
    and gp.title = seed.title
);

insert into public.customers (full_name, whatsapp, notes)
values
  ('Rafael Souza', '5592999991234', 'Cliente recorrente, prefere acabamento classico.'),
  ('Bruno Alves', '5592988884545', 'Primeira visita, converte bem em combo premium.'),
  ('Matheus Lima', '5592977772233', '')
on conflict (whatsapp) do update
set
  full_name = excluded.full_name,
  notes = excluded.notes;

insert into public.appointments (
  id,
  barber_id,
  customer_id,
  client_name,
  client_whatsapp,
  service_ids,
  date,
  start_time,
  end_time,
  status,
  total_price,
  notes
)
values
  (
    'LC-0318-01',
    'lucas',
    (select id from public.customers where whatsapp = '5592999991234'),
    'Rafael Souza',
    '5592999991234',
    array[
      (select id::text from public.barber_services where barber_id = 'lucas' and slug = 'corte-assinatura'),
      (select id::text from public.barber_services where barber_id = 'lucas' and slug = 'barba-toalha')
    ],
    current_date + 1,
    '09:00',
    '10:10',
    'confirmed',
    93,
    'Cliente recorrente'
  ),
  (
    'LC-0318-02',
    'lucas',
    (select id from public.customers where whatsapp = '5592988884545'),
    'Bruno Alves',
    '5592988884545',
    array[
      (select id::text from public.barber_services where barber_id = 'lucas' and slug = 'corte-assinatura')
    ],
    current_date + 1,
    '13:30',
    '14:25',
    'confirmed',
    55,
    'Primeira visita'
  ),
  (
    'LQ-0318-01',
    'luquinhas',
    (select id from public.customers where whatsapp = '5592977772233'),
    'Matheus Lima',
    '5592977772233',
    array[
      (select id::text from public.barber_services where barber_id = 'luquinhas' and slug = 'combo-style')
    ],
    current_date + 1,
    '10:00',
    '11:30',
    'confirmed',
    92,
    ''
  )
on conflict (id) do update
  set
  barber_id = excluded.barber_id,
  customer_id = excluded.customer_id,
  client_name = excluded.client_name,
  client_whatsapp = excluded.client_whatsapp,
  service_ids = excluded.service_ids,
  date = excluded.date,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  status = excluded.status,
  total_price = excluded.total_price,
  notes = excluded.notes;

insert into public.appointment_services (appointment_id, service_id, service_name, price, duration, sort_order)
values
  ('LC-0318-01', (select id from public.barber_services where barber_id = 'lucas' and slug = 'corte-assinatura'), 'Corte assinatura', 55, 45, 1),
  ('LC-0318-01', (select id from public.barber_services where barber_id = 'lucas' and slug = 'barba-toalha'), 'Barba com toalha', 38, 30, 2),
  ('LC-0318-02', (select id from public.barber_services where barber_id = 'lucas' and slug = 'corte-assinatura'), 'Corte assinatura', 55, 45, 1),
  ('LQ-0318-01', (select id from public.barber_services where barber_id = 'luquinhas' and slug = 'combo-style'), 'Combo style', 92, 80, 1)
on conflict (appointment_id, service_id) do update
set
  service_name = excluded.service_name,
  price = excluded.price,
  duration = excluded.duration,
  sort_order = excluded.sort_order;

insert into public.schedule_blocks (barber_id, title, block_type, date, start_time, end_time, is_all_day, notes)
select *
from (
  values
    ('lucas', 'Almoco operacional', 'lunch', current_date + 2, '12:00'::time, '13:00'::time, false, ''),
    ('luquinhas', 'Workshop interno', 'unavailable', current_date + 3, '15:00'::time, '17:00'::time, false, '')
) seed(barber_id, title, block_type, date, start_time, end_time, is_all_day, notes)
where not exists (
  select 1
  from public.schedule_blocks sb
  where sb.barber_id = seed.barber_id
    and sb.date = seed.date
    and coalesce(sb.start_time, '00:00'::time) = coalesce(seed.start_time, '00:00'::time)
    and coalesce(sb.end_time, '00:00'::time) = coalesce(seed.end_time, '00:00'::time)
);

select public.sync_customer_metrics(id)
from public.customers;

insert into public.appointment_notifications (
  appointment_id,
  customer_id,
  barber_id,
  notification_type,
  business_number,
  recipient,
  scheduled_for,
  message_template
)
select
  a.id,
  a.customer_id,
  a.barber_id,
  'confirmation',
  '5592986202729',
  a.client_whatsapp,
  now(),
  public.build_notification_message(
    'confirmation',
    a.client_name,
    b.name,
    a.date,
    a.start_time,
    (select coalesce(array_agg(service_name order by sort_order), '{}') from public.appointment_services where appointment_id = a.id)
  )
from public.appointments a
join public.barbers b on b.id = a.barber_id
where not exists (
  select 1
  from public.appointment_notifications n
  where n.appointment_id = a.id
    and n.notification_type = 'confirmation'
);

notify pgrst, 'reload schema';
