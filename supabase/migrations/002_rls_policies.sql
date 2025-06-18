-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE glossary ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE read_receipts ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can read all user profiles (for user search)
CREATE POLICY "Users can view all profiles" ON users
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Chats table policies
-- Users can view chats they're participants in
CREATE POLICY "Users can view their chats" ON chats
  FOR SELECT USING (auth.uid() = ANY(participants));

-- Users can create chats they're participants in
CREATE POLICY "Users can create chats" ON chats
  FOR INSERT WITH CHECK (auth.uid() = ANY(participants));

-- Users can update chats they're participants in
CREATE POLICY "Users can update their chats" ON chats
  FOR UPDATE USING (auth.uid() = ANY(participants));

-- Messages table policies
-- Users can view messages in chats they're participants in
CREATE POLICY "Users can view messages in their chats" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = messages.chat_id 
      AND auth.uid() = ANY(chats.participants)
    )
  );

-- Users can insert messages in chats they're participants in
CREATE POLICY "Users can send messages to their chats" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = chat_id 
      AND auth.uid() = ANY(chats.participants)
    )
  );

-- Users can update their own messages
CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Users can soft delete their own messages
CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE USING (auth.uid() = sender_id);

-- Glossary table policies
-- Users can view all glossary entries
CREATE POLICY "Users can view glossary" ON glossary
  FOR SELECT USING (true);

-- Users can create glossary entries
CREATE POLICY "Users can create glossary entries" ON glossary
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Users can update their own glossary entries
CREATE POLICY "Users can update own glossary entries" ON glossary
  FOR UPDATE USING (auth.uid() = created_by);

-- Users can delete their own glossary entries
CREATE POLICY "Users can delete own glossary entries" ON glossary
  FOR DELETE USING (auth.uid() = created_by);

-- Message reactions policies
-- Users can view reactions in their chats
CREATE POLICY "Users can view reactions" ON message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN chats c ON c.id = m.chat_id
      WHERE m.id = message_reactions.message_id
      AND auth.uid() = ANY(c.participants)
    )
  );

-- Users can add reactions to messages in their chats
CREATE POLICY "Users can add reactions" ON message_reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM messages m
      JOIN chats c ON c.id = m.chat_id
      WHERE m.id = message_id
      AND auth.uid() = ANY(c.participants)
    )
  );

-- Users can remove their own reactions
CREATE POLICY "Users can remove own reactions" ON message_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Read receipts policies
-- Users can view read receipts in their chats
CREATE POLICY "Users can view read receipts" ON read_receipts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN chats c ON c.id = m.chat_id
      WHERE m.id = read_receipts.message_id
      AND auth.uid() = ANY(c.participants)
    )
  );

-- Users can mark messages as read
CREATE POLICY "Users can mark messages as read" ON read_receipts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM messages m
      JOIN chats c ON c.id = m.chat_id
      WHERE m.id = message_id
      AND auth.uid() = ANY(c.participants)
    )
  );