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
  // First, create a test user if it doesn't exist
  const testEmail = 'test@example.com';
  const testPassword = 'testpassword123';

  // Try to sign up first
  const { error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
  });

  // If signup fails with user already exists, try to sign in
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (authError && !signUpError) {
    throw new Error(`Auth failed: ${authError?.message || 'No user'}`);
  }

  const user = authData?.user || (await supabase.auth.getUser()).data.user;
  if (!user) {
    throw new Error('No authenticated user');
  }

  const testChatId = `test-chat-${Date.now()}`;
  const channel = supabase.channel(`test-postgres-${Date.now()}`);
  let messageReceived = false;

  // Set up listener first
  channel.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `chat_id=eq.${testChatId}`,
    },
    (payload) => {
      console.log('  Received message:', payload);
      messageReceived = true;
    },
  );

  // Subscribe to channel
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

  // Wait a moment for subscription to stabilize
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Insert a test message
  const { error: insertError } = await supabase.from('messages').insert({
    chat_id: testChatId,
    sender_id: user.id,
    original_text: 'Test message',
    original_language: 'en',
  });

  if (insertError) {
    throw new Error(`Failed to insert message: ${insertError.message}`);
  }

  // Wait for the message to be received
  await new Promise<void>((resolve, reject) => {
    const checkInterval = setInterval(() => {
      if (messageReceived) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);

    setTimeout(() => {
      clearInterval(checkInterval);
      if (!messageReceived) {
        reject(new Error('Message not received within timeout'));
      }
    }, 5000);
  });

  // Cleanup
  await channel.unsubscribe();
  await supabase.removeChannel(channel);
  await supabase.auth.signOut();
}

async function main() {
  console.log('🚀 Testing Supabase Realtime Functionality\n');

  // Run tests
  await runTest('Channel Creation', testChannelCreation);
  await runTest('Multiple Channels', testMultipleChannels);
  await runTest('Channel Reconnection', testReconnection);
  await runTest('Postgres Changes', testPostgresChanges);

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

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
