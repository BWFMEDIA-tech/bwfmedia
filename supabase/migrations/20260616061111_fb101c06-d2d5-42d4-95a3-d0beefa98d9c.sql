
DROP POLICY IF EXISTS "Authenticated can receive realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Deny all by default" ON realtime.messages;
DROP POLICY IF EXISTS "deny all" ON realtime.messages;

-- Users may only subscribe to topics that include their own auth.uid().
-- Convention: topic names embed the owning user's id (e.g. "user:<uid>",
-- "notifications:<uid>", "dm:<uidA>:<uidB>", "stream:<id>:user:<uid>").
CREATE POLICY "Users can subscribe to own-scoped topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE '%' || (auth.uid())::text || '%'
);
