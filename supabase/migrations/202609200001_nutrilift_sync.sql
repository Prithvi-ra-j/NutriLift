create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  external_id text not null,
  record_type text not null,
  source_app text not null check (source_app = 'nutrilift'),
  occurred_at timestamptz not null,
  source_updated_at timestamptz,
  payload jsonb not null,
  schema_version integer not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, external_id)
);

create index if not exists sync_records_user_updated_at_idx on public.sync_records(user_id, source_updated_at);

create table if not exists public.sync_cursors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_app text not null,
  cursor text,
  last_synced_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, source_app)
);

create table if not exists public.sync_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_app text not null,
  direction text not null check (direction in ('upload', 'download')),
  record_count integer not null default 0,
  status text not null check (status in ('success', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.sync_records enable row level security;
alter table public.sync_cursors enable row level security;
alter table public.sync_events enable row level security;

drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Users manage their own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Users manage their own sync records" on public.sync_records;
create policy "Users manage their own sync records" on public.sync_records for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users manage their own sync cursors" on public.sync_cursors;
create policy "Users manage their own sync cursors" on public.sync_cursors for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users manage their own sync events" on public.sync_events;
create policy "Users manage their own sync events" on public.sync_events for all using (user_id = auth.uid()) with check (user_id = auth.uid());
