-- Let anonymous visitors read the public profile data underlying the view
GRANT SELECT ON public.profiles TO anon;

-- Make the public_profiles view use the caller's RLS instead of the view owner's
ALTER VIEW public.public_profiles SET (security_invoker = true);

-- Allow anon and authenticated users to read all profile rows so the invoker view works
CREATE POLICY "Profiles are publicly readable"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);