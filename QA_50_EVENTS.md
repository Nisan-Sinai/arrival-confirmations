# QA matrix: 50 events

This branch adds a permanent database-backed regression test that creates 50 events inside a rolled-back transaction.

It validates:

- 1 through 50 guests per event (1,275 guests total)
- 1,275 RSVP rows with attending, maybe and declined states
- seating tables, capacities, zones, shapes and assignments
- public invitation visibility for active and inactive events
- branding projection
- Basic, Premium and Pro license records
- duplicate-phone rejection within one event
- cross-event seating rejection
- tenant isolation for five different event owners
- cascade cleanup of event-owned data
- zero queued automatic WhatsApp messages

The CI database job now runs integration, RLS and security suites against a fresh local Supabase database after replaying every migration.
