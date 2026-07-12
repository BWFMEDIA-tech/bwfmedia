import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const oauth = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<{
      data: {
        client?: { name?: string } | null;
        redirect_url?: string;
        redirect_to?: string;
      } | null;
      error: { message: string } | null;
    }>;
    approveAuthorization: (id: string) => Promise<{
      data: { redirect_url?: string; redirect_to?: string } | null;
      error: { message: string } | null;
    }>;
    denyAuthorization: (id: string) => Promise<{
      data: { redirect_url?: string; redirect_to?: string } | null;
      error: { message: string } | null;
    }>;
  };
}).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id:
      typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/login", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get(
      "authorization_id",
    )!;
    const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="max-w-lg mx-auto p-8 text-center">
      <h1 className="text-xl font-semibold mb-2">Authorization error</h1>
      <p className="text-sm text-muted-foreground">
        {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an app";

  return (
    <main className="max-w-lg mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-3">
        Connect {clientName} to your Tunevio account
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        This will let {clientName} call Tunevio MCP tools as you.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive mb-4">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          disabled={busy}
          onClick={() => decide(true)}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
        >
          Approve
        </button>
        <button
          disabled={busy}
          onClick={() => decide(false)}
          className="px-4 py-2 rounded-md border disabled:opacity-50"
        >
          Deny
        </button>
      </div>
    </main>
  );
}