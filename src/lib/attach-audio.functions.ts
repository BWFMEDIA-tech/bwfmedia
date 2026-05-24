import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const Schema = z.object({
  submissionId: z.string().uuid(),
  audioUrl: z.string().url().max(1000),
  audioFileType: z.enum(["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave"]),
});

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export const attachAudioToSubmission = createServerFn({ method: "POST" })
  .inputValidator((data) => Schema.parse(data))
  .handler(async ({ data }) => {
    const supabase = admin();
    const { data: row, error: readErr } = await supabase
      .from("live_submissions")
      .select("id, status")
      .eq("id", data.submissionId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!row) throw new Error("Submission not found");
    if (row.status !== "paid") throw new Error("Submission has not been paid yet");

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