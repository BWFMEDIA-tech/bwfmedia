import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useMaybeRoomContext, useTracks, useParticipants, VideoTrack, useLocalParticipant } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Camera, CameraOff, Eye, ThumbsUp, Trophy, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SignedImg } from '@/components/ui/signed-img';
import { StageAudioShell } from '@/components/stream/StageAudioShell';
import { SelfMicrophoneButton } from '@/components/stream/SelfMicrophoneButton';
import { useAuth } from '@/lib/auth-context';
import { getLiveKitToken } from '@/lib/livekit.functions';
import { getFreestyleState, startFreestyle, voteFreestyle, endFreestyle, cancelFreestyle, getFreestyleQueue } from '@/lib/freestyle.functions';
import { FreestyleQueue } from './FreestyleQueue';
import { supabase } from '@/integrations/supabase/client';

type Props = { streamId: string; hostId: string; room?: string; participants: { user_id: string; display_name: string | null; stage_role?: string | null }[] };

export function FreestyleBattle(props: Props) {
  const existingRoom = useMaybeRoomContext();
  const auth = useAuth();
  const tokenFn = useServerFn(getLiveKitToken);
  const [connection, setConnection] = useState<{ token: string; wsUrl: string } | null>(null);
  const [joining, setJoining] = useState(false);
  if (existingRoom) return <FreestyleContent {...props} />;
  if (connection && auth.user) return <StageAudioShell token={connection.token} serverUrl={connection.wsUrl} streamId={props.streamId} userId={auth.user.id} isHost={auth.user.id === props.hostId} showHostTools={false} autoConnect arenaAudio onLeave={() => setConnection(null)}><FreestyleContent {...props} /></StageAudioShell>;
  return <>
    <FreestyleContent {...props} />
    <div className="mt-4 flex justify-center">
      <Button disabled={joining || !props.room || !auth.user} onClick={async () => {
        if (!props.room) return;
        setJoining(true);
        try { setConnection(await tokenFn({ data: { roomName: props.room } })); }
        catch (error) { toast.error(error instanceof Error ? error.message : 'Could not join live video'); }
        finally { setJoining(false); }
      }}><Radio />{joining ? 'Connecting…' : auth.user ? 'Join live video' : 'Sign in to watch and vote'}</Button>
    </div>
  </>;
}

