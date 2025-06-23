-- Update default preferences to include new notification settings
UPDATE users 
SET preferences = preferences || '{
  "pushNotifications": true,
  "emailNotifications": false,
  "desktopNotifications": true
}'::jsonb
WHERE preferences IS NOT NULL;

-- Update default preferences for users without any preferences
UPDATE users 
SET preferences = '{
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
  "messageGrouping": true,
  "pushNotifications": true,
  "emailNotifications": false,
  "desktopNotifications": true
}'::jsonb
WHERE preferences IS NULL;