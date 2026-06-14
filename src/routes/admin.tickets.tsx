import { createFileRoute } from "@tanstack/react-router";
import { LifeBuoy } from "lucide-react";
import { SectionPage, EmptyState } from "@/components/admin/SectionPage";

export const Route = createFileRoute("/admin/tickets")({
  head: () => ({ meta: [{ title: "Support Tickets — Admin" }, { name: "robots", content: "noindex" }] }),
  component: TicketsAdmin,
});

function TicketsAdmin() {
  return (
    <SectionPage title="Support Tickets" subtitle="Customer support queue.">
      <EmptyState icon={LifeBuoy} title="Support tickets coming soon" hint="No ticketing table yet — wire one up to start logging support requests." />
    </SectionPage>
  );
}