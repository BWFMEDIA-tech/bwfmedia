import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/profile")({
  beforeLoad: () => {
    throw redirect({
      to: "/artist/$id",
      params: { id: "ba0e0345-a5ed-45fc-af08-18d534192f04" },
      replace: true,
      statusCode: 301,
    });
  },
  head: () => ({
    meta: [
      { title: "Artist Profile — Tunevio" },
      { name: "description", content: "Visit the artist profile on Tunevio." },
      { property: "og:title", content: "Artist Profile — Tunevio" },
      { property: "og:description", content: "Visit the artist profile on Tunevio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
