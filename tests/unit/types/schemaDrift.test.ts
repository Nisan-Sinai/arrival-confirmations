import { describe, expect, it } from 'vitest';

import { EVENT_TYPES } from '@/config/eventTypes';
import { Constants } from '@/types/database.types';

/**
 * The application declares its event types in TypeScript and Postgres declares them
 * again as an enum. Nothing in the type system connects the two: a value added to
 * `config/eventTypes.ts` without a matching migration compiles perfectly and then
 * fails at insert time, in production, on a real guest's submission.
 *
 * These assertions are the connection. They read the generated `Constants` — which
 * come from the live schema via `pnpm supabase:types` — so the test fails the moment
 * either side moves without the other.
 */
describe('config and database enums stay in step', () => {
  it('declares exactly the event types the database accepts', () => {
    expect([...EVENT_TYPES].sort()).toEqual([...Constants.public.Enums.event_type].sort());
  });

  it('keeps the neutral order of event types, because the admin picker renders it', () => {
    // Sorted comparison above proves membership; this proves the presets are ordered
    // deliberately rather than however Postgres happened to return them.
    expect(EVENT_TYPES[0]).toBe('brit_mila');
    expect(EVENT_TYPES[EVENT_TYPES.length - 1]).toBe('other');
  });

  it('matches the attendance statuses the RSVP form can submit', () => {
    expect([...Constants.public.Enums.attendance_status].sort()).toEqual([
      'attending',
      'maybe',
      'not_attending',
    ]);
  });

  it('keeps family sides label-neutral so any event type can rename them', () => {
    // A value like `groom_side` here would make the enum event-type specific, which
    // is precisely what `events.side_a_label` exists to avoid.
    expect([...Constants.public.Enums.family_side].sort()).toEqual(['other', 'side_a', 'side_b']);
  });

  it('distinguishes a personal-link submission from a public one, per §6.4', () => {
    expect([...Constants.public.Enums.rsvp_source].sort()).toEqual([
      'personal_link',
      'public_form',
    ]);
  });

  it('offers exactly the two admin roles is_admin() checks for', () => {
    expect([...Constants.public.Enums.admin_role].sort()).toEqual(['admin', 'owner']);
  });
});
