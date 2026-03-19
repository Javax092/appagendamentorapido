create extension if not exists pgcrypto;

-- ALTERACAO: trigger unico para manter updated_at automatico.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ALTERACAO: tabela base de profissionais.
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
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ALTERACAO: tabela de servicos ligada ao barbeiro.
create table if not exists public.services (
  id text primary key,
  barber_id text not null references public.barbers (id) on delete cascade,
  name text not null,
  badge text not null default '',
  price numeric(10, 2) not null check (price >= 0),
  duration integer not null check (duration > 0),
  category text not null default '',
  description text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ALTERACAO: tabela principal de agendamentos com os novos status.
create table if not exists public.appointments (
  id text primary key,
  barber_id text not null references public.barbers (id) on delete restrict,
  client_name text not null,
  client_whatsapp text not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'in-progress', 'done', 'cancelled')),
  total_price numeric(10, 2) not null default 0,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint appointments_time_window check (start_time < end_time)
);

-- ALTERACAO: tabela N:N entre appointments e services.
create table if not exists public.appointment_services (
  id uuid primary key default gen_random_uuid(),
  appointment_id text not null references public.appointments (id) on delete cascade,
  service_id text not null references public.services (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint appointment_services_unique unique (appointment_id, service_id)
);

create index if not exists barbers_sort_order_idx
  on public.barbers (sort_order);

create index if not exists services_barber_id_idx
  on public.services (barber_id);

create index if not exists appointments_barber_id_idx
  on public.appointments (barber_id);

create index if not exists appointments_date_idx
  on public.appointments (date);

create index if not exists appointments_status_idx
  on public.appointments (status);

create index if not exists appointments_barber_date_idx
  on public.appointments (barber_id, date);

create index if not exists appointment_services_appointment_id_idx
  on public.appointment_services (appointment_id);

create index if not exists appointment_services_service_id_idx
  on public.appointment_services (service_id);

drop trigger if exists set_barbers_updated_at on public.barbers;
create trigger set_barbers_updated_at
before update on public.barbers
for each row
execute function public.set_updated_at();

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at
before update on public.services
for each row
execute function public.set_updated_at();

drop trigger if exists set_appointments_updated_at on public.appointments;
create trigger set_appointments_updated_at
before update on public.appointments
for each row
execute function public.set_updated_at();

drop trigger if exists set_appointment_services_updated_at on public.appointment_services;
create trigger set_appointment_services_updated_at
before update on public.appointment_services
for each row
execute function public.set_updated_at();

alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_services enable row level security;

-- ALTERACAO: leitura publica de barbers para a jornada de booking.
drop policy if exists "Public read barbers" on public.barbers;
create policy "Public read barbers"
on public.barbers
for select
to public
using (true);

-- ALTERACAO: leitura publica de services para a jornada de booking.
drop policy if exists "Public read services" on public.services;
create policy "Public read services"
on public.services
for select
to public
using (true);

-- ALTERACAO: appointments livres por enquanto; adicionar auth aqui depois.
drop policy if exists "Public read appointments" on public.appointments;
create policy "Public read appointments"
on public.appointments
for select
to public
using (true);

drop policy if exists "Public insert appointments" on public.appointments;
create policy "Public insert appointments"
on public.appointments
for insert
to public
with check (true);

drop policy if exists "Public update appointments" on public.appointments;
create policy "Public update appointments"
on public.appointments
for update
to public
using (true)
with check (true);

drop policy if exists "Public delete appointments" on public.appointments;
create policy "Public delete appointments"
on public.appointments
for delete
to public
using (true);

-- ALTERACAO: relation table aberta junto com appointments enquanto nao houver auth.
drop policy if exists "Public read appointment_services" on public.appointment_services;
create policy "Public read appointment_services"
on public.appointment_services
for select
to public
using (true);

drop policy if exists "Public insert appointment_services" on public.appointment_services;
create policy "Public insert appointment_services"
on public.appointment_services
for insert
to public
with check (true);

drop policy if exists "Public update appointment_services" on public.appointment_services;
create policy "Public update appointment_services"
on public.appointment_services
for update
to public
using (true)
with check (true);

drop policy if exists "Public delete appointment_services" on public.appointment_services;
create policy "Public delete appointment_services"
on public.appointment_services
for delete
to public
using (true);
