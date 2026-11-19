import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ session: vi.fn(), publicSign: vi.fn(), privateSign: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: mocks.session } } }));
vi.mock("@/lib/video-sign.functions", () => ({ signPublicVideoPaths: mocks.publicSign, signVideoPaths: mocks.privateSign }));

describe("video thumbnail signing", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ data: { session: null } });
    const sign = async ({ data }: { data: { paths: string[] } }) => ({ results: Object.fromEntries(data.paths.map(path => [path, `signed:${path}`])) });
    mocks.publicSign.mockImplementation(sign);
    mocks.privateSign.mockImplementation(sign);
  });
  afterEach(() => vi.useRealTimers());

  it("signs simultaneous thumbnails in one request and reuses cached URLs", async () => {
    const { signVideoPath } = await import("./video-urls");
    const pending = [signVideoPath("a/thumb.jpg"), signVideoPath("b/thumb.jpg"), signVideoPath("a/thumb.jpg")];
    await vi.advanceTimersByTimeAsync(25);
    expect(await Promise.all(pending)).toEqual(["signed:a/thumb.jpg", "signed:b/thumb.jpg", "signed:a/thumb.jpg"]);
    expect(mocks.publicSign).toHaveBeenCalledTimes(1);
    expect(mocks.publicSign).toHaveBeenCalledWith({ data: { paths: ["a/thumb.jpg", "b/thumb.jpg"] } });
    expect(await signVideoPath("a/thumb.jpg")).toBe("signed:a/thumb.jpg");
    expect(mocks.session).toHaveBeenCalledTimes(1);
  });

  it("keeps authenticated signing and splits requests at the existing 50-path limit", async () => {
    mocks.session.mockResolvedValue({ data: { session: { user: { id: "artist" } } } });
    const { signVideoPath } = await import("./video-urls");
    const pending = Array.from({ length: 51 }, (_, i) => signVideoPath(`artist/${i}.jpg`));
    await vi.advanceTimersByTimeAsync(25);
    expect((await Promise.all(pending)).filter(Boolean)).toHaveLength(51);
    expect(mocks.privateSign.mock.calls.map(call => call[0].data.paths.length)).toEqual([50, 1]);
    expect(mocks.publicSign).not.toHaveBeenCalled();
  });

  it("does not cache failed signing and allows a later retry", async () => {
    mocks.publicSign.mockRejectedValueOnce(new Error("Unavailable"));
    const { signVideoPath } = await import("./video-urls");
    const failed = signVideoPath("a/thumb.jpg");
    await vi.advanceTimersByTimeAsync(25);
    expect(await failed).toBeNull();
    const retried = signVideoPath("a/thumb.jpg");
    await vi.advanceTimersByTimeAsync(25);
    expect(await retried).toBe("signed:a/thumb.jpg");
  });
});