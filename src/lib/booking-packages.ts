// Package catalog. Keys MUST match Stripe price ids (lookup_keys).
export type BookingTable = 'studio_bookings' | 'block_bookings';

export interface BookingPackage {
  id: string;
  label: string;
  amountCents: number;
  table: BookingTable;
}

export const BOOKING_PACKAGES: Record<string, BookingPackage> = {
  studio_1hr: { id: 'studio_1hr', label: '1 Hour', amountCents: 15000, table: 'studio_bookings' },
  studio_2hr: { id: 'studio_2hr', label: '2 Hours', amountCents: 27500, table: 'studio_bookings' },
  studio_4hr: { id: 'studio_4hr', label: 'Half Day (4h)', amountCents: 50000, table: 'studio_bookings' },
  studio_8hr: { id: 'studio_8hr', label: 'Full Day (8h)', amountCents: 90000, table: 'studio_bookings' },
  otb_interview: { id: 'otb_interview', label: 'Artist Interview', amountCents: 40000, table: 'block_bookings' },
  otb_podcast: { id: 'otb_podcast', label: 'Podcast Episode', amountCents: 50000, table: 'block_bookings' },
  otb_music_video: { id: 'otb_music_video', label: 'Music Video', amountCents: 150000, table: 'block_bookings' },
};

export function packagesForTable(table: BookingTable): BookingPackage[] {
  return Object.values(BOOKING_PACKAGES).filter((p) => p.table === table);
}