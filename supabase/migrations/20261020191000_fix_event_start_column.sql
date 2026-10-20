BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'start_at'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'starts_at'
  ) THEN
    UPDATE public.events SET starts_at = start_at;
    ALTER TABLE public.events DROP COLUMN start_at;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'start_at'
  ) THEN
    ALTER TABLE public.events RENAME COLUMN start_at TO starts_at;
  END IF;
END;
$$;

COMMIT;
