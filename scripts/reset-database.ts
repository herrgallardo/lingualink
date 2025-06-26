import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  console.error('\nMake sure these are set in your .env.local file');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
} as const;

interface ResetStats {
  messages: number;
  chats: number;
  users: number;
  readReceipts: number;
  reactions: number;
  notifications: number;
}

async function getTableCount(tableName: string): Promise<number> {
  const { count, error } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.warn(`  ⚠️  Could not count ${tableName}: ${error.message}`);
    return 0;
  }

  return count ?? 0;
}

async function getCurrentStats(): Promise<ResetStats> {
  const [messages, chats, users, readReceipts, reactions, notifications] = await Promise.all([
    getTableCount('messages'),
    getTableCount('chats'),
    getTableCount('users'),
    getTableCount('read_receipts'),
    getTableCount('message_reactions'),
    getTableCount('notifications'),
  ]);

  return {
    messages,
    chats,
    users,
    readReceipts,
    reactions,
    notifications,
  };
}

async function deleteFromTable(tableName: string): Promise<void> {
  console.log(`  Deleting from ${tableName}...`);

  const { error } = await supabase
    .from(tableName)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (workaround for no WHERE clause)

  if (error) {
    // Ignore error if table doesn't exist
    if (error.message.includes('relation') || error.code === '42P01') {
      console.log(`    Table ${tableName} doesn't exist, skipping...`);
      return;
    }
    throw new Error(`Failed to delete from ${tableName}: ${error.message}`);
  }
}

async function waitForConfirmation(): Promise<void> {
  if (process.argv.includes('--force')) {
    console.log(`\n${colors.yellow}⚠️  Force flag detected, skipping confirmation${colors.reset}`);
    return;
  }

  console.log(
    `\n${colors.yellow}⚠️  This will delete all messages, chats, and related data!${colors.reset}`,
  );
  console.log(`${colors.green}✓  User profiles will remain intact${colors.reset}`);
  console.log(`${colors.green}✓  User authentication will remain intact${colors.reset}`);
  console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...');

  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 5000);
  });
}

async function resetDatabase(): Promise<void> {
  console.log(`${colors.cyan}🔄 Starting database reset...${colors.reset}\n`);

  try {
    // 1. Check current data
    console.log(`${colors.blue}📊 Current database state:${colors.reset}`);
    const beforeStats = await getCurrentStats();

    console.log(`  Messages: ${beforeStats.messages}`);
    console.log(`  Chats: ${beforeStats.chats}`);
    console.log(`  Users: ${beforeStats.users}`);
    console.log(`  Read Receipts: ${beforeStats.readReceipts}`);
    console.log(`  Reactions: ${beforeStats.reactions}`);
    console.log(`  Notifications: ${beforeStats.notifications}`);

    // 2. Ask for confirmation
    await waitForConfirmation();

    // 3. Delete data in correct order (most dependent tables first)
    console.log(`\n${colors.blue}🗑️  Deleting data...${colors.reset}`);

    // Delete in dependency order
    await deleteFromTable('read_receipts');
    await deleteFromTable('message_reactions');
    await deleteFromTable('notifications');
    await deleteFromTable('messages');

    // Try to delete chat_participants if it exists (will be skipped if not)
    await deleteFromTable('chat_participants');

    await deleteFromTable('chats');

    // NEVER delete users - keeping all user profiles intact
    console.log('  ✓ Keeping all user profiles intact');

    // 4. Verify cleanup
    console.log(`\n${colors.blue}✅ Verifying cleanup...${colors.reset}`);
    const afterStats = await getCurrentStats();

    console.log(`  Messages: ${afterStats.messages}`);
    console.log(`  Chats: ${afterStats.chats}`);
    console.log(`  Users: ${afterStats.users} (preserved)`);
    console.log(`  Read Receipts: ${afterStats.readReceipts}`);
    console.log(`  Reactions: ${afterStats.reactions}`);
    console.log(`  Notifications: ${afterStats.notifications}`);

    // Verify data was actually deleted (except users)
    const dataDeleted =
      afterStats.messages === 0 &&
      afterStats.chats === 0 &&
      afterStats.readReceipts === 0 &&
      afterStats.reactions === 0;

    if (!dataDeleted) {
      console.warn(
        `\n${colors.yellow}⚠️  Some data may not have been fully deleted${colors.reset}`,
      );
    }

    console.log(`\n${colors.green}✅ Database reset complete!${colors.reset}`);
    console.log(`${colors.cyan}ℹ️  User profiles (public.users) remain intact${colors.reset}`);
    console.log(`${colors.cyan}ℹ️  Authentication data (auth.users) remains intact${colors.reset}`);
    console.log(`${colors.cyan}ℹ️  Users can log in with Google/GitHub as before${colors.reset}\n`);
  } catch (error) {
    console.error(`\n${colors.red}❌ Error resetting database:${colors.reset}`);
    console.error(error instanceof Error ? error.message : String(error));

    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:', error.stack);
    }

    process.exit(1);
  }
}

// Alternative approach using RPC function if available
async function resetDatabaseWithRPC(): Promise<void> {
  try {
    // Check if the RPC function exists
    const { data: _data, error } = await supabase.rpc('reset_chat_data');

    if (error) {
      console.log('RPC function not available, using direct deletes...');
      return resetDatabase();
    }

    console.log('✅ Database reset using RPC function');
    return;
  } catch {
    // Fallback to direct deletes
    return resetDatabase();
  }
}

// Main function
async function main(): Promise<void> {
  try {
    // Try RPC first, fallback to direct deletes
    await resetDatabaseWithRPC();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch((error: unknown) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
