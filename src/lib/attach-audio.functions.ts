import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Schema = z.object({
  submissionId: z.string().uuid(),
  audioUrl: z.string().url().max(1000),
  audioFileType: z.enum(["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave"]),
});

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export const attachAudioToSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => Schema.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = admin();
    const { data: row, error: readErr } = await supabase
      .from("live_submissions")
      .select("id, status, email")
      .eq("id", data.submissionId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!row) throw new Error("Submission not found");
    if (row.status !== "paid") throw new Error("Submission has not been paid yet");

    // Ownership check: the caller must be the submitter (matched by email)
    // or an admin. The service-role client bypasses RLS, so we must enforce
    // this in code.
    const { data: userRes } = await context.supabase.auth.getUser();
    const callerEmail = userRes.user?.email?.toLowerCase() ?? "";
    const submissionEmail = (row.email as string | null)?.toLowerCase() ?? "";
    const isOwner = callerEmail && callerEmail === submissionEmail;
    let isAdmin = false;
    if (!isOwner && context.userId) {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", context.userId)
        .eq("role", "admin")
        .maybeSingle();
      isAdmin = !!roleRow;
    }
    if (!isOwner && !isAdmin) {
      throw new Error("Not authorized to modify this submission");
    }

    const { error: updErr } = await supabase
      .from("live_submissions")
      .update({
        uploaded_audio_url: data.audioUrl,
        audio_file_type: data.audioFileType,
        audio_uploaded_at: new Date().toISOString(),
      })
      .eq("id", data.submissionId);
    if (updErr) throw new Error(updErr.message);
    return { ok: true };
  });