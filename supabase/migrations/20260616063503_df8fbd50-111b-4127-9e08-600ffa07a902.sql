
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.merch_commissions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
