import { createFileRoute } from "@tanstack/react-router";
import { AccountOverview } from "@/components/settings/AccountOverview";

export const Route = createFileRoute("/settings/")({
  head: () => ({ meta: [
    { title: "Your Account — Tunevio" },
    { name: "description", content: "Your Tunevio profile, preferences, subscriptions and creator tools." },
    { property: "og:title", content: "Your Account — Tunevio" },
    { property: "og:description", content: "Manage your Tunevio account and existing creator tools." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: AccountOverview,
});