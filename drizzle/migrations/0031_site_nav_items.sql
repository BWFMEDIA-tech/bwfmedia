create table public.site_nav_items (
  id uuid primary key default gen_random_uuid(),
  slot text not null,
  to_path text not null,
  label text not null,
  icon text not null default 'Music',
  position integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  constraint site_nav_slot_check check (slot in ('primary','browse'))
);

insert into public.site_nav_items (slot, to_path, label, icon, position) values
  ('primary','/','Home','Home',1),
  ('primary','/discover','Discover Music','Compass',2),
  ('primary','/live','Live Stage','Radio',3),
  ('primary','/artists','Artists','Music',4),
  ('primary','/profile','My Profile','User',5),
  ('primary','/artist-dashboard','Artist Dashboard','LayoutDashboard',6),
  ('browse','/store','Tunevio Store','ShoppingCart',1),
  ('browse','/artist-store','Artist Store','Disc3',2),
  ('browse','/play','Arena','Music',3),
  ('browse','/leaderboard','Leaderboard','Trophy',4),
  ('browse','/videos','Videos','Mic',5),
  ('browse','/charts','Charts','BarChart3',6),
  ('browse','/events','Events','Calendar',7),
  ('browse','/blog','Blog','Newspaper',8),
  ('browse','/contact','Contact','Mail',9);

grant select on public.site_nav_items to anon, authenticated;
grant insert, update, delete on public.site_nav_items to authenticated;
grant all on public.site_nav_items to service_role;

alter table public.site_nav_items enable row level security;

create policy "Anyone can view navigation"
  on public.site_nav_items for select
  using (true);

create policy "Admins manage navigation"
  on public.site_nav_items for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));