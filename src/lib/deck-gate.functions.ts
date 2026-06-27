// @auth-exempt: gated by DECK_PASSWORD shared secret verified inside the handler.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { timingSafeEqual } from "crypto";

const Input = z.object({ password: z.string().min(1).max(256) });

export const verifyDeckPassword = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const expected = process.env.DECK_PASSWORD;
    if (!expected) {
      throw new Error("Deck password not configured");
    }
    const a = Buffer.from(data.password);
    const b = Buffer.from(expected);
    const ok = a.length === b.length && timingSafeEqual(a, b);
    return { ok };
  });