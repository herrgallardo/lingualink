import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('❌ Missing required environment variables:');
  if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  if (!anonKey) console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

// TypeScript now knows these are defined
const validatedSupabaseUrl = supabaseUrl;
const validatedAnonKey = anonKey;

async function testRLSPolicies(): Promise<void> {
  console.log('\n🔍 Testing RLS Policies...');

  // Create anonymous client - we've already validated these exist above
  const anonClient = createClient(validatedSupabaseUrl, validatedAnonKey);

  const tables = ['users', 'chats', 'messages', 'message_reactions', 'read_receipts'];
  const results: Record<string, { select: boolean; insert: boolean }> = {};

  for (const table of tables) {
    results[table] = { select: false, insert: false };

    // Test SELECT as anonymous
    const { error: selectError } = await anonClient.from(table).select('*').limit(1);

    // RLS should block with code 42501 (insufficient_privilege)
    results[table].select = !selectError || selectError.code !== '42501';

    // Test INSERT as anonymous
    const { error: insertError } = await anonClient.from(table).insert({ id: 'test' }).select();

    results[table].insert = !insertError || insertError.code !== '42501';
  }

  // Display results
  console.log('\n  RLS Policy Test Results:');
  let hasIssues = false;

  for (const [table, perms] of Object.entries(results)) {
    const isSecure = !perms.select && !perms.insert;
    const status = isSecure ? '✅' : '❌';
    const message = `  ${status} ${table}: SELECT=${perms.select ? 'ALLOWED' : 'BLOCKED'}, INSERT=${perms.insert ? 'ALLOWED' : 'BLOCKED'}`;

    if (!isSecure) {
      hasIssues = true;
      console.error(message);
    } else {
      console.log(message);
    }
  }

  if (hasIssues) {
    console.error('\n❌ RLS policies are not properly configured!');
    console.log('💡 Run the fix-rls-policies.sql script to secure your database.');
    return;
  }

  console.log('\n✅ All tables are properly secured with RLS!');
}

async function main() {
  console.log('🔧 LinguaLink RLS Policy Fixer');
  console.log('================================\n');

  try {
    // Test current RLS state
    console.log('1️⃣  Testing current RLS policies...');
    await testRLSPolicies();

    // Ask for confirmation
    console.log('\n⚠️  This script will:');
    console.log('  - Drop all existing RLS policies');
    console.log('  - Create new secure RLS policies');
    console.log('  - Revoke permissions from anonymous users');
    console.log('  - Create performance indexes');

    console.log('\n📝 Note: You may need to run the SQL directly in your Supabase dashboard');
    console.log('   if this script encounters permission errors.\n');

    // For now, just show the SQL file location
    console.log('📄 SQL file location: scripts/fix-rls-policies.sql');
    console.log('\nTo apply these changes:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of scripts/fix-rls-policies.sql');
    console.log('4. Click "Run" to execute the script');
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

main();
