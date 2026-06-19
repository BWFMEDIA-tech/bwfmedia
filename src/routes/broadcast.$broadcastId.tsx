import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { getBroadcast } from "@/lib/broadcasts.functions";
import { Radio, Eye, Users, Tv } from "lucide-react";

export const Route = createFileRoute("/broadcast/$broadcastId")({
  loader: async ({ params }) => {
    const broadcast = await getBroadcast({ data: { id: params.broadcastId } });
    if (!broadcast) throw notFound();
    return { broadcast };
  },
  head: ({ loaderData }) => {
    const b = loaderData?.broadcast;
    const title = b ? `${b.stream_title} — BWF Live` : "BWF Live Broadcast";
    const desc = b?.description ?? "Watch live on BWF Network.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "video.other" },
      ],
    };
  },
  errorComponent: ({ error, reset }) => (
    <div className="grid min-h-screen place-items-center bg-black text-white p-8">
      <div className="max-w-md text-center">
        <h1 className="mb-2 text-xl font-bold">Broadcast unavailable</h1>
        <p className="mb-4 text-sm text-white/60">{(error as Error).message}</p>
        <button onClick={reset} className="rounded bg-white/10 px-4 py-2 text-sm hover:bg-white/20">Retry</button>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-black text-white">
      <p>Broadcast not found.</p>
    </div>
  ),
  component: BroadcastViewerPage,
});

type PlaybackSource =
  | { kind: "stage"; stage_room_ids: string[] }
  | { kind: "upload"; asset_url: string }
  | { kind: "prerecord"; recording_id: string };

function BroadcastViewerPage() {
  const { broadcast } = Route.useLoaderData();
  const source = broadcast.playback_source as PlaybackSource;
  const isLive = broadcast.stream_status === "live";

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="flex items-center justify-between border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <Tv className="h-5 w-5 text-blue-400" />
          <div>
            <h1 className="text-sm font-bold tracking-widest">{broadcast.stream_title}</h1>
            <p className="text-[10px] uppercase tracking-widest text-white/40 flex items-center gap-2">
              {isLive ? (
                <>
                  <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  Live
                </>
              ) : (
                broadcast.stream_status
              )}
              <span>·</span>
              <Eye className="h-3 w-3" /> {broadcast.viewer_count}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        {/* Player surface */}
        <div className="mb-4 aspect-video rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d0d18] to-[#16162a] grid place-items-center">
          {source.kind === "upload" ? (
            <video src={source.asset_url} controls className="h-full w-full rounded-2xl" />
          ) : (
            <div className="text-center text-white/40">
              <Radio className="mx-auto mb-2 h-8 w-8" />
              <div className="text-xs font-semibold tracking-widest">
                {isLive ? "STREAM LIVE" : "STREAM OFFLINE"}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-widest">
                source: {source.kind}
              </div>
            </div>
          )}
        </div>

        {broadcast.description && (
          <p className="mb-4 text-sm text-white/70">{broadcast.description}</p>
        )}

        {/* Linked stage rooms */}
        {source.kind === "stage" && source.stage_room_ids.length > 0 && (
          <section className="rounded-xl border border-white/10 bg-[#0d0d18] p-4">
            <h3 className="mb-3 flex items-center gap-2 text-[10px] font-bold tracking-widest text-white/60">
              <Users className="h-3.5 w-3.5" /> LINKED STAGES
            </h3>
            <ul className="space-y-2">
              {source.stage_room_ids.map((sid) => (
                <li key={sid}>
                  <Link
                    to="/stage/$roomId"
                    params={{ roomId: sid }}
                    className="block rounded border border-white/10 bg-white/5 px-3 py-2 text-xs font-mono text-white/80 hover:bg-white/10"
                  >
                    {sid}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}