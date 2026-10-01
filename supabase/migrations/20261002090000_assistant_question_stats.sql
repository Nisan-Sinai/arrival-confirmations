-- Privacy-safe daily counts of how the site assistant answered.
--
-- One row per day × page kind × outcome × topic, holding only a counter. The question
-- text, IP, user, event and guest are never recorded, so this table carries no
-- personal data. It exists so the owner can see how often the assistant fails to
-- understand a question before deciding whether a model should read questions.

create table if not exists public.assistant_question_stats (
  day date not null,
  context text not null,
  outcome text not null,
  topic text not null default 'none',
  question_count integer not null default 0,
  primary key (day, context, outcome, topic),
  constraint assistant_question_stats_context_allowed
    check (context in ('site', 'event', 'guests', 'invitation', 'pricing')),
  constraint assistant_question_stats_outcome_allowed
    check (outcome in ('event', 'ai', 'guide', 'unmatched', 'greeting')),
  constraint assistant_question_stats_topic_shape
    check (topic ~ '^[a-z_]{1,40}$'),
  constraint assistant_question_stats_count_nonnegative
    check (question_count >= 0)
);

alter table public.assistant_question_stats enable row level security;

revoke all on table public.assistant_question_stats from anon, authenticated;
grant select on table public.assistant_question_stats to service_role;

comment on table public.assistant_question_stats is
  'Daily counters of assistant answers by page kind, outcome and topic. No question text or identifiers.';

/**
 * Adds one to today's counter (Israel time, the operator's day) for an answer.
 * Security definer so the service role can increment without table write grants.
 */
create or replace function public.record_assistant_question(
  p_context text,
  p_outcome text,
  p_topic text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.assistant_question_stats as s
    (day, context, outcome, topic, question_count)
  values (
    (now() at time zone 'Asia/Jerusalem')::date,
    p_context,
    p_outcome,
    coalesce(p_topic, 'none'),
    1
  )
  on conflict (day, context, outcome, topic) do update
    set question_count = s.question_count + 1;
$$;

revoke all on function public.record_assistant_question(text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_assistant_question(text, text, text) to service_role;
