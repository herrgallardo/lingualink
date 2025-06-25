import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TestResult {
  test: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

// Helper to create a unique test user
async function createTestUser() {
  const timestamp = Date.now();
  const testEmail = `test-${timestamp}@example.com`;
  const testPassword = 'testpassword123';

  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        username: `test-user-${timestamp}`,
      },
    },
  });

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('No user created');
  }

  // Create user profile
  await supabase.from('users').insert({
    id: data.user.id,
    email: testEmail,
    username: `test-user-${timestamp}`,
    preferred_language: 'en',
    status: 'available',
    is_typing: false,
    last_seen: new Date().toISOString(),
    preferences: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Wait a moment for the user profile to be created
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    user: data.user,
    email: testEmail,
    password: testPassword,
  };
}

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  console.log(`\n🧪 Running: ${name}`);
  const start = Date.now();

  try {
    await testFn();
    const duration = Date.now() - start;
    results.push({ test: name, passed: true, duration });
    console.log(`✅ Passed (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ test: name, passed: false, error: errorMessage, duration });
    console.error(`❌ Failed: ${errorMessage}`);
  }
}

async function testChannelCreation(): Promise<void> {
  const channelName = `test-channel-${Date.now()}`;
  const channel = supabase.channel(channelName);

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Channel subscription timeout'));
    }, 5000);

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout);
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timeout);
        reject(new Error(`Channel subscription failed: ${status}`));
      }
    });
  });

  await channel.unsubscribe();
  await supabase.removeChannel(channel);
}

async function testMultipleChannels(): Promise<void> {
  const channels: ReturnType<typeof supabase.channel>[] = [];
  const channelCount = 3;

  // Create multiple channels
  for (let i = 0; i < channelCount; i++) {
    const channel = supabase.channel(`test-multi-${i}-${Date.now()}`);
    channels.push(channel);
  }

  // Subscribe to all channels
  await Promise.all(
    channels.map(
      (channel) =>
        new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Channel ${channel.topic} subscription timeout`));
          }, 5000);

          channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              clearTimeout(timeout);
              resolve();
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              clearTimeout(timeout);
              reject(new Error(`Channel ${channel.topic} subscription failed: ${status}`));
            }
          });
        }),
    ),
  );

  // Cleanup
  for (const channel of channels) {
    await channel.unsubscribe();
    await supabase.removeChannel(channel);
  }
}

async function testReconnection(): Promise<void> {
  const channelName = `test-reconnect-${Date.now()}`;
  let channel = supabase.channel(channelName);

  // Initial connection
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Initial subscription timeout'));
    }, 5000);

    channel.subscribe((status) => {
      console.log(`  Initial status: ${status}`);

      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout);
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timeout);
        reject(new Error(`Initial subscription failed: ${status}`));
      }
    });
  });

  // Simulate disconnect
  console.log('  Simulating disconnect...');
  await channel.unsubscribe();
  await supabase.removeChannel(channel);

  // Wait a moment
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Create new channel instance for reconnection
  console.log('  Creating new channel for reconnection...');
  channel = supabase.channel(channelName);

  // Reconnect
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Reconnection timeout'));
    }, 5000);

    channel.subscribe((status) => {
      console.log(`  Reconnect status: ${status}`);
      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout);
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timeout);
        reject(new Error(`Reconnection failed: ${status}`));
      }
    });
  });

  // Final cleanup
  await channel.unsubscribe();
  await supabase.removeChannel(channel);
}

