BEGIN;

CREATE OR REPLACE FUNCTION public.create_public_interest_with_ticket(
  p_event_id uuid,
  p_token text,
  p_guest_name text,
  p_guest_email text,
  p_qr_secret text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation_id public.invitations.id%TYPE;
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM public.events AS e
     WHERE e.id = p_event_id
       AND e.is_public = true
       AND (e.ends_at IS NULL OR e.ends_at >= now())
  ) THEN
    RETURN jsonb_build_object('created', false, 'reason', 'event_unavailable');
  END IF;

  INSERT INTO public.invitations (
    event_id, token, guest_name, guest_email, plus_ones, status
  )
  VALUES (
    p_event_id, p_token, p_guest_name, lower(p_guest_email), 0, 'requested'
  )
  RETURNING id INTO v_invitation_id;

  INSERT INTO public.tickets (
    invitation_id, event_id, attendee_id, qr_secret
  )
  VALUES (
    v_invitation_id, p_event_id, NULL, p_qr_secret
  );

  RETURN jsonb_build_object(
    'created', true,
    'invitation_id', v_invitation_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_public_interest_with_ticket(uuid, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_interest_with_ticket(uuid, text, text, text, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.approve_public_interest_with_capacity(
  p_invitation_id text,
  p_qr_secret text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation_id public.invitations.id%TYPE;
  v_event_id public.events.id%TYPE;
  v_status text;
  v_plus_ones integer;
  v_capacity bigint;
  v_used bigint;
BEGIN
  SELECT i.id, i.event_id, i.status, i.plus_ones, e.capacity
    INTO v_invitation_id, v_event_id, v_status, v_plus_ones, v_capacity
    FROM public.invitations AS i
    JOIN public.events AS e ON e.id = i.event_id
   WHERE i.id::text = p_invitation_id
   FOR UPDATE OF e, i;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'not_found');
  END IF;

  IF v_status IS DISTINCT FROM 'requested' THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'not_requested');
  END IF;

  IF v_capacity IS NULL OR v_capacity < 1 THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'capacity_not_configured');
  END IF;

  SELECT COALESCE(SUM(1 + GREATEST(COALESCE(i.plus_ones, 0), 0)), 0)::bigint
    INTO v_used
    FROM public.invitations AS i
   WHERE i.event_id = v_event_id
     AND i.status = 'accepted';

  IF v_used + 1 + GREATEST(COALESCE(v_plus_ones, 0), 0) > v_capacity THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'capacity_reached');
  END IF;

  UPDATE public.invitations
     SET status = 'accepted'
   WHERE id = v_invitation_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.tickets AS t WHERE t.invitation_id = v_invitation_id
  ) THEN
    INSERT INTO public.tickets (invitation_id, event_id, attendee_id, qr_secret)
    VALUES (v_invitation_id, v_event_id, NULL, p_qr_secret);
  END IF;

  RETURN jsonb_build_object('accepted', true, 'reason', 'accepted');
END;
$$;

REVOKE ALL ON FUNCTION public.approve_public_interest_with_capacity(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_public_interest_with_capacity(text, text)
  TO service_role;

COMMIT;
