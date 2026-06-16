
DROP POLICY IF EXISTS "Users can subscribe to own-scoped topics" ON realtime.messages;

CREATE POLICY "Users can subscribe to strictly own-scoped topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() ~ ('^(user|notifications|inbox|presence):' || (auth.uid())::text || '(:|$)')
  OR realtime.topic() ~ ('^dm:' || (auth.uid())::text || ':[0-9a-f-]{36}$')
  OR realtime.topic() ~ ('^dm:[0-9a-f-]{36}:' || (auth.uid())::text || '$')
  OR realtime.topic() ~ ('^stream:[0-9a-f-]{36}:user:' || (auth.uid())::text || '$')
);
