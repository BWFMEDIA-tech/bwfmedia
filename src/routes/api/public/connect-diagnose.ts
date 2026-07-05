// @public-endpoint: TEMPORARY token-gated Stripe Connect diagnostic. Proves
// whether the platform's Stripe connection can use Connect endpoints
// (accounts.list / accounts.create via the Lovable gateway). Returns only
// ok-flags and Stripe error text — never keys. REMOVE after diagnosis.
import { createFileRoute } from "@tanstack/react-router";

const DIAG_TOKEN = "tvo-connect-diag-7f3a9c2e51b84d06";

export const Route = createFileRoute("/api/public/connect-diagnose")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("token") !== DIAG_TOKEN) {
          return new Response("Not found", { status: 404 });
        }
        const { createStripeClient, getStripeErrorMessage } = await import(
          "@/lib/stripe.server"
        );
        const out: Record<string, unknown> = {};
        const stripe = createStripeClient("live");

        try {
          const list = await stripe.accounts.list({ limit: 1 });
          out.accounts_list = { ok: true, existing: list.data.length };
        } catch (e) {
          out.accounts_list = { ok: false, error: getStripeErrorMessage(e) };
        }

        try {
          const acct = await stripe.accounts.create({
            type: "express",
            capabilities: { transfers: { requested: true } },
            metadata: { diagnostic: "true", created_by: "connect-diagnose" },
          });
          out.accounts_create = { ok: true, id: acct.id };
          try {
            const del = await stripe.accounts.del(acct.id);
            out.cleanup = { deleted: !!del.deleted };
          } catch (e) {
            out.cleanup = { deleted: false, error: getStripeErrorMessage(e) };
          }
        } catch (e) {
          out.accounts_create = { ok: false, error: getStripeErrorMessage(e) };
        }

        return Response.json(out);
      },
    },
  },
});