function FreestyleContent({ streamId, hostId, participants }: Props) {
  const auth = useAuth();
  const room = useMaybeRoomContext();
  const queryClient = useQueryClient();
  const read = useServerFn(getFreestyleState);
  const start = useServerFn(startFreestyle);
  const vote = useServerFn(voteFreestyle);
  const end = useServerFn(endFreestyle);
  const cancel = useServerFn(cancelFreestyle);
  const queueRead = useServerFn(getFreestyleQueue);
  const queue = useQuery({ queryKey: ['freestyle-queue', auth.user?.id], queryFn: () => queueRead(), enabled: !!auth.user });
  const key = ['freestyle', streamId, auth.user?.id];
  const state = useQuery({ queryKey: key, queryFn: () => read({ data: { streamId } }), enabled: !!auth.user, refetchInterval: 5000 });
  const battle = state.data?.battle;
  const [now, setNow] = useState(0);
  const [clockOffset, setClockOffset] = useState(0);
  useEffect(() => { if (state.data) setClockOffset(state.data.serverTime - Date.now()); }, [state.data]);
  const [artistA, setArtistA] = useState('');
  const [artistB, setArtistB] = useState('');
  const [duration, setDuration] = useState(180);
  const [busy, setBusy] = useState(false);
  const isHost = queue.data?.isAdmin || (queue.data?.isHost && auth.user?.id === hostId);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick(); const timer = setInterval(tick, 250); return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!auth.user) return;
    const channel = supabase.channel(`freestyle-${streamId}-${crypto.randomUUID()}`).on('postgres_changes', { event: '*', schema: 'public', table: 'freestyle_battles', filter: `stream_id=eq.${streamId}` }, () => { void queryClient.invalidateQueries({ queryKey: ['freestyle', streamId] }); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [streamId, auth.user?.id, queryClient]);
  const remaining = battle ? Math.max(0, Math.ceil((Date.parse(battle.ends_at) - now - clockOffset) / 1000)) : duration;
  useEffect(() => {
    if (battle?.status === 'live' && remaining === 0) void queryClient.invalidateQueries({ queryKey: ['freestyle', streamId] });
  }, [battle?.id, battle?.status, remaining === 0, streamId, queryClient]);
  const open = battle?.status === 'live' && remaining > 0;
  const selected = state.data?.myVote;
  const artists = state.data?.artists ?? [];
  const candidates = participants.filter(p => ['host', 'co_host', 'speaker'].includes(p.stage_role ?? ''));
  const action = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); await state.refetch(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Please try again'); }
    finally { setBusy(false); }
  };
  return <section className="freestyle-arena" aria-label="1v1 Freestyle Battle">
    <header className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="min-w-0"><h2 className="text-xl font-bold sm:text-3xl">1v1 <span className="text-primary">Freestyle</span> Battle</h2><p className="mt-1 text-xs text-muted-foreground">{battle ? battle.status === 'cancelled' ? 'Battle cancelled' : open ? 'Live freestyle' : battle.status === 'completed' ? 'Final result' : 'Validating final votes…' : 'Waiting for the host to start'}</p></div>
      <div className="text-center"><p className="text-[10px] uppercase text-muted-foreground">Time remaining</p><p className="font-mono text-2xl font-bold tabular-nums">{String(Math.floor(remaining / 60)).padStart(2, '0')}:{String(remaining % 60).padStart(2, '0')}</p></div>
    </header>
    {state.isError && <p role="alert" className="mb-3 text-sm text-destructive">Could not load the battle. <Button variant="link" onClick={() => void state.refetch()}>Retry</Button></p>}
    {battle?.status === 'completed' && <div className="mb-4 flex items-center justify-center gap-2 border-y border-border py-3 font-bold"><Trophy className="text-primary" />{battle.winner_id ? `${artists.find(p => p.id === battle.winner_id)?.stage_name || artists.find(p => p.id === battle.winner_id)?.display_name || 'Artist'} wins` : 'Draw'} · {battle.votes_a} – {battle.votes_b}</div>}
    <div className="freestyle-grid">
      {(['a', 'b'] as const).map(side => {
        const id = side === 'a' ? battle?.artist_a_id : battle?.artist_b_id;
        const artist = artists.find(p => p.id === id);
        const name = artist?.stage_name || artist?.display_name || `Artist ${side.toUpperCase()}`;
        const total = side === 'a' ? battle?.votes_a ?? 0 : battle?.votes_b ?? 0;
        return <div key={side} className="freestyle-side min-w-0" data-side={side}>
          <div className="freestyle-frame">
            {room ? <ArtistCamera artistId={id} name={name} photo={artist?.avatar_url} hostId={hostId} artistA={battle?.artist_a_id} artistB={battle?.artist_b_id} /> : <div className="freestyle-camera grid place-items-center bg-muted">{artist?.avatar_url ? <SignedImg src={artist.avatar_url} alt={name} className="h-full w-full object-contain" /> : <CameraOff className="h-10 w-10 text-muted-foreground" />}</div>}
            <span className="freestyle-label">Artist {side.toUpperCase()}</span>
            <div className="flex min-w-0 items-center gap-3 p-3">{artist?.avatar_url && <SignedImg src={artist.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />}<div className="min-w-0"><p className="break-words font-bold">{name}</p><p className="text-xs text-muted-foreground">{artist?.genres?.join(' · ') || artist?.genre || '—'}</p></div></div>
          </div>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Button className="freestyle-vote h-14 whitespace-normal text-sm font-bold" disabled={!open || !!selected || busy || !auth.user} onClick={() => { if (battle) void action(() => vote({ data: { battleId: battle.id, choice: side } })); }}><ThumbsUp />{selected === side ? 'Vote submitted' : selected ? 'Voting complete' : `Vote for Artist ${side.toUpperCase()}`}</Button>
            <div className="freestyle-count min-w-20 px-3 py-1 text-center"><p className="text-xl font-bold tabular-nums" aria-live="polite">{total}</p><p className="text-[10px] uppercase text-muted-foreground">Votes</p></div>
          </div>
        </div>;
      })}
      <div className="freestyle-vs" aria-hidden="true">VS</div>
    </div>
    {room && <LocalCameraControl artistIds={open ? [battle?.artist_a_id, battle?.artist_b_id] : candidates.map(p => p.user_id)} />}
    {!auth.user && <p className="mt-3 text-center text-sm text-muted-foreground">Sign in to watch and vote.</p>}
    <FreestyleQueue streamId={streamId} hostId={hostId} onSelect={isHost && !open ? c => { setArtistA(c.artist_a_id); setArtistB(c.artist_b_id); } : undefined} />
    {isHost && <div className="mt-5 border-t border-border pt-4">
      {open ? <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => { if (battle && window.confirm('End this battle and finalize votes?')) void action(() => end({ data: { battleId: battle.id } })); }}>End battle & record result</Button><Button variant="ghost" disabled={busy} onClick={() => { if (battle && window.confirm('Cancel this battle? The slot will be released.')) void action(() => cancel({ data: { battleId: battle.id } })); }}>Cancel battle</Button></div> : <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
        {(['a', 'b'] as const).map(side => <div key={side} className="min-w-0 text-sm"><p className="text-muted-foreground">Artist {side.toUpperCase()}</p><p className="break-words font-bold">{(() => { const p = queue.data?.profiles.find(p => p.id === (side === 'a' ? artistA : artistB)); return p?.stage_name || p?.display_name || 'Select an accepted matchup'; })()}</p></div>)}
        <label className="text-xs text-muted-foreground">Duration<select aria-label="Freestyle duration" className="mt-1 block h-10 rounded-md border border-input bg-background px-2 text-foreground" value={duration} onChange={e => setDuration(Number(e.target.value))}>{[60, 180, 300].map(s => <option key={s} value={s}>{s / 60} min</option>)}</select></label>
        <Button className="self-end" disabled={busy || !artistA || !artistB || artistA === artistB || !room} onClick={() => void action(() => start({ data: { streamId, artistA, artistB, duration } }))}>{busy ? 'Starting…' : 'Start freestyle'}</Button>
      </div>}
    </div>}
  </section>;
}

