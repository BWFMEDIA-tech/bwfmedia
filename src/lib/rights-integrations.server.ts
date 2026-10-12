/**
 * Server-only integration registry for rights organizations.
 * No organization is connected: every adapter reports "not_connected" until
 * Tunevio receives authorized partner access and stores its credentials as
 * server secrets. Never return fabricated statuses or royalties from here.
 */
import type { OrgKey } from "./rights";

export type IntegrationStatus = { org: OrgKey; connected: false; reason: string; secretName: string };

const NOTES: Record<OrgKey, string> = {
  copyright_office: "No public filing API; registration happens in eCO.",
  ascap: "No public API; repertoire data only via approved partner agreements.",
  bmi: "No public API; data exchange via approved partners (CWR files).",
  songtrust: "Partner API access requires a business agreement.",
  soundexchange: "ISRC/repertoire data access requires an approved data agreement.",
  mlc: "Bulk data and DQI access require MLC approval and a signed license.",
};

export function getIntegrationStatus(org: OrgKey): IntegrationStatus {
  return { org, connected: false, reason: NOTES[org], secretName: `RIGHTS_${org.toUpperCase()}_API_KEY` };
}
