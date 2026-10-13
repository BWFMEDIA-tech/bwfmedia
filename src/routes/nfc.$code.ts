// @public-endpoint: NFC tags open this URL. Only redirects to allow-listed internal Tunevio paths.
import { createFileRoute } from "@tanstack/react-router";
import { isSafeNfcPath } from "@/lib/artist-store";

export const Route = createFileRoute("/nfc/$code")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const origin = new URL(request.url).origin;
        const code = String(params.code || "").toLowerCase();
        if (!/^[a-z0-9]{6,32}$/.test(code)) return Response.redirect(`${origin}/artist-store`, 302);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const admin = supabaseAdmin as any;
        const { data } = await admin.from("store_nfc_links").select("id, destination_path, scan_count").eq("code", code).maybeSingle();
        if (!data || !isSafeNfcPath(data.destination_path)) return Response.redirect(`${origin}/artist-store`, 302);
        await admin.from("store_nfc_links").update({ scan_count: (data.scan_count ?? 0) + 1, last_scanned_at: new Date().toISOString() }).eq("id", data.id);
        return new Response(null, { status: 302, headers: { Location: `${origin}${data.destination_path}`, "Cache-Control": "no-store" } });
      },
    },
  },
});
