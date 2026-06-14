ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_id UUID DEFAULT gen_random_uuid();
UPDATE public.profiles SET public_id = gen_random_uuid() WHERE public_id IS NULL;
ALTER TABLE public.profiles ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_public_id_idx ON public.profiles(public_id);