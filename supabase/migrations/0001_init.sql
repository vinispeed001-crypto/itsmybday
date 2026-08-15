-- 0001_init.sql
create extension if not exists "pgcrypto";

create table venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  venue_id uuid not null references venues(id),
  role text not null check (role in ('admin', 'promoter')),
  full_name text,
  created_at timestamptz not null default now()
);

create table availability_slots (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id),
  event_date date not null,
  time text not null,
  is_open boolean not null default true,
  created_at timestamptz not null default now(),
  unique (venue_id, event_date, time)
);

create table requests (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues(id),
  requester_name text not null,
  event_date date not null,
  event_time text not null,
  quantity int not null check (quantity > 0),
  instagram text not null,
  whatsapp text not null,
  referred_by_profile_id uuid references profiles(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  denial_reason text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references profiles(id)
);

create table classifications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references requests(id) on delete cascade,
  type text not null check (type in ('tudo_vip', 'vip_ate_hora', 'valor_genero', 'pagar_antecipado')),
  vip_until_time text,
  value_male numeric(10, 2),
  value_female numeric(10, 2),
  advance_payment_note text,
  created_at timestamptz not null default now()
);

create table guest_lists (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references requests(id) on delete cascade,
  max_men int not null default 0,
  max_women int not null default 0,
  deadline_at timestamptz not null,
  share_token text not null unique,
  created_at timestamptz not null default now()
);

create table guest_list_entries (
  id uuid primary key default gen_random_uuid(),
  guest_list_id uuid not null references guest_lists(id) on delete cascade,
  name text not null,
  gender text not null check (gender in ('male', 'female')),
  created_at timestamptz not null default now()
);

create table house_rules (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null unique references venues(id),
  content text not null default '',
  updated_at timestamptz not null default now()
);

create table integration_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references requests(id) on delete cascade,
  type text not null check (type in ('getin_reservation', 'whatsapp_notification', 'pensanoevento_export')),
  status text not null check (status in ('pending_manual', 'sent', 'failed')) default 'pending_manual',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- Row Level Security: enabled everywhere. Admin (authenticated, matching venue)
-- gets full access via policies below. No anon policies exist anywhere —
-- all public reads/writes go through server routes using the service role key.

alter table venues enable row level security;
alter table profiles enable row level security;
alter table availability_slots enable row level security;
alter table requests enable row level security;
alter table classifications enable row level security;
alter table guest_lists enable row level security;
alter table guest_list_entries enable row level security;
alter table house_rules enable row level security;
alter table integration_events enable row level security;

create policy "admin reads own venue" on venues for select
  using (id in (select venue_id from profiles where profiles.id = auth.uid()));

create policy "admin reads own profile" on profiles for select
  using (id = auth.uid());

create policy "admin manages availability" on availability_slots for all
  using (venue_id in (select venue_id from profiles where profiles.id = auth.uid() and role = 'admin'))
  with check (venue_id in (select venue_id from profiles where profiles.id = auth.uid() and role = 'admin'));

create policy "admin manages requests" on requests for all
  using (venue_id in (select venue_id from profiles where profiles.id = auth.uid() and role = 'admin'))
  with check (venue_id in (select venue_id from profiles where profiles.id = auth.uid() and role = 'admin'));

create policy "admin manages classifications" on classifications for all
  using (request_id in (
    select r.id from requests r
    join profiles p on p.venue_id = r.venue_id
    where p.id = auth.uid() and p.role = 'admin'
  ))
  with check (request_id in (
    select r.id from requests r
    join profiles p on p.venue_id = r.venue_id
    where p.id = auth.uid() and p.role = 'admin'
  ));

create policy "admin manages guest_lists" on guest_lists for all
  using (request_id in (
    select r.id from requests r
    join profiles p on p.venue_id = r.venue_id
    where p.id = auth.uid() and p.role = 'admin'
  ))
  with check (request_id in (
    select r.id from requests r
    join profiles p on p.venue_id = r.venue_id
    where p.id = auth.uid() and p.role = 'admin'
  ));

create policy "admin manages guest_list_entries" on guest_list_entries for all
  using (guest_list_id in (
    select gl.id from guest_lists gl
    join requests r on r.id = gl.request_id
    join profiles p on p.venue_id = r.venue_id
    where p.id = auth.uid() and p.role = 'admin'
  ))
  with check (guest_list_id in (
    select gl.id from guest_lists gl
    join requests r on r.id = gl.request_id
    join profiles p on p.venue_id = r.venue_id
    where p.id = auth.uid() and p.role = 'admin'
  ));

create policy "admin manages house_rules" on house_rules for all
  using (venue_id in (select venue_id from profiles where profiles.id = auth.uid() and role = 'admin'))
  with check (venue_id in (select venue_id from profiles where profiles.id = auth.uid() and role = 'admin'));

create policy "admin manages integration_events" on integration_events for all
  using (request_id in (
    select r.id from requests r
    join profiles p on p.venue_id = r.venue_id
    where p.id = auth.uid() and p.role = 'admin'
  ))
  with check (request_id in (
    select r.id from requests r
    join profiles p on p.venue_id = r.venue_id
    where p.id = auth.uid() and p.role = 'admin'
  ));
