import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createSessionTokenResolver } from "./session-token";

const resolveToken = createSessionTokenResolver(supabase.auth);

export const attachCurrentSession = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = await resolveToken();
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  },
);