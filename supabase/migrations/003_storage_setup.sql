-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, avif_autodetection, allowed_mime_types, file_size_limit)
VALUES 
  (
    'avatars', 
    'avatars', 
    true, 
    false, 
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'],
    2097152 -- 2MB limit
  ),
  (
    'message-attachments', 
    'message-attachments', 
    false, 
    false, 
    ARRAY[
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
      'application/pdf', 'application/zip', 'application/x-zip-compressed',
      'text/plain', 'text/csv', 'text/markdown',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    10485760 -- 10MB limit
  )
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for message-attachments bucket
CREATE POLICY "Users can view attachments in their chats" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'message-attachments' AND
    EXISTS (
      SELECT 1 FROM messages m
      JOIN chats c ON c.id = m.chat_id
      WHERE m.id::text = (storage.foldername(name))[1]
      AND auth.uid() = ANY(c.participants)
    )
  );

CREATE POLICY "Users can upload attachments to their chats" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'message-attachments' AND
    EXISTS (
      SELECT 1 FROM messages m
      JOIN chats c ON c.id = m.chat_id
      WHERE m.id::text = (storage.foldername(name))[1]
      AND auth.uid() = ANY(c.participants)
      AND m.sender_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'message-attachments' AND
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id::text = (storage.foldername(name))[1]
      AND m.sender_id = auth.uid()
    )
  );