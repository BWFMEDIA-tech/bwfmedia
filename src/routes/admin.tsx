import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — BWF Network" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Login route bypasses the shell (requires no auth to sign in).
  if (pathname === "/admin/login") return <Outlet />;
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}