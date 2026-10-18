import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Check, ImageIcon, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { updateStreamThumbnail } from "@/lib/streams.functions";
import { streamThumbnailPath } from "@/lib/stream-thumbnail";
import { signVideoPaths } from "@/lib/video-sign.functions";
import { cn } from "@/lib/utils";

import discoverHero from "@/assets/discover-hero.jpg.asset.json";
import musicVideo from "@/assets/music-video.jpg.asset.json";
import audience from "@/assets/audience.jpg.asset.json";
import viralThumbs from "@/assets/viral-thumbs.jpg.asset.json";
import streamHost from "@/assets/stream-host.jpg.asset.json";
import grungeBg from "@/assets/grunge-bg.jpg.asset.json";
import bwfJoinBg from "@/assets/bwf-join-bg.jpeg.asset.json";

const PRESETS: Array<{ label: string; url: string }> = [
  { label: "Discover", url: discoverHero.url },
  { label: "Music Video", url: musicVideo.url },
  { label: "Audience", url: audience.url },
  { label: "Viral", url: viralThumbs.url },
  { label: "Host", url: streamHost.url },
  { label: "Grunge", url: grungeBg.url },
  { label: "Join", url: bwfJoinBg.url },
];

export function StreamThumbnailDialog({
  open,
  onOpenChange,
  streamId,
  currentUrl,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  streamId: string | null;
  currentUrl: string | null;
  onSaved?: (url: string | null) => void;
}) {
  const auth = useAuth();
  const updateFn = useServerFn(updateStreamThumbnail);
  const signFn = useServerFn(signVideoPaths);
  const [preview, setPreview] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(currentUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) setSelected(currentUrl); }, [open, currentUrl, streamId]);
  useEffect(() => {
    const path = selected ? streamThumbnailPath(selected) : null;
    if (!path) { setPreview(selected); return; }
    let cancelled = false;
    setPreview(null);
    signFn({ data: { paths: [path] } }).then(({ results }) => {
      if (!cancelled) setPreview(results[path] ?? null);
    }).catch(() => { if (!cancelled) toast.error("Couldn't load thumbnail preview"); });
    return () => { cancelled = true; };
  }, [selected, signFn]);

  const onUpload = async (file: File) => {
    if (!auth.user) return toast.error("Sign in required");
    if (!streamId) return toast.error("Start the stream first");
    if (!file.type.startsWith("image/")) return toast.error("Image files only");
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5 MB");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${auth.user.id}/stream-thumbnails/${streamId}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("videos").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("videos").getPublicUrl(path);
      setSelected(data.publicUrl);
      toast.success("Uploaded — click Save to apply");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    if (!streamId) return;
    setSaving(true);
    try {
      const saved = await updateFn({ data: { streamId, thumbnailUrl: selected } });
      toast.success("Thumbnail updated");
      onSaved?.(saved.thumbnailUrl);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" /> Stream Thumbnail
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Pick a preset or upload your own image. Shown on the Live page and shares.
          </DialogDescription>
        </DialogHeader>

        {/* Preview */}
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
          {preview ? (
            <img src={preview} alt="Selected thumbnail" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
              {selected ? "Loading thumbnail…" : "No thumbnail selected"}
            </div>
          )}
        </div>

        {/* Presets */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Presets</div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {PRESETS.map((p) => {
              const active = selected === p.url;
              return (
                <Button
                  variant="ghost"
                  aria-label={p.label}
                  disabled={saving || uploading}
                  key={p.url}
                  type="button"
                  onClick={() => setSelected(p.url)}
                  className={cn(
                    "group relative h-auto p-0 aspect-video overflow-hidden rounded-md border transition",
                    active ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/30",
                  )}
                >
                  <img src={p.url} alt={p.label} className="h-full w-full object-cover" />
                  {active && (
                    <div className="absolute right-1 top-1 rounded-full bg-primary p-1">
                      <Check className="h-3 w-3 text-foreground" />
                    </div>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Upload */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={saving || uploading || !streamId}
            className="border-border bg-muted text-foreground hover:bg-muted"
          >
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload custom
          </Button>
          {selected && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelected(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Clear
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={saving || uploading || !streamId}
              className="bg-primary text-foreground hover:opacity-90"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>

        {!streamId && (
          <p className="text-xs text-muted-foreground">Go live first to attach a thumbnail to this stream.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}