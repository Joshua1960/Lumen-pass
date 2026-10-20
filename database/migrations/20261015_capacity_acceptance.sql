BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS tickets_invitation_id_unique
  ON public.tickets (invitation_id);

CREATE OR REPLACE FUNCTION public.accept_invitation_with_capacity(
  p_invitation_id text,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id public.events.id%TYPE;
  v_capacity integer;
  v_status text;
  v_claimed_by uuid;
  v_plus_ones integer;
  v_used integer;
BEGIN
  SELECT e.id, e.capacity, i.status, i.claimed_by, i.plus_ones
    INTO v_event_id, v_capacity, v_status, v_claimed_by, v_plus_ones
    FROM public.invitations AS i
    JOIN public.events AS e ON e.id = i.event_id
   WHERE i.id::text = p_invitation_id
   FOR UPDATE OF e;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'not_found');
  END IF;

  IF v_status = 'accepted' THEN
    IF v_claimed_by IS DISTINCT FROM p_user_id THEN
      RETURN jsonb_build_object('accepted', false, 'reason', 'already_claimed');
    END IF;
    RETURN jsonb_build_object('accepted', true, 'reason', 'already_accepted');
  END IF;

  IF v_status IS NULL OR v_status NOT IN ('pending', 'sent') THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'not_accepting_responses');
  END IF;

  IF v_capacity IS NULL OR v_capacity < 1 THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'capacity_not_configured');
  END IF;

  SELECT COALESCE(SUM(1 + GREATEST(COALESCE(i.plus_ones, 0), 0)), 0)::integer
    INTO v_used
    FROM public.invitations AS i
   WHERE i.event_id = v_event_id
     AND i.status = 'accepted';

  IF v_used + 1 + GREATEST(COALESCE(v_plus_ones, 0), 0) > v_capacity THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'capacity_reached');
  END IF;

  UPDATE public.invitations
     SET status = 'accepted',
         claimed_by = p_user_id,
         claimed_at = now()
   WHERE id::text = p_invitation_id;

  RETURN jsonb_build_object('accepted', true, 'reason', 'accepted');
END;
$$;

REVOKE ALL ON FUNCTION public.accept_invitation_with_capacity(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation_with_capacity(text, uuid) TO service_role;

COMMIT;
