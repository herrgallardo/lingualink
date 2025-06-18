-- Enable realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE read_receipts;

-- Create function to notify about typing status
CREATE OR REPLACE FUNCTION notify_typing_status()
RETURNS TRIGGER AS $$
DECLARE
  channel TEXT;
BEGIN
  -- Only notify if typing status actually changed
  IF NEW.is_typing IS DISTINCT FROM OLD.is_typing THEN
    -- Get all chats this user is in
    FOR channel IN 
      SELECT DISTINCT 'typing:' || id::text 
      FROM chats 
      WHERE NEW.id = ANY(participants)
    LOOP
      PERFORM pg_notify(
        channel,
        json_build_object(
          'user_id', NEW.id,
          'username', NEW.username,
          'is_typing', NEW.is_typing
        )::text
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for typing notifications
CREATE TRIGGER notify_typing_status_trigger
  AFTER UPDATE OF is_typing ON users
  FOR EACH ROW
  EXECUTE FUNCTION notify_typing_status();

-- Create view for chat list with last message and unread count
CREATE OR REPLACE VIEW chat_list AS
SELECT 
  c.id,
  c.created_at,
  c.updated_at,
  c.participants,
  (
    SELECT row_to_json(m.*)
    FROM messages m
    WHERE m.chat_id = c.id
      AND m.deleted_at IS NULL
    ORDER BY m.timestamp DESC
    LIMIT 1
  ) as last_message,
  (
    SELECT COUNT(*)::int
    FROM messages m
    WHERE m.chat_id = c.id
      AND m.sender_id != auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM read_receipts r 
        WHERE r.message_id = m.id 
        AND r.user_id = auth.uid()
      )
      AND m.deleted_at IS NULL
  ) as unread_count,
  (
    SELECT array_agg(
      json_build_object(
        'id', u.id,
        'username', u.username,
        'avatar_url', u.avatar_url,
        'status', u.status,
        'last_seen', u.last_seen
      )
    )
    FROM users u
    WHERE u.id = ANY(c.participants)
      AND u.id != auth.uid()
  ) as other_participants
FROM chats c
WHERE auth.uid() = ANY(c.participants);

-- Grant permissions on the view
GRANT SELECT ON chat_list TO authenticated;

-- Create function to create or get direct chat
CREATE OR REPLACE FUNCTION create_or_get_direct_chat(other_user_id UUID)
RETURNS UUID AS $$
DECLARE
  chat_id UUID;
  participants_array UUID[];
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = other_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Check if not trying to chat with self
  IF other_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot create chat with yourself';
  END IF;
  
  -- Create sorted array of participants
  participants_array := ARRAY[auth.uid(), other_user_id]::UUID[];
  
  -- Try to find existing chat
  SELECT id INTO chat_id
  FROM chats
  WHERE participants @> participants_array
    AND participants <@ participants_array
    AND array_length(participants, 1) = 2
  LIMIT 1;
  
  -- If no chat exists, create one
  IF chat_id IS NULL THEN
    INSERT INTO chats (participants)
    VALUES (participants_array)
    RETURNING id INTO chat_id;
  END IF;
  
  RETURN chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_or_get_direct_chat(UUID) TO authenticated;