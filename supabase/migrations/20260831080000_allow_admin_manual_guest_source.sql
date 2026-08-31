-- Keep the database constraint aligned with the source emitted by
-- adminSaveGuestAction for guests added manually from the platform admin screen.
-- Without this value, every admin manual insert is rejected by PostgreSQL and the
-- UI redirects back with guest-save even though the form data is valid.

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
        'admin_manual',
        'admin_phone_contacts',
        'admin_pasted_contacts',
        'admin_csv',
        'admin_xlsx'
      )
    );
