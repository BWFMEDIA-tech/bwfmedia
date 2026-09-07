create table public.distribution_releases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  artist_name text not null,
  release_type text not null default 'single' check (release_type in ('single','ep','album')),
  genre text,
  release_date date,
  artwork_url text,
  label_name text,
  is_explicit boolean not null default false,
  language text not null default 'en',
  songwriters text[],
  producers text[],
  upc text,
  status text not null default 'draft' check (status in ('draft','submitted','approved','rejected','live')),
  review_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.distribution_releases to authenticated;
grant all on public.distribution_releases to service_role;

alter table public.distribution_releases enable row level security;

create policy "Artists can view their own releases"
  on public.distribution_releases for select to authenticated
  using (auth.uid() = user_id);

create policy "Artists can create their own draft releases"
  on public.distribution_releases for insert to authenticated
  with check (auth.uid() = user_id and status = 'draft');

create policy "Artists can edit their own draft releases"
  on public.distribution_releases for update to authenticated
  using (auth.uid() = user_id and status in ('draft','rejected'))
  with check (auth.uid() = user_id and status in ('draft','submitted'));

create policy "Artists can delete their own draft releases"
  on public.distribution_releases for delete to authenticated
  using (auth.uid() = user_id and status = 'draft');

create policy "Admins can view all releases"
  on public.distribution_releases for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update all releases"
  on public.distribution_releases for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete releases"
  on public.distribution_releases for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create trigger update_distribution_releases_updated_at
  before update on public.distribution_releases
  for each row execute function public.touch_updated_at();

create table public.distribution_release_tracks (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.distribution_releases(id) on delete cascade,
  title text not null,
  track_number int not null default 1,
  duration_secs int,
  isrc text,
  audio_url text,
  featured_artists text[],
  splits jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.distribution_release_tracks to authenticated;
grant all on public.distribution_release_tracks to service_role;

alter table public.distribution_release_tracks enable row level security;

create policy "Artists can view tracks of their own releases"
  on public.distribution_release_tracks for select to authenticated
  using (exists (
    select 1 from public.distribution_releases r
    where r.id = release_id and r.user_id = auth.uid()
  ));

create policy "Artists can manage tracks on their draft releases"
  on public.distribution_release_tracks for insert to authenticated
  with check (exists (
    select 1 from public.distribution_releases r
    where r.id = release_id and r.user_id = auth.uid() and r.status in ('draft','rejected')
  ));

create policy "Artists can edit tracks on their draft releases"
  on public.distribution_release_tracks for update to authenticated
  using (exists (
    select 1 from public.distribution_releases r
    where r.id = release_id and r.user_id = auth.uid() and r.status in ('draft','rejected')
  ));

create policy "Artists can delete tracks on their draft releases"
  on public.distribution_release_tracks for delete to authenticated
  using (exists (
    select 1 from public.distribution_releases r
    where r.id = release_id and r.user_id = auth.uid() and r.status in ('draft','rejected')
  ));

create policy "Admins can view all release tracks"
  on public.distribution_release_tracks for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage all release tracks"
  on public.distribution_release_tracks for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create trigger update_distribution_release_tracks_updated_at
  before update on public.distribution_release_tracks
  for each row execute function public.touch_updated_at();

create index distribution_releases_user_idx on public.distribution_releases (user_id, status);
create index distribution_releases_status_idx on public.distribution_releases (status, submitted_at desc);
create index distribution_release_tracks_release_idx on public.distribution_release_tracks (release_id, track_number);