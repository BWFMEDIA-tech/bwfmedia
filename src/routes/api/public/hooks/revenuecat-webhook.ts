import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// RevenueCat sends the value configured as "Authorization header value" in its webhook settings.
const EventSchema = z.object({
  event: z
    .object({
      id: z.string().max(200).optional(),
      type: z.string().max(100),
      app_user_id: z.string().max(200).optional(),
    })
    .passthrough(),
  api_version: z.string().max(20).optional(),
});

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/hooks/revenuecat-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
        if (!secret) return new Response("Webhook not configured", { status: 503 });
        const header = request.headers.get("authorization") ?? "";
        const token = header.replace(/^Bearer\s+/i, "");
        if (!safeEqual(token, secret)) return new Response("Unauthorized", { status: 401 });

        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsed = EventSchema.safeParse(json);
        if (!parsed.success) return new Response("Invalid payload", { status: 400 });

        // Events are acknowledged only; membership syncing is not wired up yet.
        return Response.json({ received: true, type: parsed.data.event.type });
      },
    },
  },
});
