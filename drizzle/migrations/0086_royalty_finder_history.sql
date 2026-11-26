CREATE TABLE public.royalty_catalog_scans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
 track_id uuid REFERENCES public.play_tracks(id) ON DELETE SET NULL,
 total_tracks_scanned integer NOT NULL CHECK(total_tracks_scanned >= 0),
 findings_count integer NOT NULL CHECK(findings_count >= 0),
 coverage jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,user_id)
);
GRANT SELECT ON public.royalty_catalog_scans TO authenticated;
GRANT ALL ON public.royalty_catalog_scans TO service_role;
ALTER TABLE public.royalty_catalog_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_scan_read ON public.royalty_catalog_scans FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE INDEX royalty_scans_owner_time ON public.royalty_catalog_scans(user_id,created_at DESC);
CREATE TABLE public.royalty_scan_findings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), scan_id uuid NOT NULL, user_id uuid NOT NULL,
 track_id uuid REFERENCES public.play_tracks(id) ON DELETE SET NULL,
 song_title text NOT NULL, artist_name text NOT NULL,
 organization text NOT NULL CHECK(organization IN ('catalog','copyright_office','ascap','bmi','songtrust','soundexchange','mlc')),
 issue_type text NOT NULL, evidence text NOT NULL, recommended_action text NOT NULL,
 source text NOT NULL DEFAULT 'Tunevio catalog metadata' CHECK(source='Tunevio catalog metadata'),
 match_confidence numeric CHECK(match_confidence IS NULL),
 resolved boolean NOT NULL DEFAULT false, resolved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(scan_id,user_id) REFERENCES public.royalty_catalog_scans(id,user_id) ON DELETE CASCADE
);
GRANT SELECT ON public.royalty_scan_findings TO authenticated;
GRANT UPDATE(resolved) ON public.royalty_scan_findings TO authenticated;
GRANT ALL ON public.royalty_scan_findings TO service_role;
ALTER TABLE public.royalty_scan_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_finding_read ON public.royalty_scan_findings FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY own_finding_resolve ON public.royalty_scan_findings FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE INDEX royalty_findings_scan ON public.royalty_scan_findings(user_id,scan_id);
CREATE FUNCTION public.royalty_finding_resolution_time() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.resolved_at:=CASE WHEN NEW.resolved THEN now() ELSE NULL END; RETURN NEW; END $$;
CREATE TRIGGER royalty_finding_resolution BEFORE UPDATE ON public.royalty_scan_findings FOR EACH ROW EXECUTE FUNCTION public.royalty_finding_resolution_time();
CREATE FUNCTION public.save_royalty_catalog_scan(p_track_ids uuid[],p_findings jsonb,p_coverage jsonb,p_track_id uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid; uid uuid:=auth.uid(); item jsonb;
BEGIN
 IF uid IS NULL OR NOT (public.has_role(uid,'artist') OR public.has_role(uid,'admin')) THEN RAISE EXCEPTION 'Artist access required'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(p_track_ids) t(id) WHERE NOT EXISTS(SELECT 1 FROM public.play_tracks p WHERE p.id=t.id AND p.artist_user_id=uid)) THEN RAISE EXCEPTION 'Catalog ownership required'; END IF;
 IF p_track_id IS NOT NULL AND NOT (p_track_id=ANY(p_track_ids)) THEN RAISE EXCEPTION 'Invalid rescan track'; END IF;
 INSERT INTO public.royalty_catalog_scans(user_id,track_id,total_tracks_scanned,findings_count,coverage) VALUES(uid,p_track_id,cardinality(p_track_ids),jsonb_array_length(p_findings),p_coverage) RETURNING id INTO sid;
 FOR item IN SELECT value FROM jsonb_array_elements(p_findings) LOOP
 IF NOT ((item->>'track_id')::uuid=ANY(p_track_ids)) THEN RAISE EXCEPTION 'Finding outside catalog'; END IF;
 INSERT INTO public.royalty_scan_findings(scan_id,user_id,track_id,song_title,artist_name,organization,issue_type,evidence,recommended_action) VALUES(sid,uid,(item->>'track_id')::uuid,item->>'song_title',item->>'artist_name',item->>'organization',item->>'issue_type',item->>'evidence',item->>'recommended_action');
 END LOOP;
 RETURN sid;
END $$;
REVOKE ALL ON FUNCTION public.save_royalty_catalog_scan(uuid[],jsonb,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_royalty_catalog_scan(uuid[],jsonb,jsonb,uuid) TO authenticated;
