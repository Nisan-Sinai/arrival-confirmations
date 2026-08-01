-- Spreadsheet imports are idempotent by event and canonical phone number.
create unique index if not exists guests_event_phone_normalized_unique
  on public.guests (event_id, phone_normalized);
