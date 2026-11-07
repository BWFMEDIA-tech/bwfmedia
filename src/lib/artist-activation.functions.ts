import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Activate only the caller's artist role; never write profile/auth metadata. */
export const activateMyArtistProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile, error: profileError } = await supabase.from("profiles")
      .select("id").eq("id", userId).maybeSingle();
    if (profileError || !profile) throw new Error("Couldn't load your existing profile. Please try again.");
    const { data: artist, error: roleError } = await supabase.rpc("has_role", { _user_id: userId, _role: "artist" });
    if (roleError) throw new Error("Couldn't verify your artist access. Please try again.");
    if (artist) return { profileId: profile.id };
    const { data: identity, error: identityError } = await supabase.auth.getUser();
    if (identityError || identity.user?.id !== userId || !identity.user.email_confirmed_at) {
      throw new Error("Confirm your email before activating your artist profile.");
    }
    // Existing server-only role grant allowlists artist/host and is idempotent.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("grant_requested_signup_role", {
      _user_id: userId, _meta: { role: "artist" },
    });
    if (error) throw new Error("Couldn't activate your artist profile. Please try again.");
    return { profileId: profile.id };
  });