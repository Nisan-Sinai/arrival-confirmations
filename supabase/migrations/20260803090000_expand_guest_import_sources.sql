-- Keep the database constraint aligned with every import source emitted by the app.
-- The previous constraint allowed only manual/csv/xlsx, which caused phone-contact
-- and admin imports to fail with HTTP 400 even though the selected contacts were valid.

alter table public.guests
  drop constraint if exists guests_import_source_allowed;

alter table public.guests
  add constraint guests_import_source_allowed
    check (
      import_source is null
      or import_source in (
        'manual',
        'csv',
        'xlsx',
        'phone_contacts',
        'pasted_contacts',
        'admin_phone_contacts',
        'admin_pasted_contacts',
        'admin_csv',
        'admin_xlsx'
      )
    );
