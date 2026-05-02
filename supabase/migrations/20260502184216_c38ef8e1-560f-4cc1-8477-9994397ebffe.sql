
-- Videos table
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'music' CHECK (category IN ('music','sponsored')),
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Videos are viewable by everyone"
  ON public.videos FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert their own videos"
  ON public.videos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos"
  ON public.videos FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos"
  ON public.videos FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true);

-- Storage policies
CREATE POLICY "Public can view videos bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');

CREATE POLICY "Authenticated can upload to videos bucket"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own files in videos bucket"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
