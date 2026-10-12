export type RightsStatus = "not_started" | "in_progress" | "submitted" | "verified" | "issue";
export type OrgKey = "copyright_office" | "ascap" | "bmi" | "songtrust" | "soundexchange" | "mlc";

export const RIGHTS_ORGS: {
  key: OrgKey; name: string; role: string; url: string; idLabel: string; steps: string[];
}[] = [
  { key: "copyright_office", name: "U.S. Copyright Office", role: "Copyright Registration", url: "https://www.copyright.gov/registration/", idLabel: "Registration / case number",
    steps: ["Create an eCO account", "Choose work type (sound recording / musical work)", "Upload deposit copy", "Pay filing fee", "Record case number"] },
  { key: "ascap", name: "ASCAP", role: "Performance Rights", url: "https://www.ascap.com/join", idLabel: "Member ID",
    steps: ["Apply as writer member", "Apply as publisher member (optional)", "Register your works", "Add co-writer splits", "Record member ID"] },
  { key: "bmi", name: "BMI", role: "Performance Rights", url: "https://www.bmi.com/join", idLabel: "Account / IPI number",
    steps: ["Apply as songwriter", "Confirm you are not with another PRO", "Register your works", "Add co-writer splits", "Record IPI number"] },
  { key: "songtrust", name: "Songtrust", role: "Publishing Administration", url: "https://www.songtrust.com/", idLabel: "Account ID",
    steps: ["Create an account", "Connect your PRO affiliation", "Add songs and splits", "Submit catalog", "Record account ID"] },
  { key: "soundexchange", name: "SoundExchange", role: "Sound Recording Royalties", url: "https://www.soundexchange.com/artist-copyright-owner/", idLabel: "Account ID",
    steps: ["Register as featured artist", "Register as rights owner (if you own masters)", "Submit tax and payment info", "Claim recordings by ISRC", "Record account ID"] },
  { key: "mlc", name: "The MLC", role: "Mechanical Royalties", url: "https://www.themlc.com/", idLabel: "MLC member ID",
    steps: ["Create a Portal account", "Add IPI and payee details", "Register musical works", "Match recordings by ISRC", "Record member ID"] },
];

export const STATUS_LABEL: Record<RightsStatus, string> = {
  not_started: "Not started", in_progress: "In progress", submitted: "Submitted", verified: "Verified", issue: "Issue",
};

/** Total of ownership splits, rounded to 2 decimals. */
export function splitTotal(splits: { share_pct: number | string }[]) {
  return Math.round(splits.reduce((s, x) => s + Number(x.share_pct || 0), 0) * 100) / 100;
}
export function canAddSplit(existing: { share_pct: number | string }[], pct: number) {
  return pct > 0 && splitTotal(existing) + pct <= 100;
}

/** Counts registrations; open disputes also count as issues. */
export function countRights(regs: { status: RightsStatus }[], openDisputes = 0) {
  const started = regs.filter((r) => r.status !== "not_started");
  return {
    total: started.length,
    verified: regs.filter((r) => r.status === "verified").length,
    inProgress: regs.filter((r) => r.status === "in_progress" || r.status === "submitted").length,
    issues: regs.filter((r) => r.status === "issue").length + openDisputes,
  };
}
