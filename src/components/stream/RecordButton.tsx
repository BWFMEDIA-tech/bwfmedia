import { useEffect, useRef, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { Circle, Square, Loader2 } from 'lucide-react';
import { Track } from 'livekit-client';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useServerFn } from '@tanstack/react-start';
import { saveRecording } from '@/lib/recordings.functions';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

interface Props {
  streamId: string;
}

export function RecordButton({ streamId }: Props) {
  const room = useRoomContext();
  const { user } = useAuth();
  const save = useServerFn(saveRecording);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const [state, setState] = useState<'idle' | 'recording' | 'uploading'>('idle');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (state !== 'recording') return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [state]);

  const captureLocalStream = (): MediaStream | null => {
    if (!room?.localParticipant) return null;
    const tracks: MediaStreamTrack[] = [];
    for (const pub of room.localParticipant.trackPublications.values()) {
      if (pub.track && (pub.source === Track.Source.Camera || pub.source === Track.Source.Microphone || pub.source === Track.Source.ScreenShare)) {
        const mst = pub.track.mediaStreamTrack;
        if (mst) tracks.push(mst);
      }
    }
    return tracks.length ? new MediaStream(tracks) : null;
  };

  const start = async () => {
    if (!user) { toast.error('Sign in to record'); return; }
    const stream = captureLocalStream();
    if (!stream) { toast.error('No local camera/mic to record'); return; }
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
    rec.onstop = handleStop;
    rec.start(1000);
    recorderRef.current = rec;
    startedAtRef.current = Date.now();
    setElapsed(0);
    setState('recording');
    toast.success('Recording started');
  };

  const stop = () => {
    recorderRef.current?.stop();
  };

  const handleStop = async () => {
    if (!user) return;
    setState('uploading');
    try {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const duration = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const filename = `${Date.now()}-${streamId}.webm`;
      const path = `${user.id}/${filename}`;
      const { error: upErr } = await supabase.storage
        .from('stream-recordings')
        .upload(path, blob, { contentType: 'video/webm', upsert: false });
      if (upErr) throw upErr;
      await save({ data: {
        streamId,
        storagePath: path,
        durationSeconds: duration,
        sizeBytes: blob.size,
      }});
      toast.success('Recording saved');
    } catch (e: any) {
      toast.error(`Save failed: ${e?.message ?? 'unknown'}`);
    } finally {
      chunksRef.current = [];
      recorderRef.current = null;
      setState('idle');
    }
  };

  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  if (state === 'uploading') {
    return (
      <button disabled className="flex items-center gap-2 rounded-lg border border-white/5 px-3 py-2 text-xs font-medium text-white/70">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
      </button>
    );
  }

  return (
    <button
      onClick={state === 'recording' ? stop : start}
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition',
        state === 'recording'
          ? 'border-red-500/40 bg-red-500/15 text-red-200 hover:bg-red-500/25'
          : 'border-white/5 text-white/80 hover:bg-white/5',
      )}
    >
      {state === 'recording' ? <Square className="h-3.5 w-3.5 fill-current" /> : <Circle className="h-3.5 w-3.5 fill-red-500 text-red-500" />}
      {state === 'recording' ? `Rec ${mmss}` : 'Record'}
    </button>
  );
}