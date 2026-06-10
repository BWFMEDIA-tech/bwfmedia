import { useMediaDeviceSelect } from "@livekit/components-react";
import { Mic, Volume2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Compact mic + speaker selector. Renders inside a LiveKitRoom and uses
 * LiveKit's useMediaDeviceSelect so changes are applied live without a
 * reconnect. Speaker selector hides on browsers that don't support
 * `setSinkId` (e.g. Safari/Firefox) — mic selector still works there.
 */
export function DeviceSelector({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DeviceDropdown kind="audioinput" icon={<Mic className="h-3.5 w-3.5" />} label="Mic" compact={compact} />
      <DeviceDropdown kind="audiooutput" icon={<Volume2 className="h-3.5 w-3.5" />} label="Speaker" compact={compact} />
    </div>
  );
}

function DeviceDropdown({
  kind,
  icon,
  label,
  compact,
}: {
  kind: "audioinput" | "audiooutput";
  icon: React.ReactNode;
  label: string;
  compact?: boolean;
}) {
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind });

  // Hide speaker selector when the browser can't switch output sinks.
  if (kind === "audiooutput") {
    const supported =
      typeof window !== "undefined" &&
      typeof (HTMLMediaElement?.prototype as any)?.setSinkId === "function";
    if (!supported) return null;
  }

  if (!devices || devices.length === 0) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-white/5 px-2.5 py-2 text-[11px] text-white/40">
        {icon}
        <span>No {label.toLowerCase()}</span>
      </div>
    );
  }

  return (
    <label className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5 text-[11px] text-white/80 hover:bg-white/5">
      <span className="flex items-center gap-1 text-white/60">
        {icon}
        {!compact && <span>{label}</span>}
      </span>
      <select
        value={activeDeviceId ?? devices[0]?.deviceId}
        onChange={async (e) => {
          try {
            await setActiveMediaDevice(e.target.value);
            toast.success(`${label} switched`);
          } catch (err: any) {
            toast.error(err?.message || `Couldn't switch ${label.toLowerCase()}`);
          }
        }}
        className="max-w-[160px] truncate rounded bg-transparent text-[11px] text-white outline-none [&>option]:bg-[#0d0d18]"
        aria-label={`Select ${label.toLowerCase()}`}
      >
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || `${label} ${d.deviceId.slice(0, 4)}`}
          </option>
        ))}
      </select>
    </label>
  );
}