import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "host" | "artist" | "moderator" | "member";

export interface AuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  displayName: string;
  avatarUrl: string | null;
  roles: AppRole[];
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) {
        setRoles([]);
        setProfile(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    const uid = session.user.id;
    Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("profiles").select("display_name, avatar_url").eq("id", uid).maybeSingle(),
    ]).then(([rolesRes, profileRes]) => {
      if (rolesRes.data) setRoles(rolesRes.data.map((r: any) => r.role as AppRole));
      if (profileRes.data) setProfile(profileRes.data as any);
    });
  }, [session?.user?.id]);

  const user = session?.user ?? null;
  return {
    loading,
    session,
    user,
    displayName: profile?.display_name || user?.email?.split("@")[0] || "Guest",
    avatarUrl: profile?.avatar_url ?? null,
    roles,
    isAuthenticated: !!user,
    signOut: async () => { await supabase.auth.signOut(); },
  };
}