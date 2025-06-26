// scripts/test-chat.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const testEmail = process.env.TEXT_USER_MAIL || 'testuser@test.com';
const testPassword = process.env.TEXT_USER_PASSWORD || 'TestUser101338';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables:');
  if (!supabaseUrl) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) console.error('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('\nPlease check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testChat() {
  console.log('🔍 Testing Chat Setup...\n');

  // Sign in with test user
  console.log('🔐 Signing in test user...');
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (signInError) {
    console.error('❌ Failed to sign in:', signInError.message);
    return;
  }

  // 1. Check authentication
  console.log('\n1️⃣ Checking authentication...');
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('❌ Not authenticated. Please login first.');
    return;
  }

  console.log('✅ Authenticated as:', user.email);
  console.log('   User ID:', user.id);

  // 2. Check user profile
  console.log('\n2️⃣ Checking user profile...');
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('❌ Failed to load profile:', profileError);
    return;
  }

  console.log('✅ Profile found:', profile.username);

  // 3. List user's chats
  console.log("\n3️⃣ Listing user's chats...");
  const { data: chats, error: chatsError } = await supabase
    .from('chats')
    .select('*')
    .contains('participants', [user.id]);

  if (chatsError) {
    console.error('❌ Failed to load chats:', chatsError);
    return;
  }

  console.log(`✅ Found ${chats?.length || 0} chats`);

  if (chats && chats.length > 0) {
    console.log('\n📋 Chat details:');
    for (const chat of chats) {
      console.log(`   - Chat ID: ${chat.id}`);
      console.log(`     Participants: ${chat.participants.join(', ')}`);

      // Check messages in this chat
      const {
        data: messages,
        error: messagesError,
        count,
      } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('chat_id', chat.id)
        .order('timestamp', { ascending: false })
        .limit(5);

      if (messagesError) {
        console.error(`     ❌ Failed to load messages:`, messagesError);
      } else {
        console.log(`     Messages: ${count} total, showing ${messages?.length || 0} recent`);
        if (messages && messages.length > 0) {
          messages.forEach((msg, idx) => {
            console.log(`       ${idx + 1}. "${msg.original_text.substring(0, 50)}..."`);
          });
        }
      }
    }
  }

  // 4. Test RLS policies
  console.log('\n4️⃣ Testing RLS policies...');

  // Test message select
  const { error: selectError } = await supabase.from('messages').select('*').limit(1);

  if (selectError) {
    console.error('❌ Cannot read messages:', selectError.message);
  } else {
    console.log('✅ Can read messages');
  }

  // Test if we can see other users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, username')
    .limit(5);

  if (usersError) {
    console.error('❌ Cannot read users:', usersError.message);
  } else {
    console.log(`✅ Can see ${users?.length || 0} users`);
  }

  // Sign out
  await supabase.auth.signOut();
  console.log('\n✅ Test complete!');
}

// Run the test
testChat().catch(console.error);
