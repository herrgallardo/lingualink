-- Additional indexes for common queries
-- Index for finding chats by participant pairs (for direct chats)
CREATE INDEX idx_chats_participants_gin_ops ON chats USING gin(participants array_ops);

-- Index for message search
CREATE INDEX idx_messages_original_text_trgm ON messages USING gin(original_text gin_trgm_ops);

-- Composite index for chat messages pagination
CREATE INDEX idx_messages_chat_timestamp ON messages(chat_id, timestamp DESC) 
WHERE deleted_at IS NULL;

-- Index for finding user's sent messages
CREATE INDEX idx_messages_sender_timestamp ON messages(sender_id, timestamp DESC);

-- Partial index for unread messages
CREATE INDEX idx_messages_unread ON messages(chat_id, sender_id, timestamp)
WHERE deleted_at IS NULL;

-- Create materialized view for user statistics
CREATE MATERIALIZED VIEW user_stats AS
SELECT 
  u.id as user_id,
  COUNT(DISTINCT c.id) as total_chats,
  COUNT(DISTINCT m.id) as total_messages_sent,
  COUNT(DISTINCT CASE WHEN m.timestamp > NOW() - INTERVAL '7 days' THEN m.id END) as messages_last_week,
  COUNT(DISTINCT m.original_language) as languages_used,
  MAX(m.timestamp) as last_message_at
FROM users u
LEFT JOIN chats c ON u.id = ANY(c.participants)
LEFT JOIN messages m ON m.sender_id = u.id AND m.deleted_at IS NULL
GROUP BY u.id;

-- Create index on materialized view
CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);

-- Function to refresh user stats
CREATE OR REPLACE FUNCTION refresh_user_stats()
RETURNS void AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON user_stats TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_user_stats() TO service_role;

-- Function to search messages
CREATE OR REPLACE FUNCTION search_messages(
  search_query TEXT,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  message_id UUID,
  chat_id UUID,
  sender_id UUID,
  original_text TEXT,
  message_timestamp TIMESTAMP WITH TIME ZONE,
  rank REAL
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    m.id as message_id,
    m.chat_id,
    m.sender_id,
    m.original_text,
    m.timestamp as message_timestamp,
    ts_rank(to_tsvector('simple', m.original_text), plainto_tsquery('simple', search_query)) as rank
  FROM messages m
  JOIN chats c ON c.id = m.chat_id
  WHERE auth.uid() = ANY(c.participants)
    AND m.deleted_at IS NULL
    AND to_tsvector('simple', m.original_text) @@ plainto_tsquery('simple', search_query)
  ORDER BY rank DESC, m.timestamp DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_messages(TEXT, INTEGER, INTEGER) TO authenticated;

-- Function to get chat participants with details
CREATE OR REPLACE FUNCTION get_chat_participants(p_chat_id UUID)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  status user_status,
  is_typing BOOLEAN,
  last_seen TIMESTAMP WITH TIME ZONE,
  preferred_language TEXT
) AS $function$
BEGIN
  -- Check if user has access to this chat
  IF NOT EXISTS (
    SELECT 1 FROM chats 
    WHERE id = p_chat_id 
    AND auth.uid() = ANY(participants)
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.username,
    u.avatar_url,
    u.status,
    u.is_typing,
    u.last_seen,
    u.preferred_language
  FROM users u
  JOIN chats c ON u.id = ANY(c.participants)
  WHERE c.id = p_chat_id
  ORDER BY u.username;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_chat_participants(UUID) TO authenticated;