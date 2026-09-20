create table if not exists public.ai_request_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  model text not null,
  max_output_tokens integer not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_request_usage_user_created_at_idx
  on public.ai_request_usage (user_id, created_at desc);

alter table public.ai_request_usage enable row level security;