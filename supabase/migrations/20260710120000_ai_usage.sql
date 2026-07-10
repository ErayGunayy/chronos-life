-- Chronos — per-user daily AI usage counter (cost + abuse guard for the public
-- launch). Every capture calls a paid/free-tier model, so an authenticated user
-- could otherwise run the bill or exhaust the shared free-tier quota without
-- bound. The capture route increments this once per valid attempt and refuses
-- past the cap. Hitting the cap is a system limit, surfaced kindly — never a
-- judgment of the user (CLAUDE.md §2).
--
-- Rows are keyed by (user_id, UTC day). Old rows are harmless; a scheduled
-- cleanup can prune them later, but nothing depends on it.

create table public.ai_usage (
  user_id uuid not null,
  usage_date date not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date),
  constraint ai_usage_count_nonneg check (count >= 0)
);

-- Same RLS discipline as every other table (§8): a person only ever sees or
-- touches their own counter.
alter table public.ai_usage enable row level security;

create policy ai_usage_select_own on public.ai_usage
  for select using (auth.uid() = user_id);
create policy ai_usage_insert_own on public.ai_usage
  for insert with check (auth.uid() = user_id);
create policy ai_usage_update_own on public.ai_usage
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Raw-SQL-created tables don't inherit Supabase's automatic grants (learned the
-- hard way in §9 Session 22), so grant the authenticated role explicitly.
grant select, insert, update on public.ai_usage to authenticated;

-- Atomic "increment my counter for this day, return the new value". SECURITY
-- INVOKER (the default) means it runs as the caller: RLS above still applies and
-- auth.uid() is the signed-in user, so a caller can only ever touch their own
-- row. One round trip, no read-modify-write race across serverless instances.
create function public.increment_ai_usage(p_date date)
returns integer
language sql
security invoker
set search_path = '' -- can't be shadowed via search_path (Supabase linter 0011)
as $$
  insert into public.ai_usage (user_id, usage_date, count, updated_at)
  values (auth.uid(), p_date, 1, now())
  on conflict (user_id, usage_date)
  do update set count = ai_usage.count + 1, updated_at = now()
  returning count;
$$;

grant execute on function public.increment_ai_usage(date) to authenticated;
