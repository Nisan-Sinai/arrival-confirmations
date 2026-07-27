-- How many invitations the host actually sent (§8.1).
--
-- The dashboard has always had a "response rate" tile and it has always read
-- "לא זמין". `computeResponseRate` divides by the number of rows in `guests`, and
-- nothing in the product creates one — the personal-invite-link flow was specified and
-- never built, so the denominator could not exist. The tile was dead UI.
--
-- Building that flow would not have fixed it either, and this is the part worth stating.
-- The product sends one unguessable link, forwarded in a WhatsApp group. A host does not
-- hold a per-guest list and should not be made to type one just to see a percentage.
--
-- So the denominator becomes a single number the host already knows: how many
-- invitations they sent. `guests` rows still take precedence when they exist, because a
-- real invite list is a better answer than an estimate — this is a fallback, not a
-- replacement.
--
-- Nullable on purpose. A host who does not know, or does not care, leaves it empty and
-- the tile keeps saying "not available" rather than inventing a figure. §8.1 forbids a
-- fabricated denominator, and an optional field is how that rule survives contact with
-- a host who just wants to see who is coming.

alter table public.events
  add column if not exists expected_guests integer;

alter table public.events
  drop constraint if exists events_expected_guests_range;

alter table public.events
  add constraint events_expected_guests_range check (
    expected_guests is null
    or (expected_guests > 0 and expected_guests <= 5000)
  );

comment on column public.events.expected_guests is
  'How many invitations the host sent. The denominator for the response rate when no per-guest rows exist (§8.1). Null means the host did not say, and the dashboard shows no percentage rather than guessing.';
