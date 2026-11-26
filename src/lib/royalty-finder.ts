import { RIGHTS_ORGS, type OrgKey } from './rights';

export type CatalogSong = {
  id: string; title: string; artistName: string; isrc: string; iswc: string;
  publisher: string; writers: string[]; splitPercent: number;
  registrationRefs: Record<string, string>; proAffiliation: string;
};
export type CatalogFinding = {
  track_id: string; song_title: string; artist_name: string;
  organization: OrgKey | 'catalog'; issue_type: string;
  evidence: string; recommended_action: string;
};
export const OFFICIAL_SEARCH: Record<OrgKey, string> = {
  copyright_office: 'https://publicrecords.copyright.gov/',
  ascap: 'https://www.ascap.com/repertory', bmi: 'https://repertoire.bmi.com/',
  songtrust: 'https://www.songtrust.com/', soundexchange: 'https://isrc.soundexchange.com/',
  mlc: 'https://portal.themlc.com/search',
};
export function auditCatalog(songs: CatalogSong[]): CatalogFinding[] {
  const findings: CatalogFinding[] = [];
  for (const song of songs) {
    const add = (organization: CatalogFinding['organization'], issue_type: string, evidence: string, recommended_action: string) => findings.push({ track_id: song.id, song_title: song.title, artist_name: song.artistName, organization, issue_type, evidence, recommended_action });
    const normalized = song.isrc.replace(/[-\s]/g, '').toUpperCase();
    if (!normalized) add('soundexchange', 'Missing ISRC', 'No ISRC is saved in song rights or the linked distribution track.', 'Add the ISRC assigned by your distributor, then search SoundExchange.');
    else if (!/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(normalized)) add('soundexchange', 'Invalid ISRC format', `Saved ISRC: ${song.isrc}. Expected 12 letters/digits in ISRC format.`, 'Check the ISRC against your distributor’s record.');
    if (!song.title.trim() || !song.artistName.trim()) add('catalog', 'Incomplete recording metadata', 'Song title or artist name is blank.', 'Complete the existing catalog metadata.');
    if (!song.writers.some(w => w.trim())) add('mlc', 'Missing songwriter metadata', 'No songwriter names are saved in rights splits or the linked release.', 'Add songwriter credits in My Song Catalog.');
    if (!song.publisher.trim()) add('songtrust', 'Missing publisher metadata', 'No publisher is saved in song rights or the linked release.', 'Record your publisher or confirm your self-administered publishing details.');
    if (Math.abs(song.splitPercent - 100) > 0.01) add('catalog', 'Incomplete ownership splits', `Saved Tunevio ownership splits total ${song.splitPercent}%.`, 'Review songwriter and ownership splits; confirm the complete agreed allocation.');
    if (!song.iswc.trim()) add('mlc', 'Missing work identifier', 'No ISWC is saved. This does not prove the work is unregistered.', 'Search The MLC and your PRO; record the assigned ISWC if available.');
    const pro = song.proAffiliation.trim().toLowerCase();
    if (!pro) add('catalog', 'PRO affiliation not recorded', 'No PRO affiliation is saved for this song’s linked release.', 'Confirm your existing PRO affiliation. Do not join a second PRO merely to resolve this finding.');
    for (const org of RIGHTS_ORGS) {
      // PRO membership is mutually exclusive; other affiliations remain manual review.
      if ((org.key === 'ascap' || org.key === 'bmi') && pro !== org.key) continue;
      if (!song.registrationRefs[org.key]?.trim()) add(org.key, 'Registration reference not recorded', `No ${org.name} song reference is saved in Tunevio. The official database has not been checked; registration may already exist.`, `Review ${org.name} for this song and save the reference if applicable. Not every organization applies to every artist.`);
    }
  }
  return findings;
}