async function testPostgresChanges(): Promise<void> {
  console.log('  Setting up test users...');

  // Create two test users
  const { user: user1, email: user1Email } = await createTestUser();
  const { user: user2 } = await createTestUser();

  // Sign in as the first test user
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user1Email,
    password: 'testpassword123',
  });

  if (signInError) {
    throw new Error(`Failed to sign in: ${signInError.message}`);
  }

  console.log('  Creating test chat...');

  // Use the RPC function to create a direct chat
  const { data: testChatId, error: chatError } = await supabase.rpc('create_or_get_direct_chat', {
    other_user_id: user2.id,
  });

  if (chatError || !testChatId) {
    // Fallback to manual creation
    const { data: chatData, error: createError } = await supabase
      .from('chats')
      .insert({
        participants: [user1.id, user2.id],
      })
      .select()
      .single();

    if (createError || !chatData) {
      throw new Error(
        `Failed to create test chat: ${createError?.message || chatError?.message || 'No chat data'}`,
      );
    }
  }

  console.log(`  Test chat created with ID: ${testChatId}`);

  const channel = supabase.channel(`test-postgres-${Date.now()}`);
  let messageReceived = false;
  let anyEventReceived = false;

  // Set up listener for any postgres changes on messages table
  channel.on(
    'postgres_changes',
    {
      event: '*', // Listen to all events
      schema: 'public',
      table: 'messages',
    },
    (payload) => {
      console.log('  Received ANY event:', {
        eventType: payload.eventType,
        table: payload.table,
        new: payload.new,
        old: payload.old,
      });
      anyEventReceived = true;

      // Check if this is our specific message
      if (payload.eventType === 'INSERT' && payload.new?.chat_id === testChatId) {
        console.log('  ✓ This is our test message!');
        messageReceived = true;
      }
    },
  );

  // Also set up a filtered listener
  channel.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `chat_id=eq.${testChatId}`,
    },
    (payload) => {
      console.log('  Received FILTERED message:', payload);
      messageReceived = true;
    },
  );

  console.log('  Subscribing to channel...');

  // Subscribe to channel
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Channel subscription timeout'));
    }, 10000); // Increased timeout

    channel.subscribe((status) => {
      console.log(`  Channel status: ${status}`);
      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout);
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timeout);
        reject(new Error(`Channel subscription failed: ${status}`));
      }
    });
  });

  // Wait longer for subscription to stabilize
  console.log('  Waiting for subscription to stabilize...');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log('  Inserting test message...');

  // Insert a test message with select to verify it was created
  const { data: insertedMessage, error: insertError } = await supabase
    .from('messages')
    .insert({
      chat_id: testChatId,
      sender_id: user1.id,
      original_text: 'Test message for realtime',
      original_language: 'en',
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to insert message: ${insertError.message}`);
  }

  console.log('  Message inserted successfully:', {
    id: insertedMessage.id,
    chat_id: insertedMessage.chat_id,
    text: insertedMessage.original_text,
  });

  // Also check if we can read the message back
  const { data: _readBack, error: readError } = await supabase
    .from('messages')
    .select('*')
    .eq('id', insertedMessage.id)
    .single();

  if (readError) {
    console.log('  ⚠️  Cannot read message back - possible RLS issue:', readError.message);
  } else {
    console.log('  ✓ Message can be read back');
  }

  // Wait for the message to be received
  console.log('  Waiting for realtime event...');

  await new Promise<void>((resolve, reject) => {
    let waitTime = 0;
    const checkInterval = setInterval(() => {
      waitTime += 100;

      if (waitTime % 1000 === 0) {
        console.log(`  Still waiting... ${waitTime / 1000}s`);
        console.log(`    Any event received: ${anyEventReceived}`);
        console.log(`    Our message received: ${messageReceived}`);
      }

      if (messageReceived) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);

    setTimeout(() => {
      clearInterval(checkInterval);
      if (!messageReceived) {
        const debugInfo = [
          'Message not received within timeout',
          `Any postgres event received: ${anyEventReceived}`,
          `Chat ID: ${testChatId}`,
          `Message ID: ${insertedMessage.id}`,
          '',
          'Troubleshooting:',
          '1. Check if realtime is enabled for messages table in Supabase dashboard',
          '2. Check RLS policies for messages table',
          '3. Try running: npm run test:realtime -- --skip-postgres',
        ].join('\n');

        reject(new Error(debugInfo));
      }
    }, 8000); // Increased timeout
  });

  // Cleanup
  console.log('  Cleaning up...');
  await channel.unsubscribe();
  await supabase.removeChannel(channel);

  // Clean up test data
  await supabase.from('messages').delete().eq('chat_id', testChatId);
  await supabase.from('chats').delete().eq('id', testChatId);
  await supabase.from('users').delete().eq('id', user1.id);
  await supabase.from('users').delete().eq('id', user2.id);

  await supabase.auth.signOut();
}

async function main() {
  console.log('🚀 Testing Supabase Realtime Functionality\n');

  // Check for flags
  const skipPostgres = process.argv.includes('--skip-postgres');

  // Run tests
  await runTest('Channel Creation', testChannelCreation);
  await runTest('Multiple Channels', testMultipleChannels);
  await runTest('Channel Reconnection', testReconnection);

  if (!skipPostgres) {
    await runTest('Postgres Changes', testPostgresChanges);
  } else {
    console.log('\n⏭️  Skipping Postgres Changes test (--skip-postgres flag)');
  }

  // Print summary
  console.log('\n📊 Test Summary:');
  console.log('================');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`- ${r.test}: ${r.error}`);
      });
  }

  // Show performance summary
  console.log('\n⚡ Performance:');
  results.forEach((r) => {
    if (r.passed && r.duration) {
      console.log(`- ${r.test}: ${r.duration}ms`);
    }
  });

  console.log('\n💡 Tips:');
  console.log('- If you see timeout errors in the Realtime Debug Panel, this is normal');
  console.log('- The panel shows all realtime activity, including background presence channels');
  console.log('- Use --skip-postgres flag to skip database tests if needed');
  console.log('\n🔧 Quick Fix for Postgres Changes test:');
  console.log(
    '- Run this SQL in Supabase SQL Editor: ALTER PUBLICATION supabase_realtime ADD TABLE messages;',
  );

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
