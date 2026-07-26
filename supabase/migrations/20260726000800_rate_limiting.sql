-- Distributed rate limiting on Postgres (§4.8).
--
-- §4.8 forbids an in-memory Map or any process-local cache, because Vercel functions
-- are distributed and ephemeral: each instance would keep its own counter, and the
-- effective limit would multiply by however many instances happen to be warm.
--
-- §1 permits Upstash, a Vercel KV, or "a Postgres-backed atomic implementation".
-- This takes the Postgres route, because the whole product has to fit inside free
-- tiers — a paid Redis would undercut that before the first guest arrives.
--
-- Atomicity comes from a single `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`.
-- That statement takes a row lock and resolves the read-modify-write in one round
-- trip, so two concurrent requests for the same bucket cannot both read "4 of 5
-- used" and both proceed. A SELECT-then-UPDATE pair would allow exactly that.

create table public.rate_limit_counters (
  -- sha256(pepper : scope : identity). §4.8: never the raw IP, phone or email.
  bucket_key text not null,
  -- Fixed windows: the start instant is part of the key, so a new window is a new
  -- row rather than a reset of an existing one. No scheduled job is needed to roll
  -- them over, and an expired row is simply never read again.
  window_started_at timestamptz not null,
  request_count integer not null default 0,
  expires_at timestamptz not null,

  primary key (bucket_key, window_started_at),
  constraint rate_limit_count_positive check (request_count >= 0)
);

comment on table public.rate_limit_counters is
  'Fixed-window counters for §4.8. Keys are peppered hashes; no raw identity is stored.';

create index rate_limit_counters_expires_at_idx on public.rate_limit_counters (expires_at);

alter table public.rate_limit_counters enable row level security;
alter table public.rate_limit_counters force row level security;
revoke all on public.rate_limit_counters from anon, authenticated;
-- No policies and no grants: only server-side privileged code touches this (§4.1).

/**
 * Consumes one unit from a bucket and reports whether the caller may proceed.
 *
 * Returns the decision rather than raising, so the caller can distinguish "denied"
 * from "the limiter itself failed" — the two warrant different responses to a guest.
 */
create or replace function public.consume_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_expires_at timestamptz;
  v_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'consume_rate_limit requires a positive limit and window'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Align to the window grid so every instance computes the same boundary for the
  -- same instant, without coordinating.
  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );
  v_expires_at := v_window_start + make_interval(secs => p_window_seconds * 2);

  -- The atomic step. The RETURNING value is the count *after* this request, so the
  -- comparison below is against a number no concurrent caller can have shared.
  insert into public.rate_limit_counters as c
    (bucket_key, window_started_at, request_count, expires_at)
  values (p_bucket_key, v_window_start, 1, v_expires_at)
  on conflict (bucket_key, window_started_at) do update
    set request_count = c.request_count + 1
  returning c.request_count into v_count;

  return query select
    v_count <= p_limit,
    greatest(p_limit - v_count, 0),
    v_window_start + make_interval(secs => p_window_seconds);
end;
$$;

comment on function public.consume_rate_limit(text, integer, integer) is
  'Atomically consumes one unit from a fixed window (§4.8). Counts the request even when it is denied, so a caller cannot spend its way past the limit by retrying.';

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;

/**
 * Removes counters whose window has passed (§4.8 "reasonable retention", §14).
 *
 * Safe to run at any time: it only touches rows that can no longer be read by a
 * live window.
 */
create or replace function public.purge_expired_rate_limits()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from public.rate_limit_counters where expires_at < now();
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.purge_expired_rate_limits() from public, anon, authenticated;
