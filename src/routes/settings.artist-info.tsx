import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/settings/artist-info")({
  head: () => ({ meta: [
    { title: "Artist Information | Tunevio" },
    { name: "description", content: "Update your existing Tunevio artist information." },
    { property: "og:title", content: "Artist Information | Tunevio" },
    { property: "og:description", content: "Update your existing Tunevio artist information." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  beforeLoad: () => { throw redirect({ to: "/settings/profile" }); },
});