-- Chronos v0 — initial schema.
--
-- Facts vs. Perspectives separation (CLAUDE.md §5.11 / §5.12):
--   life_events  = user-owned facts. Never rewritten by a model upgrade.
--   perspectives = AI-generated interpretation. Regenerable, disposable.
-- Gaps (routine + Forgotten Moments) and patterns are computed from
-- life_events at read time — deliberately not persisted (§8).

create table public.life_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null default '',
  description text,
  category text,
  category_confidence real,
  start_at timestamptz not null,
  end_at timestamptz not null,
  timezone text not null,
  kind text not null default 'substantive',
  source text not null,
  people text[] not null default '{}',
  place text,
  notes text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint life_events_time_order check (end_at > start_at),
  constraint life_events_kind check (kind in ('substantive', 'unremembered')),
  constraint life_events_source check (
    source in ('life-conversation', 'gap-fill', 'quick-add', 'manual-edit', 'ai-reconstruction')
  ),
  constraint life_events_confidence check (
    category_confidence is null or (category_confidence >= 0 and category_confidence <= 1)
  ),
  constraint life_events_substantive_title check (kind = 'unremembered' or btrim(title) <> '')
);

-- listBetween queries overlap on [from, to): start_at < to and end_at > from.
create index life_events_user_start_idx on public.life_events (user_id, start_at);
create index life_events_user_end_idx on public.life_events (user_id, end_at);

create table public.perspectives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  life_event_id uuid references public.life_events (id) on delete cascade,
  scope text not null,
  type text not null,
  body text not null,
  model text not null,
  created_at timestamptz not null default now(),
  constraint perspectives_scope check (scope in ('event', 'day', 'week')),
  constraint perspectives_type check (type in ('summary', 'pattern', 'reflection'))
);

create index perspectives_user_created_idx on public.perspectives (user_id, created_at);

create table public.capture_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  raw_narrative text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint capture_sessions_status check (status in ('draft', 'reviewed', 'committed'))
);

create index capture_sessions_user_created_idx on public.capture_sessions (user_id, created_at);

create table public.settings (
  user_id uuid primary key,
  timezone text not null,
  daily_invite_time time not null default '21:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row Level Security from day one (§8): each person can only touch their own
-- memories. Single-user in v0, but the boundary exists before the data does.
alter table public.life_events enable row level security;
alter table public.perspectives enable row level security;
alter table public.capture_sessions enable row level security;
alter table public.settings enable row level security;

create policy life_events_select_own on public.life_events
  for select using (auth.uid() = user_id);
create policy life_events_insert_own on public.life_events
  for insert with check (auth.uid() = user_id);
create policy life_events_update_own on public.life_events
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy life_events_delete_own on public.life_events
  for delete using (auth.uid() = user_id);

create policy perspectives_select_own on public.perspectives
  for select using (auth.uid() = user_id);
create policy perspectives_insert_own on public.perspectives
  for insert with check (auth.uid() = user_id);
create policy perspectives_update_own on public.perspectives
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy perspectives_delete_own on public.perspectives
  for delete using (auth.uid() = user_id);

create policy capture_sessions_select_own on public.capture_sessions
  for select using (auth.uid() = user_id);
create policy capture_sessions_insert_own on public.capture_sessions
  for insert with check (auth.uid() = user_id);
create policy capture_sessions_update_own on public.capture_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy capture_sessions_delete_own on public.capture_sessions
  for delete using (auth.uid() = user_id);

create policy settings_select_own on public.settings
  for select using (auth.uid() = user_id);
create policy settings_insert_own on public.settings
  for insert with check (auth.uid() = user_id);
create policy settings_update_own on public.settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy settings_delete_own on public.settings
  for delete using (auth.uid() = user_id);
