interface FreestylePlacementMatchup {
  id: string;
  status: string;
  slot_number: number | null;
  artist_a_id: string;
  artist_b_id: string;
  stream_id: string | null;
}

/** Place only the accepted pair, retaining its authoritative A/B order. */
export function freestylePlacement(rows: FreestylePlacementMatchup[], id: string, streamId: string) {
  const matchup = rows.find(row => row.id === id && ['accepted', 'scheduled'].includes(row.status)
    && row.slot_number !== null && (!row.stream_id || row.stream_id === streamId));
  return matchup ? { artistA: matchup.artist_a_id, artistB: matchup.artist_b_id } : null;
}