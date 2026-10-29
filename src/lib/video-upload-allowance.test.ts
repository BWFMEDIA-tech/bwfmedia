import { describe, expect, it } from "vitest";
import { parseVideoUploadAllowance } from "./video-upload-allowance";

describe("artist monthly video allowance", () => {
  const resetsAt = "2026-11-01T05:00:00Z";
  it("gives artists two uploads without requiring a paid plan", () => {
    expect(parseVideoUploadAllowance({ limit: 2, used: 0, remaining: 2, resetsAt }).remaining).toBe(2);
  });
  it("leaves one upload after the first video", () => {
    expect(parseVideoUploadAllowance({ limit: 2, used: 1, remaining: 1, resetsAt }).remaining).toBe(1);
  });
  it("blocks more uploads after two, including legacy counts above two", () => {
    expect(parseVideoUploadAllowance({ limit: 2, used: 2, remaining: 0, resetsAt }).remaining).toBe(0);
    expect(parseVideoUploadAllowance({ limit: 2, used: 4, remaining: 0, resetsAt }).remaining).toBe(0);
  });
  it("fails closed for inconsistent allowances", () => {
    expect(() => parseVideoUploadAllowance({ limit: 2, used: 2, remaining: 2, resetsAt })).toThrow();
    expect(() => parseVideoUploadAllowance({ limit: 3, used: 0, remaining: 3, resetsAt })).toThrow();
  });
});