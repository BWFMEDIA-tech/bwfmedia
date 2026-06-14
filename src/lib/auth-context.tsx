import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "manager" | "host" | "artist" | "moderator" | "member";

export interface AuthState {
  loading: boolean;
  rolesLoading: boolean;
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
  const [rolesLoading, setRolesLoading] = useState(true);
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) {
        setRoles([]);
        setProfile(null);
        setRolesLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (!data.session) setRolesLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    const uid = session.user.id;
    setRolesLoading(true);
    let cancelled = false;
    const MAX_ATTEMPTS = 5;

    const fetchRoles = async () => {
      let lastRoles: AppRole[] = [];
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        if (cancelled) return;
        const [rolesRes, profileRes] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", uid),
          supabase.from("profiles").select("display_name, avatar_url").eq("id", uid).maybeSingle(),
        ]);
        if (cancelled) return;

        if (profileRes.data) setProfile(profileRes.data as any);

        if (!rolesRes.error && rolesRes.data) {
          lastRoles = rolesRes.data.map((r: any) => r.role as AppRole);
          if (lastRoles.length > 0 || attempt === MAX_ATTEMPTS) {
            setRoles(lastRoles);
            setRolesLoading(false);
            return;
          }
        } else if (attempt === MAX_ATTEMPTS) {
          console.warn("[auth] role fetch failed after retries", rolesRes.error);
          setRoles(lastRoles);
          setRolesLoading(false);
          return;
        }

        // exponential backoff: 150, 300, 600, 1200ms
        const delay = 150 * 2 ** (attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    };

    void fetchRoles();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const user = session?.user ?? null;
  return {
    loading,
    rolesLoading,
    session,
    user,
    displayName: profile?.display_name || user?.email?.split("@")[0] || "Guest",
    avatarUrl: profile?.avatar_url ?? null,
    roles,
    isAuthenticated: !!user,
    signOut: async () => { await supabase.auth.signOut(); },
  };
}