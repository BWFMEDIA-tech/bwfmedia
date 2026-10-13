import { createFileRoute, Link } from "@tanstack/react-router";
import { getPublicPage } from "@/lib/nfc-pages.functions";
import { NfcPagePreview } from "@/components/store/NfcPagePreview";

export const Route = createFileRoute("/p/$code")({
  loader: async ({ params }) => {
    const code = String(params.code).toLowerCase();
    if (!/^[a-z0-9]{6,32}$/.test(code)) return { page: null };
    return getPublicPage({ data: { code } });
  },
  head: ({ loaderData }) => {
    const title = loaderData?.page ? `${loaderData.page.name} — Tunevio` : "Tunevio NFC page";
    const desc = loaderData?.page?.artistName ? `Music and exclusives from ${loaderData.page.artistName} on Tunevio.` : "Tap-to-open music experience on Tunevio.";
    return { meta: [
      { title }, { name: "description", content: desc },
      { property: "og:title", content: title }, { property: "og:description", content: desc },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ] };
  },
  component: PublicPage,
});

function PublicPage() {
  const { page } = Route.useLoaderData();
  if (!page) return <main className="mx-auto max-w-md px-4 py-20 text-center"><h1 className="text-xl font-bold">This page isn't available</h1><Link to="/" className="mt-4 inline-block text-sm text-primary">Go to Tunevio</Link></main>;
  return (
    <main className="mx-auto w-full max-w-md pb-24">
      <NfcPagePreview full name={page.name} tabs={page.tabs as any} artistName={page.artistName} />
      <div className="p-4 text-center"><Link to="/artist/$id" params={{ id: page.artistId }} className="text-sm font-semibold text-primary">More from {page.artistName ?? "this artist"} on Tunevio</Link></div>
    </main>
  );
}
