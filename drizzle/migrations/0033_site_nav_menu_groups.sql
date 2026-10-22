ALTER TABLE public.site_nav_items DROP CONSTRAINT site_nav_slot_check;
DELETE FROM public.site_nav_items;
ALTER TABLE public.site_nav_items ADD CONSTRAINT site_nav_slot_check CHECK (slot = ANY (ARRAY['primary','discover','store']));
INSERT INTO public.site_nav_items (id, slot, to_path, label, icon, position, visible) VALUES
(gen_random_uuid(),'primary','/','Home','Home',1,true),
(gen_random_uuid(),'primary','/artist-dashboard','Artist Dashboard','LayoutDashboard',2,true),
(gen_random_uuid(),'primary','/live','Live Stage','Radio',3,true),
(gen_random_uuid(),'primary','#discover','Discover','Compass',4,true),
(gen_random_uuid(),'primary','#store','Store','ShoppingCart',5,true),
(gen_random_uuid(),'primary','/profile','My Profile','User',6,true),
(gen_random_uuid(),'discover','/discover','Discover Music','Compass',1,true),
(gen_random_uuid(),'discover','/artists','Artists','Music',2,true),
(gen_random_uuid(),'discover','/library','Music Library','Disc3',3,true),
(gen_random_uuid(),'discover','/videos','Videos','Mic',4,true),
(gen_random_uuid(),'discover','/charts','Charts','BarChart3',5,true),
(gen_random_uuid(),'discover','/leaderboard','Leaderboard','Trophy',6,true),
(gen_random_uuid(),'discover','/play','Battle Arena','Radio',7,true),
(gen_random_uuid(),'discover','/blog','Blog','Newspaper',8,true),
(gen_random_uuid(),'discover','/events','Events','Calendar',9,true),
(gen_random_uuid(),'store','/artist-store','Artist Store','Disc3',1,true),
(gen_random_uuid(),'store','/store','Tunevio Store','ShoppingCart',2,true);