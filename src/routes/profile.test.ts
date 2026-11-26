import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  redirect: (options: unknown) => options,
}));
import { Route } from "./profile";
const openProfile = (Route as unknown as { beforeLoad: () => Promise<never> }).beforeLoad;

describe("own profile shortcut", () => {
  beforeEach(() => auth.getUser.mockReset());
  it("opens each authenticated user's existing profile rather than a fixed artist", async () => {
    for (const id of ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002"]) {
      auth.getUser.mockResolvedValue({ data: { user: { id } }, error: null });
      await expect(openProfile()).rejects.toEqual({ to: "/artist/$id", params: { id }, replace: true });
    }
  });
  it("sends signed-out visitors to login with a return to their own profile", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(openProfile()).rejects.toEqual({ to: "/login", search: { redirect: "/profile" } });
  });
  it("does not route to a profile when identity verification fails", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: "unverified" } }, error: { message: "Expired" } });
    await expect(openProfile()).rejects.toEqual({ to: "/login", search: { redirect: "/profile" } });
  });
});