import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { listMyStreamPlatformConnections } from "@/lib/stream-platforms.functions";
import { STREAM_PLATFORMS, type StreamPlatformKey } from "@/lib/stream-platforms/registry";

// Renders a compact "Select streaming destinations" list. Tunevio is always
// checked; external platforms are only checkable if the user has connected
// them, otherwise a small "Connect" link is shown pointing to the platforms
// panel that lives on the same page.
export function StreamDestinationSelector({
  selected,
  onChange,
  onWantsConnect,
}: {
  selected: StreamPlatformKey[];
  onChange: (next: StreamPlatformKey[]) => void;
  onWantsConnect?: () => void;
}) {
  const [connected, setConnected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const list = useServerFn(listMyStreamPlatformConnections);

  useEffect(() => {
    (async () => {
      try {
        const rows = (await list()) as { platform: string }[];
        setConnected(rows.map((r) => r.platform));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(key: StreamPlatformKey) {
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white/70">
        Select streaming destinations
      </div>
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked disabled className="h-3.5 w-3.5 accent-[#00E6FF]" />
          <span className="font-semibold">Tunevio</span>
          <span className="text-[10px] uppercase tracking-wider text-white/40">default</span>
        </label>
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading platforms…
          </div>
        ) : (
          STREAM_PLATFORMS.map((p) => {
            const isConnected = connected.includes(p.key);
            const isSelected = selected.includes(p.key);
            return (
              <div key={p.key} className="flex items-center justify-between text-sm">
                <label className={`flex items-center gap-2 ${isConnected ? "" : "text-white/40"}`}>
                  <input
                    type="checkbox"
                    disabled={!isConnected}
                    checked={isSelected}
                    onChange={() => toggle(p.key)}
                    className="h-3.5 w-3.5 accent-[#00E6FF]"
                  />
                  <span>{p.label}</span>
                </label>
                {!isConnected && (
                  <button
                    type="button"
                    onClick={onWantsConnect}
                    className="text-[10px] font-bold uppercase tracking-wider text-[#00E6FF] hover:underline"
                  >
                    Connect
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}