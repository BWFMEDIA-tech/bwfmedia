type IdempotentParams = {
  supabase: any;
  userId: string;
  key: string;
  action: string;
  handler: () => Promise<any>;
};

export async function runIdempotent({
  supabase,
  userId,
  key,
  action,
  handler,
}: IdempotentParams) {
  // 1. check existing execution
  const { data: existing } = await supabase
    .from("request_idempotency")
    .select("response")
    .eq("user_id", userId)
    .eq("idempotency_key", key)
    .maybeSingle();

  // 2. return cached result if already executed
  if (existing?.response) {
    return existing.response;
  }

  // 3. execute real logic
  const result = await handler();

  // 4. store result for future deduplication
  await supabase.from("request_idempotency").insert({
    user_id: userId,
    idempotency_key: key,
    action,
    response: result,
  });

  return result;
}
