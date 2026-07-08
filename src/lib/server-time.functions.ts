// @auth-exempt: public clock endpoint — returns only the server's current
// time (no user data, no side effects). Used by the Arena audio clock to
// estimate each client's offset to server time for synchronized playback.
import { createServerFn } from "@tanstack/react-start";

export const getServerTime = createServerFn({ method: "GET" }).handler(async () => {
  return { nowMs: Date.now() };
});
