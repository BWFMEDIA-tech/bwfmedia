import { createFileRoute } from "@tanstack/react-router";
import { DollarSign } from "lucide-react";
import { StudioStub } from "@/components/stream/StudioStub";

export const Route = createFileRoute("/earnings")({
  head: () => ({
    meta: [
      { title: "Earnings — BWF Network" },
      { name: "description", content: "Tips, super chats, payouts, and revenue across your streams." },
    ],
  }),
  component: () => (
    <StudioStub
      icon={DollarSign}
      title="Earnings"
      blurb="Track tips, super chats, and stream revenue. Manage payouts and tax info from one dashboard."
    />
  ),
});