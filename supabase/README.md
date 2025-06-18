# LinguaLink Database Setup

This directory contains all the SQL migrations for setting up the LinguaLink database schema in Supabase.

## Migration Files

1. **001_initial_schema.sql** - Core tables and indexes

   - Users table with profile information
   - Chats table for conversations
   - Messages table with translation support
   - Glossary for custom translations
   - Message reactions and read receipts

2. **002_rls_policies.sql** - Row Level Security policies

   - Ensures users can only access their own data
   - Implements proper access control for all tables

3. **003_storage_setup.sql** - Storage buckets configuration

   - Avatars bucket for user profile pictures
   - Message attachments bucket for file sharing

4. **004_realtime_setup.sql** - Realtime features

   - Enables realtime updates for messages, reactions, etc.
   - Creates views for optimized data fetching
   - Implements typing indicators

5. **005_performance_optimization.sql** - Performance enhancements
   - Additional indexes for common queries
   - Materialized views for statistics
   - Search functionality

## Running Migrations

### Option 1: Supabase Dashboard (Recommended for initial setup)

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the sidebar
3. Click "New query"
4. Copy and paste each migration file in order:
   - Start with `001_initial_schema.sql`
   - Run the query
   - Continue with `002_rls_policies.sql`, etc.
5. Run each migration one at a time

**Note**: If you encounter syntax errors with functions (especially with `$` delimiters), you may need to:

- Run each CREATE FUNCTION statement separately
- Ensure there are no extra spaces or line breaks between `AS` and `$`
- Check that dollar quotes are properly paired (`$` at both start and end)

### Option 2: Using Supabase CLI

1. Install the Supabase CLI:

   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:

   ```bash
   supabase login
   ```

3. Link your project:

   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Run migrations:
   ```bash
   supabase db push
   ```

### Option 3: Direct Connection

If you have direct database access:

```bash
psql -h your-project.supabase.co -p 5432 -d postgres -U postgres -f migrations/001_initial_schema.sql
# Enter password when prompted
# Repeat for each migration file
```

## Post-Migration Steps

After running all migrations:

1. **Verify Tables**: Check that all tables are created in the Supabase dashboard under "Table Editor"

2. **Test RLS Policies**: Try inserting/selecting data to ensure policies work correctly

3. **Check Storage Buckets**: Verify that 'avatars' and 'message-attachments' buckets exist

4. **Enable Realtime**:

   - Go to "Table Editor" in the sidebar
   - Click on each table: `users`, `messages`, `message_reactions`, `read_receipts`
   - Toggle the "Realtime" button ON in the toolbar
   - Alternatively, run the SQL in `004_realtime_setup.sql`

5. **Generate TypeScript Types** (Optional):
   ```bash
   npx supabase gen types typescript --project-ref your-project-ref > lib/types/database.generated.ts
   ```

## Important Notes

- The migrations assume you have auth.users table (created automatically by Supabase Auth)
- All timestamps are stored in UTC
- The database uses UUID v4 for all IDs
- Text search is enabled using PostgreSQL's pg_trgm extension

## Troubleshooting

### "Extension not found" error

Make sure to enable required extensions in Supabase dashboard under "Database > Extensions":

- uuid-ossp
- pg_trgm

### "Permission denied" error

Ensure you're running migrations as a user with sufficient privileges (usually the postgres user)

### "Table already exists" error

If re-running migrations, you may need to drop existing tables first. Be careful with production data!

## Schema Diagram

```
users
├── id (UUID, PK, FK to auth.users)
├── email (TEXT, UNIQUE)
├── username (TEXT, UNIQUE)
├── avatar_url (TEXT)
├── preferred_language (TEXT)
├── status (ENUM)
├── is_typing (BOOLEAN)
└── last_seen (TIMESTAMP)

chats
├── id (UUID, PK)
├── participants (UUID[])
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

messages
├── id (UUID, PK)
├── chat_id (UUID, FK to chats)
├── sender_id (UUID, FK to users)
├── original_text (TEXT)
├── original_language (TEXT)
├── translations (JSONB)
├── timestamp (TIMESTAMP)
├── edited_at (TIMESTAMP)
└── deleted_at (TIMESTAMP)

message_reactions
├── id (UUID, PK)
├── message_id (UUID, FK to messages)
├── user_id (UUID, FK to users)
├── emoji (TEXT)
└── created_at (TIMESTAMP)

read_receipts
├── id (UUID, PK)
├── message_id (UUID, FK to messages)
├── user_id (UUID, FK to users)
└── read_at (TIMESTAMP)

glossary
├── id (UUID, PK)
├── original_term (TEXT)
├── language (TEXT)
├── translated_term (TEXT)
├── created_by (UUID, FK to users)
├── chat_id (UUID, FK to chats, NULLABLE)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```
