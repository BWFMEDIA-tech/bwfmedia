import { describe, expect, it } from "vitest";
import { TUNEVIO_PLANS } from "./tunevio-subscriptions.functions";

describe("TUNEVIO_PLANS pricing", () => {
  it("charges the Listener Premium plan $6.99/mo", () => {
    expect(TUNEVIO_PLANS.listener_premium.priceCents).toBe(699);
  });

  it("charges the Artist Starter plan $6.99/mo", () => {
    expect(TUNEVIO_PLANS.artist_starter.priceCents).toBe(699);
  });
});
