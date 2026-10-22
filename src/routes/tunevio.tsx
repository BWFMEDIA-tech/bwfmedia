import { createFileRoute, redirect } from "@tanstack/react-router";

// The pre-launch waitlist page is retired; the public landing page now lives
// at the root. Keep this URL working for existing blog and shared links.
export const Route = createFileRoute("/tunevio")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
