DELETE FROM public.scan_logs
WHERE result <> 'valid';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.scan_logs'::regclass
      AND conname = 'scan_logs_valid_only_check'
  ) THEN
    ALTER TABLE public.scan_logs
      ADD CONSTRAINT scan_logs_valid_only_check CHECK (result = 'valid');
  END IF;
END;
$$;
