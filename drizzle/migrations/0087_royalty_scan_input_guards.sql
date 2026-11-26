CREATE OR REPLACE FUNCTION public.save_royalty_catalog_scan(p_track_ids uuid[],p_findings jsonb,p_coverage jsonb,p_track_id uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid; uid uuid:=auth.uid(); item jsonb;
BEGIN
 IF uid IS NULL OR NOT (public.has_role(uid,'artist') OR public.has_role(uid,'admin')) THEN RAISE EXCEPTION 'Artist access required'; END IF;
 IF p_track_ids IS NULL OR p_findings IS NULL OR jsonb_typeof(p_findings) IS DISTINCT FROM 'array' OR p_coverage IS NULL OR jsonb_typeof(p_coverage) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid scan input'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(p_track_ids) t(id) WHERE NOT EXISTS(SELECT 1 FROM public.play_tracks p WHERE p.id=t.id AND p.artist_user_id=uid)) THEN RAISE EXCEPTION 'Catalog ownership required'; END IF;
 IF p_track_id IS NOT NULL AND (p_track_id=ANY(p_track_ids)) IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'Invalid rescan track'; END IF;
 INSERT INTO public.royalty_catalog_scans(user_id,track_id,total_tracks_scanned,findings_count,coverage) VALUES(uid,p_track_id,cardinality(p_track_ids),jsonb_array_length(p_findings),p_coverage) RETURNING id INTO sid;
 FOR item IN SELECT value FROM jsonb_array_elements(p_findings) LOOP
 IF ((item->>'track_id')::uuid=ANY(p_track_ids)) IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'Finding outside catalog'; END IF;
 INSERT INTO public.royalty_scan_findings(scan_id,user_id,track_id,song_title,artist_name,organization,issue_type,evidence,recommended_action) VALUES(sid,uid,(item->>'track_id')::uuid,item->>'song_title',item->>'artist_name',item->>'organization',item->>'issue_type',item->>'evidence',item->>'recommended_action');
 END LOOP;
 RETURN sid;
END $$;
REVOKE ALL ON FUNCTION public.save_royalty_catalog_scan(uuid[],jsonb,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_royalty_catalog_scan(uuid[],jsonb,jsonb,uuid) TO authenticated;