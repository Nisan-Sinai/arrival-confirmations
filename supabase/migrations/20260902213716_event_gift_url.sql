-- A link for guests who want to send a gift.
--
-- In Israel a simcha gift is money, and it moves through Bit or PayBox. Guests ask where
-- to send it; hosts answer the same question forty times. The RSVP services here treat
-- this as a revenue line — WiWi processes card payments and handles the gift envelope for
-- a cut — so putting the host's own link on the invitation is free to us and removes the
-- one thing they charge for.
--
-- Deliberately a plain URL rather than a provider enum. Bit and PayBox both hand out
-- share links whose shape has changed more than once, and a bank transfer page or a
-- PayPal.me is just as valid an answer. Constraining the *scheme* is what matters.
--
-- Additive and nullable, so it is invisible to every event that has one already.
alter table public.events
  add column if not exists gift_url text;

-- The same rule the map links carry: https only. A javascript: or data: URL here would be
-- an XSS delivered by the host's own invitation to their own guests, and the check is what
-- makes that unrepresentable rather than merely filtered in the action.
alter table public.events
  drop constraint if exists events_gift_url_scheme;

alter table public.events
  add constraint events_gift_url_scheme
  check (gift_url is null or gift_url ~ '^https://');

alter table public.events
  drop constraint if exists events_gift_url_length;

alter table public.events
  add constraint events_gift_url_length
  check (gift_url is null or char_length(gift_url) between 12 and 500);

comment on column public.events.gift_url is
  'Optional https link where guests can send a money gift (Bit, PayBox, bank page).';
