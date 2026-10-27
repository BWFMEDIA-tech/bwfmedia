import { describe, expect, it } from "vitest";
import { classifyError, estimateCredits, scheduleGate, structuralQa, zonedParts, type Article } from "./blog-automation";

const base = { enabled: true, paused_reason: null, publish_hour: 9, timezone: "America/Chicago" };

describe("schedule gate", () => {
  it("runs at 9 AM Chicago in summer (14:00 UTC, CDT)", () => {
    expect(scheduleGate(base, new Date("2026-07-01T14:05:00Z")).run).toBe(true);
    expect(scheduleGate(base, new Date("2026-07-01T15:05:00Z")).run).toBe(false);
  });
  it("runs at 9 AM Chicago in winter (15:00 UTC, CST)", () => {
    expect(scheduleGate(base, new Date("2026-12-01T15:05:00Z")).run).toBe(true);
    expect(scheduleGate(base, new Date("2026-12-01T14:05:00Z")).run).toBe(false);
  });
  it("uses the Chicago date as idempotency key", () => {
    expect(zonedParts(new Date("2026-07-02T03:00:00Z")).date).toBe("2026-07-01");
  });
  it("never runs while disabled or paused", () => {
    expect(scheduleGate({ ...base, enabled: false }, new Date("2026-07-01T14:05:00Z")).run).toBe(false);
    expect(scheduleGate({ ...base, paused_reason: "budget" }, new Date("2026-07-01T14:05:00Z")).run).toBe(false);
  });
});

describe("retry classification", () => {
  it("retries 429/5xx, pauses 402/403, fails others", () => {
    expect(classifyError(429)).toBe("retry");
    expect(classifyError(503)).toBe("retry");
    expect(classifyError(402)).toBe("pause");
    expect(classifyError(403)).toBe("pause");
    expect(classifyError(400)).toBe("fail");
  });
});

it("estimates credits from tokens", () => {
  expect(estimateCredits(10000, 5000)).toBe(1.4);
});

const para = (n: number, seed: string) => Array.from({ length: n }, (_, i) => `${seed} word${i}`).join(" ");
const good: Article = {
  title: "How Independent Artists Can Grow a Fanbase",
  slug: "grow-a-fanbase-independent-artists",
  metaTitle: "How Independent Artists Can Grow a Fanbase",
  metaDescription: "Practical, honest steps independent artists can take to build real fans, from release planning to live sessions.",
  excerpt: "x", category: "Guides", keywords: [], tags: [], sources: [],
  body: `## Start\n\n${para(150, "alpha")}\n\n## Grow\n\n${para(150, "beta")} [Go live](/live)\n\n### More\n\n${para(150, "gamma")}`,
};

describe("structural QA", () => {
  it("passes a complete article", () => {
    expect(structuralQa(good, { pillar: "evergreen", existing: [] })).toEqual([]);
  });
  it("rejects short articles", () => {
    expect(structuralQa({ ...good, body: "## a\n\nshort\n\n## b\n\nshort" }, { pillar: "evergreen", existing: [] }).some((i) => i.check === "completeness")).toBe(true);
  });
  it("rejects unknown internal links", () => {
    const r = structuralQa({ ...good, body: good.body + " [x](/fake-page)" }, { pillar: "evergreen", existing: [] });
    expect(r.some((i) => i.check === "links")).toBe(true);
  });
  it("rejects duplicates", () => {
    const r = structuralQa(good, { pillar: "evergreen", existing: [{ slug: "other", title: "t", body: good.body }] });
    expect(r.some((i) => i.check === "duplicate")).toBe(true);
  });
  it("rejects news without two verified sources", () => {
    const r = structuralQa({ ...good, sources: [{ url: "https://a.com", title: "a" }] }, { pillar: "news", existing: [], verifiedSourceUrls: ["https://a.com"] });
    expect(r.some((i) => i.check === "sources")).toBe(true);
  });
  it("rejects guarantee language", () => {
    const r = structuralQa({ ...good, body: good.body + " guaranteed first page of google" }, { pillar: "evergreen", existing: [] });
    expect(r.some((i) => i.check === "spam")).toBe(true);
  });
});
