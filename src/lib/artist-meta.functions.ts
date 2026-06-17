import { createServerFn } from "@tanstack/react-start";

export const getArtistMeta = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      const { data: row } = await (supabaseAdmin as any)
        .from("live_queue_public")
        .select("artist_name, photo_url")
        .eq("id", data.id)
        .maybeSingle();
      return {
        name: (row?.artist_name as string | undefined) ?? null,
        photo: (row?.photo_url as string | undefined) ?? null,
      };
    } catch {
      return { name: null as string | null, photo: null as string | null };
    }
  });