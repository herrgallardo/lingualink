-- Add preferences column to users table
ALTER TABLE users 
ADD COLUMN preferences JSONB DEFAULT '{
  "compactView": false,
  "notificationSounds": true,
  "messagePreview": true,
  "showTypingIndicator": true,
  "autoTranslate": true,
  "theme": "system",
  "fontSize": "medium",
  "soundVolume": 0.5,
  "enterToSend": true,
  "showTimestamps": true,
  "showReadReceipts": true,
  "messageGrouping": true
}'::jsonb NOT NULL;

-- Create index for preferences
CREATE INDEX idx_users_preferences ON users USING gin(preferences);

-- Add comment
COMMENT ON COLUMN users.preferences IS 'User UI and notification preferences';

-- Create function to update specific preference
CREATE OR REPLACE FUNCTION update_user_preference(
  user_id UUID,
  preference_key TEXT,
  preference_value JSONB
)
RETURNS JSONB AS $$
DECLARE
  updated_preferences JSONB;
BEGIN
  UPDATE users
  SET preferences = jsonb_set(
    preferences,
    string_to_array(preference_key, '.'),
    preference_value,
    true
  )
  WHERE id = user_id
  RETURNING preferences INTO updated_preferences;
  
  RETURN updated_preferences;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_user_preference(UUID, TEXT, JSONB) TO authenticated;

-- Create function to get user preferences with defaults
CREATE OR REPLACE FUNCTION get_user_preferences(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  user_prefs JSONB;
  default_prefs JSONB := '{
    "compactView": false,
    "notificationSounds": true,
    "messagePreview": true,
    "showTypingIndicator": true,
    "autoTranslate": true,
    "theme": "system",
    "fontSize": "medium",
    "soundVolume": 0.5,
    "enterToSend": true,
    "showTimestamps": true,
    "showReadReceipts": true,
    "messageGrouping": true
  }'::jsonb;
BEGIN
  SELECT preferences INTO user_prefs
  FROM users
  WHERE id = user_id;
  
  -- Merge with defaults to ensure all keys exist
  RETURN default_prefs || COALESCE(user_prefs, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_preferences(UUID) TO authenticated;