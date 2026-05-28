import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon } from "lucide-react";
import { StudioStub } from "@/components/stream/StudioStub";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — BWF Network" },
      { name: "description", content: "Profile, account, devices, and stream preferences." },
    ],
  }),
  component: () => (
    <StudioStub
      icon={SettingsIcon}
      title="Settings"
      blurb="Profile, devices, stream defaults, payouts, and privacy controls — all configurable here."
    />
  ),
});