import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/artist-store")({
  component: () => <Outlet />,
});
