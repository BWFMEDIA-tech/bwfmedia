REVOKE EXECUTE ON FUNCTION public.label_role_of(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_label_access(uuid, uuid, text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.label_manages_artist(uuid, uuid, text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_label(text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.accept_label_invite(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_labels() FROM anon;