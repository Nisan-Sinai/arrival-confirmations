-- Transactional RSVP submission (§6.2, §6.3, §6.4).
--
-- Everything the specification lists as one unit happens inside this one function,
-- so it is one transaction by construction: validate the event, resolve the guest,
-- check idempotency, authorise create-versus-update, write the RSVP, record the
-- audit event, persist the idempotent response. A failure at any step rolls back
-- all of it. Doing this as separate calls from the application is what leaves an
-- RSVP saved with no audit row, or an idempotency record pointing at nothing.
--
-- §6.4 is the reason for most of the shape below. The threat is that knowing a
-- phone number is enough to overwrite someone else's RSVP. The UNIQUE constraint on
-- (event_id, phone_normalized) prevents duplicate rows; it is NOT authorisation.
-- So an unauthorised submission for an existing phone number must:
--   * not modify the existing row,
--   * not reveal that the row exists,
--   * and be indistinguishable from a successful first submission — same status,
--     same response shape, same amount of work.
-- That last point is why the unauthorised branch still writes an idempotency record
-- and still returns 'accepted': anything cheaper would leak existence through timing
-- or through a differing response.

create or replace function public.submit_rsvp(
  p_event_id uuid,
  p_guest_id uuid,
  p_full_name text,
  p_phone text,
  p_phone_normalized text,
  p_family_side public.family_side,
  p_attendance_status public.attendance_status,
  p_adults integer,
  p_children integer,
  p_babies integer,
  p_dietary text,
  p_notes text,
  p_consent boolean,
  p_source public.rsvp_source,
  p_idempotency_key_hash text,
  p_request_fingerprint text,
  p_update_token_hash text,
  p_new_update_token_hash text,
  p_update_token_ttl_days integer,
  p_idempotency_ttl_hours integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.rsvps%rowtype;
  v_stored public.idempotency_keys%rowtype;
  v_guest public.guests%rowtype;
  v_rsvp_id uuid;
  v_authorised boolean := false;
  v_outcome text;
  v_response jsonb;
  v_family_side public.family_side := p_family_side;
begin
  -- 1. Idempotency (§6.3), before any mutation. A replayed request must return the
  --    original result rather than doing the work twice.
  select * into v_stored
    from public.idempotency_keys
   where event_id = p_event_id
     and idempotency_key_hash = p_idempotency_key_hash;

  if found then
    if v_stored.request_fingerprint = p_request_fingerprint then
      return v_stored.response_payload;
    end if;
    -- Same key, different body: the client reused a key for a different request.
    -- Answering with the first result would silently discard the second.
    return jsonb_build_object(
      'status', 409,
      'outcome', 'idempotency_conflict'
    );
  end if;

  -- 2. Event availability. Checked here rather than trusted from the caller, since
  --    the caller resolved it in a separate, earlier query.
  if not exists (
    select 1 from public.events where id = p_event_id and is_active
  ) then
    return jsonb_build_object('status', 410, 'outcome', 'event_unavailable');
  end if;

  -- 3. Resolve the personal invitation, if the caller presented a valid session.
  --    The session itself was validated before this call; what is re-checked here is
  --    that the guest still belongs to this event and is still active.
  if p_guest_id is not null then
    select * into v_guest
      from public.guests
     where id = p_guest_id and event_id = p_event_id and is_active;
    if not found then
      return jsonb_build_object('status', 403, 'outcome', 'invitation_invalid');
    end if;
    -- §3 AUTHORITY RULE: when a guest row and a submission disagree about the family
    -- side, the guest row wins. The host assigned it deliberately; the guest may be
    -- guessing, and the seating plan is built from the host's answer.
    if v_guest.family_side is not null then
      v_family_side := v_guest.family_side;
    end if;
  end if;

  -- 4. Authorise create versus update (§6.4).
  select * into v_existing
    from public.rsvps
   where event_id = p_event_id and phone_normalized = p_phone_normalized;

  if not found then
    v_authorised := true;  -- A first submission may always create.
  elsif p_guest_id is not null and v_existing.guest_id is not distinct from p_guest_id then
    v_authorised := true;  -- The invitation that owns this RSVP.
  elsif p_update_token_hash is not null
        and v_existing.update_token_hash is not null
        and v_existing.update_token_hash = p_update_token_hash
        and v_existing.update_token_expires_at > now() then
    v_authorised := true;  -- A live update token, scoped to this RSVP alone.
  end if;

  -- 5. Write.
  if v_existing.id is null then
    insert into public.rsvps (
      event_id, guest_id, full_name, phone, phone_normalized, family_side,
      attendance_status, adults_count, children_count, babies_count,
      dietary_requirements, notes, consent, source,
      update_token_hash, update_token_expires_at
    ) values (
      p_event_id, p_guest_id, p_full_name, p_phone, p_phone_normalized, v_family_side,
      p_attendance_status, p_adults, p_children, p_babies,
      p_dietary, p_notes, p_consent, p_source,
      p_new_update_token_hash,
      case when p_new_update_token_hash is null then null
           else now() + make_interval(days => p_update_token_ttl_days) end
    )
    returning id into v_rsvp_id;
    v_outcome := 'created';

  elsif v_authorised then
    update public.rsvps set
      guest_id = coalesce(p_guest_id, guest_id),
      full_name = p_full_name,
      phone = p_phone,
      family_side = v_family_side,
      attendance_status = p_attendance_status,
      adults_count = p_adults,
      children_count = p_children,
      babies_count = p_babies,
      dietary_requirements = p_dietary,
      notes = p_notes
    where id = v_existing.id
    returning id into v_rsvp_id;
    v_outcome := 'updated';

  else
    -- Unauthorised. The existing row is untouched and its contents are not read back
    -- to the caller. `v_rsvp_id` stays null so the response cannot carry an internal
    -- identifier the visitor has no right to.
    v_outcome := 'unauthorised';
  end if;

  -- 6. Audit (§4.7). Metadata carries no token, no phone number and no free text —
  --    only what an operator needs to reconstruct what happened.
  insert into public.audit_logs (action, entity_type, entity_id, metadata)
  values (
    case v_outcome
      when 'created' then 'rsvp.created'
      when 'updated' then 'rsvp.updated'
      else 'rsvp.unauthorised_update_attempt'
    end,
    'rsvp',
    v_rsvp_id,
    jsonb_build_object('event_id', p_event_id, 'source', p_source)
  );

  -- 7. The response.
  --
  --    §6.4 says existence must not leak through the status code, the timing or the
  --    message. Mapping only the unauthorised branch to 'accepted' is not enough:
  --    an unauthenticated caller would then see 'created' for a phone number that is
  --    new and 'accepted' for one that already exists, which is the same disclosure
  --    wearing a different word. The distinction is only safe to reveal to a caller
  --    that is authorised to know — one holding an invite session or update token.
  --
  --    So the outcome is generalised by *who is asking*, not by what happened.
  if p_guest_id is null and not (v_authorised and v_existing.id is not null) then
    -- Unauthenticated: one response for created, one for unauthorised, identical.
    -- rsvp_id is withheld too — its presence would restore the distinction.
    v_response := jsonb_build_object('status', 200, 'outcome', 'accepted', 'rsvp_id', null);
  else
    v_response := jsonb_build_object('status', 200, 'outcome', v_outcome, 'rsvp_id', v_rsvp_id);
  end if;

  -- 8. Persist the idempotent response, inside the same transaction as the write it
  --    describes, so the two can never disagree.
  insert into public.idempotency_keys (
    event_id, idempotency_key_hash, request_fingerprint,
    response_status, response_payload, rsvp_id, expires_at
  ) values (
    p_event_id, p_idempotency_key_hash, p_request_fingerprint,
    200, v_response, v_rsvp_id,
    now() + make_interval(hours => p_idempotency_ttl_hours)
  );

  return v_response;
end;
$$;

comment on function public.submit_rsvp is
  'The single transactional entry point for creating or updating an RSVP (§6.2). Enforces §6.4: an unauthorised submission for an existing phone number neither modifies the row nor reveals that it exists.';

revoke all on function public.submit_rsvp(
  uuid, uuid, text, text, text, public.family_side, public.attendance_status,
  integer, integer, integer, text, text, boolean, public.rsvp_source,
  text, text, text, text, integer, integer
) from public, anon, authenticated;
