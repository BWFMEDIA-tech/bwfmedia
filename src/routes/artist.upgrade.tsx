import { createFileRoute, redirect } from "@tanstack/react-router";

// The Artist Membership upgrade page was removed. Plans now live on /pricing.
export const Route = createFileRoute("/artist/upgrade")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  beforeLoad: () => {
    throw redirect({ to: "/pricing" });
  },
});
