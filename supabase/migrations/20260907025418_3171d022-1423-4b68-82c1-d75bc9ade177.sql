create policy "Users can upload distribution files in own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'distribution-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can read own distribution files"
  on storage.objects for select to authenticated
  using (bucket_id = 'distribution-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update own distribution files"
  on storage.objects for update to authenticated
  using (bucket_id = 'distribution-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own distribution files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'distribution-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Admins can read all distribution files"
  on storage.objects for select to authenticated
  using (bucket_id = 'distribution-assets' and public.has_role(auth.uid(), 'admin'));

create policy "Admins can upload distribution files anywhere"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'distribution-assets' and public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete distribution files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'distribution-assets' and public.has_role(auth.uid(), 'admin'));