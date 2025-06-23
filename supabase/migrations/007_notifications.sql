-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('message', 'mention', 'reaction', 'system', 'chat_invite')),
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT false NOT NULL,
  clicked BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Create push subscriptions table
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, endpoint)
);

-- Create indexes for push subscriptions
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_last_used ON push_subscriptions(last_used);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for push subscriptions
CREATE POLICY "Users can view their push subscriptions" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their push subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their push subscriptions" ON push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their push subscriptions" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_type TEXT,
  p_data JSONB DEFAULT '{}'::jsonb,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, body, type, data, expires_at)
  VALUES (p_user_id, p_title, p_body, p_type, p_data, p_expires_at)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications 
  SET read = true 
  WHERE id = p_notification_id 
    AND user_id = auth.uid()
    AND NOT read;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications 
  SET read = true 
  WHERE user_id = auth.uid() 
    AND NOT read;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications 
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, JSONB, TIMESTAMP WITH TIME ZONE) TO service_role;
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_notifications() TO service_role;

-- Create trigger to notify about new notifications
CREATE OR REPLACE FUNCTION notify_new_notification()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'notification:' || NEW.user_id::text,
    json_build_object(
      'id', NEW.id,
      'title', NEW.title,
      'body', NEW.body,
      'type', NEW.type,
      'data', NEW.data,
      'created_at', NEW.created_at
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER notify_new_notification_trigger
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_notification();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;