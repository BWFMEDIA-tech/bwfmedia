import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/access-denied")({
  head: () => ({
    meta: [
      { title: "Access Denied — BWF Network" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccessDenied,
});

function AccessDenied() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#07070d] px-6">
      <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
          <ShieldAlert className="h-7 w-7 text-red-400" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-white">Access Denied</h1>
        <p className="mt-3 text-sm text-white/60">
          You don't have permission to view this area. Stream Studio is
          restricted to BWF administrators.
        </p>
        <p className="mt-2 text-xs text-white/40">
          If you believe this is a mistake, contact a BWF admin.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
          >
            Back to Home
          </Link>
          <Link
            to="/login"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}