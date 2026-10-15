import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({}) }));
import { formatUnread } from "./UnreadBadge";

describe("formatUnread", () => {
  it("shows the exact count up to 99", () => expect(formatUnread(99)).toBe("99"));
  it("caps above 99 as 99+", () => expect(formatUnread(100)).toBe("99+"));
});
