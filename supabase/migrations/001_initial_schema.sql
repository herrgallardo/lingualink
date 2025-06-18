-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- Create enum for user status
CREATE TYPE user_status AS ENUM ('available', 'busy', 'do-not-disturb', 'invisible');

-- Users table with profile information
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'en' NOT NULL,
  status user_status DEFAULT 'available' NOT NULL,
  is_typing BOOLEAN DEFAULT false NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for users table
CREATE INDEX idx_users_username ON users USING gin (username gin_trgm_ops);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_last_seen ON users(last_seen);

-- Chats table with participants
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  participants UUID[] NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT at_least_two_participants CHECK (array_length(participants, 1) >= 2)
);

-- Create indexes for chats table
CREATE INDEX idx_chats_participants ON chats USING GIN(participants);
CREATE INDEX idx_chats_updated_at ON chats(updated_at DESC);

-- Messages table with translations
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  original_text TEXT NOT NULL,
  original_language TEXT NOT NULL DEFAULT 'en',
  translations JSONB DEFAULT '{}'::jsonb NOT NULL,
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for messages table
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_timestamp ON messages(chat_id, timestamp DESC);
CREATE INDEX idx_messages_deleted_at ON messages(deleted_at) WHERE deleted_at IS NULL;

-- Glossary for custom translations
CREATE TABLE glossary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_term TEXT NOT NULL,
  language TEXT NOT NULL,
  translated_term TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE, -- NULL for global glossary
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(original_term, language, chat_id)
);

-- Create indexes for glossary table
CREATE INDEX idx_glossary_term ON glossary(original_term);
CREATE INDEX idx_glossary_language ON glossary(language);
CREATE INDEX idx_glossary_chat_id ON glossary(chat_id);
CREATE INDEX idx_glossary_created_by ON glossary(created_by);

-- Message reactions table
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(message_id, user_id, emoji)
);

-- Create index for message reactions
CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);

-- Read receipts table
CREATE TABLE read_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(message_id, user_id)
);

-- Create indexes for read receipts
CREATE INDEX idx_read_receipts_message_id ON read_receipts(message_id);
CREATE INDEX idx_read_receipts_user_id ON read_receipts(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_glossary_updated_at BEFORE UPDATE ON glossary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update chat's updated_at when a message is sent
CREATE OR REPLACE FUNCTION update_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats 
  SET updated_at = NOW() 
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update chat when message is inserted
CREATE TRIGGER update_chat_on_message_insert 
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_chat_updated_at();

-- Function to check if user is participant in chat
CREATE OR REPLACE FUNCTION is_participant(user_id UUID, chat_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM chats 
    WHERE id = chat_id 
    AND user_id = ANY(participants)
  );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_count(p_user_id UUID, p_chat_id UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO unread_count
  FROM messages m
  WHERE m.chat_id = p_chat_id
    AND m.sender_id != p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM read_receipts r 
      WHERE r.message_id = m.id 
      AND r.user_id = p_user_id
    )
    AND m.deleted_at IS NULL;
  
  RETURN unread_count;
END;
$$ language 'plpgsql' SECURITY DEFINER;