function ArtistCamera({ artistId, name, photo, hostId, artistA, artistB }: { artistId?: string; name: string; photo?: string | null; hostId: string; artistA?: string; artistB?: string }) {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }], { onlySubscribed: false });
  const participants = useParticipants();
  const track = tracks.find(t => t.participant.identity === artistId);
  const live = !!artistId && participants.some(p => p.identity === artistId) && !!track?.publication && !track.publication.isMuted;
  const viewers = new Set(participants.filter(p => ![hostId, artistA, artistB].includes(p.identity) && !p.identity.startsWith('preview_')).map(p => p.identity)).size;
  return <div className="freestyle-camera relative bg-muted">
    {track && track.publication && !track.publication.isMuted ? <VideoTrack trackRef={{ participant: track.participant, publication: track.publication, source: Track.Source.Camera }} className="h-full w-full object-cover" /> : photo ? <SignedImg src={photo} alt={name} className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center"><CameraOff className="h-10 w-10 text-muted-foreground" /></div>}
    <div className="absolute bottom-2 left-2 flex items-center gap-3 rounded-sm bg-background/90 px-2 py-1 text-xs"><span className="flex items-center gap-1"><Radio className="h-3 w-3" />{live ? 'LIVE' : artistId ? 'Offline' : 'Waiting'}</span><span className="flex items-center gap-1"><Eye className="h-3 w-3" />{viewers} viewers</span></div>
  </div>;
}

function LocalCameraControl({ artistIds }: { artistIds: (string | undefined)[] }) {
  const { localParticipant, isCameraEnabled } = useLocalParticipant();
  if (!artistIds.includes(localParticipant.identity)) return null;
  return <div className="mt-4 flex flex-wrap justify-center gap-2"><SelfMicrophoneButton /><Button variant="outline" onClick={async () => { try { await localParticipant.setCameraEnabled(!isCameraEnabled); } catch { toast.error('Allow camera access and confirm your host-approved camera permission.'); } }}>{isCameraEnabled ? <CameraOff /> : <Camera />}{isCameraEnabled ? 'Camera off' : 'Camera on'}</Button></div>;
}