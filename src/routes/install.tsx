import { createFileRoute } from "@tanstack/react-router";
import { InstallTunevio } from "@/components/pwa/InstallTunevio";

export const Route = createFileRoute("/install")({
  head: () => ({ meta: [
    { title: "Install Tunevio — iPhone, Android & Desktop" },
    { name: "description", content: "Add Tunevio to your home screen on iPhone, Android or desktop. Music and live sessions require an internet connection." },
    { property: "og:title", content: "Install Tunevio — Your music on your home screen" },
    { property: "og:description", content: "Install Tunevio on supported phones and computers with the existing music, artists and live battles." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: InstallTunevio,
});