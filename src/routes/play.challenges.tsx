import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Music2, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FreestyleQueue } from '@/components/play/FreestyleQueue';
import { BattleChallenges } from '@/components/play/BattleChallenges';
import { GenreBattleBoard } from '@/components/play/GenreBattleBoard';
import { AddProfileTrackDialog } from '@/components/settings/AddProfileTrackDialog';
import { SubmitToArenaModal } from '@/components/play/SubmitToArenaModal';
import type { UploadedProfileTrack } from '@/lib/profile-track-upload';
import { useAuth } from '@/lib/auth-context';

export const Route = createFileRoute('/play/challenges')({
  head: () => ({ meta: [
    { title: 'Artist Battle Challenges — TUNEVIO' },
    { name: 'description', content: 'Send and manage Tunevio Freestyle and song battle invitations with existing artist profiles.' },
    { property: 'og:title', content: 'Artist Battle Challenges — TUNEVIO' },
    { property: 'og:description', content: 'Select your opponent and manage artist battle challenges on Tunevio.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: ChallengesPage,
});

function ChallengesPage() {
  const auth = useAuth();
  const [tab, setTab] = useState<'freestyle' | 'songs'>('freestyle');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [song, setSong] = useState<UploadedProfileTrack | null>(null);
  return <main className="min-h-screen bg-background px-4 pb-24 pt-8 text-foreground sm:px-6">
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-2xl font-bold sm:text-3xl">Artist challenges</h1><Button asChild variant="ghost"><Link to="/play">Play Arena</Link></Button></header>
      <div role="tablist" aria-label="Challenge type" className="flex flex-wrap gap-2">
        <Button role="tab" aria-selected={tab === 'freestyle'} variant={tab === 'freestyle' ? 'default' : 'ghost'} onClick={() => setTab('freestyle')}><Swords />1v1 Freestyle</Button>
        <Button role="tab" aria-selected={tab === 'songs'} variant={tab === 'songs' ? 'default' : 'ghost'} onClick={() => setTab('songs')}><Music2 />Song battles</Button>
      </div>
      <div role="tabpanel" aria-label={tab === 'freestyle' ? '1v1 Freestyle challenges' : 'Song battle challenges'}>
        {tab === 'freestyle' ? <FreestyleQueue /> : <div className="space-y-8">
          {auth.user && <><Button onClick={() => setUploadOpen(true)}><Music2 />Upload new track</Button><BattleChallenges userId={auth.user.id} /></>}
          <GenreBattleBoard isAuthenticated={auth.isAuthenticated} />
        </div>}
      </div>
    </div>
    {uploadOpen && <AddProfileTrackDialog defaultArtistName={auth.displayName ?? ''} onClose={() => setUploadOpen(false)} onAdded={setSong} />}
    {!uploadOpen && song && <SubmitToArenaModal song={song} onClose={() => setSong(null)} />}
  </main>;
}