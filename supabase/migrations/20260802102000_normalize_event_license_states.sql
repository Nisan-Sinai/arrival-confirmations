-- Repair plan/status combinations that the former admin form could save.
-- The audit log stays append-only: a corrective snapshot is added instead of
-- rewriting or deleting the original administrator action.

with latest_license as (
  select distinct on (log.entity_id)
    log.entity_id,
    log.admin_user_id,
    log.metadata
  from public.audit_logs log
  where log.entity_type = 'event_license'
    and log.entity_id is not null
  order by log.entity_id, log.created_at desc, log.id desc
), invalid_license as (
  select
    latest.entity_id,
    latest.admin_user_id,
    latest.metadata,
    latest.metadata ->> 'plan' as plan,
    latest.metadata ->> 'status' as status
  from latest_license latest
  where
    (
      latest.metadata ->> 'plan' in ('basic', 'premium', 'pro')
      and latest.metadata ->> 'status' = 'trial'
    )
    or (
      latest.metadata ->> 'plan' = 'trial'
      and latest.metadata ->> 'status' <> 'trial'
    )
)
insert into public.audit_logs (
  action,
  admin_user_id,
  entity_id,
  entity_type,
  metadata
)
select
  'event_license_updated',
  invalid.admin_user_id,
  invalid.entity_id,
  'event_license',
  case
    when invalid.plan = 'trial' then
      jsonb_set(
        jsonb_set(invalid.metadata, '{status}', to_jsonb('trial'::text), true),
        '{price_agorot}',
        to_jsonb(0),
        true
      )
    else
      jsonb_set(invalid.metadata, '{status}', to_jsonb('active'::text), true)
  end
from invalid_license invalid;
