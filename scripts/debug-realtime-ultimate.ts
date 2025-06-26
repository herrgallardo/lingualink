#!/usr/bin/env tsx
/**
 * ULTIMATE REALTIME CHAT DEBUG SCRIPT
 * Save this file as: scripts/debug-realtime-ultimate.ts
 * Run with: npx tsx scripts/debug-realtime-ultimate.ts
 */

import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { Database } from '../lib/types/database';

// Load environment variables
dotenv.config({ path: '.env.local' });

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

// Test user credentials from environment
const TEST_USER1 = {
  email: process.env.TEXT_USER_MAIL || 'testuser@test.com',
  password: process.env.TEXT_USER_PASSWORD || 'TestUser101338',
  username: process.env.TEXT_USER_USERNAME || 'testuser',
};

const TEST_USER2 = {
  email: process.env.TEXT_USER2_MAIL || 'testuser2@test.com',
  password: process.env.TEXT_USER2_PASSWORD || 'TestUser101338',
  username: process.env.TEXT_USER2_USERNAME || 'testuser2',
};

// Global debug state
interface DebugState {
  startTime: number;
  supabaseUrl: string;
  issues: string[];
  fixes: string[];
  user1: {
    client: SupabaseClient<Database> | null;
    session: any;
    profile: any;
    channel: RealtimeChannel | null;
    messagesReceived: any[];
    connectionStatus: string;
  };
  user2: {
    client: SupabaseClient<Database> | null;
    session: any;
    profile: any;
    channel: RealtimeChannel | null;
    messagesReceived: any[];
    connectionStatus: string;
  };
  chatId: string | null;
  testResults: {
    [key: string]: {
      passed: boolean;
      duration: number;
      details: any;
      error?: any;
    };
  };
  realTimeEvents: any[];
  dbMessages: any[];
  timings: { [key: string]: number };
}

const debugState: DebugState = {
  startTime: Date.now(),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  issues: [],
  fixes: [],
  user1: {
    client: null,
    session: null,
    profile: null,
    channel: null,
    messagesReceived: [],
    connectionStatus: 'INITIAL',
  },
  user2: {
    client: null,
    session: null,
    profile: null,
    channel: null,
    messagesReceived: [],
    connectionStatus: 'INITIAL',
  },
  chatId: null,
  testResults: {},
  realTimeEvents: [],
  dbMessages: [],
  timings: {},
};

// Utility functions
function log(
  level: 'info' | 'warn' | 'error' | 'success' | 'debug' | 'title',
  message: string,
  data?: any,
) {
  const timestamp = new Date().toISOString();
  const elapsed = ((Date.now() - debugState.startTime) / 1000).toFixed(2);

  const levelColors = {
    info: colors.blue,
    warn: colors.yellow,
    error: colors.red,
    success: colors.green,
    debug: colors.magenta,
    title: colors.cyan + colors.bright,
  };

  const levelIcons = {
    info: 'ℹ️ ',
    warn: '⚠️ ',
    error: '❌',
    success: '✅',
    debug: '🔍',
    title: '🚀',
  };

  console.log(`${levelColors[level]}[${elapsed}s] ${levelIcons[level]} ${message}${colors.reset}`);

  if (data) {
    console.log(colors.dim + JSON.stringify(data, null, 2) + colors.reset);
  }
}

function startTimer(name: string) {
  debugState.timings[name] = Date.now();
  log('debug', `Timer started: ${name}`);
}

function endTimer(name: string): number {
  const duration = Date.now() - (debugState.timings[name] || Date.now());
  delete debugState.timings[name];
  log('debug', `Timer ended: ${name} (${duration}ms)`);
  return duration;
}

async function sleep(ms: number, reason: string) {
  log('debug', `Sleeping for ${ms}ms - Reason: ${reason}`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function separator(title: string) {
  console.log('\n' + colors.bright + colors.blue + '='.repeat(80) + colors.reset);
  console.log(colors.bright + colors.cyan + `  ${title}` + colors.reset);
  console.log(colors.bright + colors.blue + '='.repeat(80) + colors.reset + '\n');
}

function recordTest(name: string, passed: boolean, duration: number, details: any, error?: any) {
  debugState.testResults[name] = { passed, duration, details, error };

  if (!passed && error) {
    debugState.issues.push(`${name}: ${error.message || error}`);
  }
}

// Main debug function
async function ultimateRealtimeDebug() {
  console.clear();

  console.log(
    colors.bright +
      colors.cyan +
      `
╔══════════════════════════════════════════════════════════════════════════════╗
║                   ULTIMATE REALTIME CHAT DEBUG SCRIPT                        ║
║                        LinguaLink Diagnostics v1.0                           ║
╚══════════════════════════════════════════════════════════════════════════════╝
` +
      colors.reset,
  );

  log('title', 'Starting comprehensive realtime debugging...');
  log('info', 'Environment:', {
    supabaseUrl: debugState.supabaseUrl,
    nodeVersion: process.version,
    platform: process.platform,
    testUser1: TEST_USER1.email,
    testUser2: TEST_USER2.email,
  });

  try {
    // STEP 1: Environment Check
    await testEnvironment();

    // STEP 2: Create Supabase Clients
    await createSupabaseClients();

    // STEP 3: Test Authentication
    await testAuthentication();

    // STEP 4: Test Database Access
    await testDatabaseAccess();

    // STEP 5: Test Basic Realtime
    await testBasicRealtime();

    // STEP 6: Create/Get Chat
    await setupTestChat();

    // STEP 7: Test Realtime Subscriptions
    await testRealtimeSubscriptions();

    // STEP 8: Test Message Flow
    await testMessageFlow();

    // STEP 9: Test Edge Cases
    await testEdgeCases();

    // STEP 10: Generate Report
    await generateReport();
  } catch (error) {
    log('error', 'FATAL ERROR:', error);
    debugState.issues.push(`Fatal error: ${error}`);
  } finally {
    // Cleanup
    await cleanup();
  }
}

// Test functions
async function testEnvironment() {
  separator('STEP 1: ENVIRONMENT CHECK');
  startTimer('environment_check');

  log('info', 'Checking environment variables...');

  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'TEXT_USER_MAIL',
    'TEXT_USER_PASSWORD',
    'TEXT_USER2_MAIL',
    'TEXT_USER2_PASSWORD',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    log('error', 'Missing environment variables:', missing);
    debugState.issues.push('Missing required environment variables');
    debugState.fixes.push('Add missing variables to .env.local');
    throw new Error('Missing environment variables');
  }

  // Validate Supabase URL format
  try {
    const url = new URL(debugState.supabaseUrl);
    log('success', 'Supabase URL is valid:', url.hostname);
  } catch {
    log('error', 'Invalid Supabase URL format');
    throw new Error('Invalid Supabase URL');
  }

  const duration = endTimer('environment_check');
  recordTest('Environment Check', true, duration, { allVariablesPresent: true });

  log('success', 'Environment check passed!');
}

async function createSupabaseClients() {
  separator('STEP 2: CREATE SUPABASE CLIENTS');
  startTimer('create_clients');

  log('info', 'Creating Supabase clients for both test users...');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Create client for User 1
  debugState.user1.client = createClient<Database>(supabaseUrl, supabaseKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
      timeout: 20000,
    },
  });

  // Create client for User 2
  debugState.user2.client = createClient<Database>(supabaseUrl, supabaseKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
      timeout: 20000,
    },
  });

  log('success', 'Supabase clients created successfully');

  // Test basic connectivity
  log('info', 'Testing basic API connectivity...');

  try {
    const { error } = await debugState.user1.client!.from('users').select('id').limit(0);
    if (error && !error.message.includes('JWT')) {
      throw error;
    }
    log('success', 'API connectivity confirmed');
  } catch (error) {
    log('error', 'Cannot connect to Supabase API:', error);
    debugState.issues.push('Cannot connect to Supabase API');
    debugState.fixes.push('Check if Supabase project is active and not paused');
    throw error;
  }

  const duration = endTimer('create_clients');
  recordTest('Client Creation', true, duration, { clientsCreated: 2 });
}

async function testAuthentication() {
  separator('STEP 3: TEST AUTHENTICATION');
  startTimer('authentication');

  // Authenticate User 1
  log('info', `Authenticating User 1: ${TEST_USER1.email}...`);
  startTimer('auth_user1');

  try {
    const { data, error } = await debugState.user1.client!.auth.signInWithPassword({
      email: TEST_USER1.email,
      password: TEST_USER1.password,
    });

    if (error) throw error;

    debugState.user1.session = data;
    const authTime1 = endTimer('auth_user1');

    log('success', `User 1 authenticated in ${authTime1}ms`, {
      userId: data.user?.id,
      email: data.user?.email,
    });

    // Load User 1 profile
    const { data: profile1, error: profileError1 } = await debugState.user1
      .client!.from('users')
      .select('*')
      .eq('id', data.user!.id)
      .single();

    if (profileError1) {
      log('error', 'User 1 profile not found:', profileError1);
      debugState.issues.push('User 1 profile missing in database');
      debugState.fixes.push('Ensure user profiles are created on signup');
    } else {
      debugState.user1.profile = profile1;
      log('success', 'User 1 profile loaded', profile1);
    }
  } catch (error) {
    log('error', 'User 1 authentication failed:', error);
    recordTest('User 1 Authentication', false, 0, {}, error);
    throw error;
  }

  // Authenticate User 2
  log('info', `Authenticating User 2: ${TEST_USER2.email}...`);
  startTimer('auth_user2');

  try {
    const { data, error } = await debugState.user2.client!.auth.signInWithPassword({
      email: TEST_USER2.email,
      password: TEST_USER2.password,
    });

    if (error) throw error;

    debugState.user2.session = data;
    const authTime2 = endTimer('auth_user2');

    log('success', `User 2 authenticated in ${authTime2}ms`, {
      userId: data.user?.id,
      email: data.user?.email,
    });

    // Load User 2 profile
    const { data: profile2, error: profileError2 } = await debugState.user2
      .client!.from('users')
      .select('*')
      .eq('id', data.user!.id)
      .single();

    if (profileError2) {
      log('error', 'User 2 profile not found:', profileError2);
      debugState.issues.push('User 2 profile missing in database');
      debugState.fixes.push('Ensure user profiles are created on signup');
    } else {
      debugState.user2.profile = profile2;
      log('success', 'User 2 profile loaded', profile2);
    }
  } catch (error) {
    log('error', 'User 2 authentication failed:', error);
    recordTest('User 2 Authentication', false, 0, {}, error);
    throw error;
  }

  const duration = endTimer('authentication');
  recordTest('Authentication', true, duration, {
    user1: debugState.user1.session?.user?.id,
    user2: debugState.user2.session?.user?.id,
  });

  log('success', 'Both users authenticated successfully!');
}

async function testDatabaseAccess() {
  separator('STEP 4: TEST DATABASE ACCESS');
  startTimer('database_access');

  // Test messages table access for User 1
  log('info', 'Testing User 1 access to messages table...');

  try {
    const { data, error, count } = await debugState.user1
      .client!.from('messages')
      .select('*', { count: 'exact', head: true });

    if (error) {
      log('error', 'User 1 cannot access messages table:', error);
      debugState.issues.push('User 1 cannot read messages table');
      debugState.fixes.push('Check RLS policies for messages table');

      // Provide specific SQL fix
      debugState.fixes.push(`
Run this SQL:
CREATE POLICY "Users can view messages in their chats"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chats
    WHERE chats.id = messages.chat_id
    AND auth.uid() = ANY(chats.participants)
  )
);`);
    } else {
      log('success', `User 1 can access messages table (${count} total messages)`);
    }
  } catch (error) {
    log('error', 'Messages table query failed:', error);
  }

  // Test chats table access
  log('info', 'Testing access to chats table...');

  try {
    const { data, error } = await debugState.user1.client!.from('chats').select('*').limit(5);

    if (error) {
      log('error', 'Cannot access chats table:', error);
      debugState.issues.push('Cannot read chats table');
    } else {
      log('success', `Can access chats table (found ${data.length} chats)`);
    }
  } catch (error) {
    log('error', 'Chats table query failed:', error);
  }

  // Test RLS by trying to access a chat we're not part of
  log('info', 'Testing RLS policies...');

  const dummyChatId = '00000000-0000-0000-0000-000000000000';
  const { error: rlsError } = await debugState.user1
    .client!.from('messages')
    .select('*')
    .eq('chat_id', dummyChatId)
    .limit(1);

  if (rlsError && rlsError.message.includes('row-level security')) {
    log('success', 'RLS is properly blocking unauthorized access');
  } else {
    log('warn', 'RLS might be too permissive or disabled');
    debugState.issues.push('RLS policies might be too permissive');
  }

  const duration = endTimer('database_access');
  recordTest('Database Access', true, duration, { tablesAccessible: true });
}

async function testBasicRealtime() {
  separator('STEP 5: TEST BASIC REALTIME CONNECTION');
  startTimer('basic_realtime');

  log('info', 'Testing basic WebSocket connectivity...');

  const testChannel = debugState.user1.client!.channel('test-basic-connection');
  let connected = false;
  let connectionError = null;

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      log('error', 'Basic realtime connection timeout after 10 seconds');
      connectionError = 'Connection timeout';
      resolve();
    }, 10000);

    testChannel.subscribe((status) => {
      log('debug', `Test channel status: ${status}`);

      if (status === 'SUBSCRIBED') {
        connected = true;
        clearTimeout(timeout);
        log('success', 'WebSocket connection established!');
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        connectionError = status;
        clearTimeout(timeout);
        log('error', `WebSocket connection failed: ${status}`);
        resolve();
      }
    });
  });

  await debugState.user1.client!.removeChannel(testChannel);

  if (!connected) {
    debugState.issues.push('Cannot establish WebSocket connection');
    debugState.fixes.push('Check if Supabase project is active');
    debugState.fixes.push('Check browser/network for WebSocket blocking');
    debugState.fixes.push('Try disabling VPN or proxy');
  }

  const duration = endTimer('basic_realtime');
  recordTest('Basic Realtime', connected, duration, {
    status: connected ? 'connected' : connectionError,
  });

  // Test realtime on messages table specifically
  log('info', 'Testing realtime subscription on messages table...');
  startTimer('messages_realtime');

  const messagesChannel = debugState.user1.client!.channel('test-messages-realtime');
  let messagesRealtimeWorks = false;
  let receivedTestEvent = false;

  messagesChannel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'messages',
    },
    (payload) => {
      log('debug', 'Received messages table event:', payload);
      receivedTestEvent = true;
      debugState.realTimeEvents.push(payload);
    },
  );

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      log('warn', 'Messages realtime subscription timeout');
      resolve();
    }, 8000);

    messagesChannel.subscribe((status) => {
      log('debug', `Messages channel status: ${status}`);

      if (status === 'SUBSCRIBED') {
        messagesRealtimeWorks = true;
        log('success', 'Subscribed to messages table realtime');

        // Wait a bit for any events
        setTimeout(() => resolve(), 3000);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timeout);
        resolve();
      }
    });
  });

  await debugState.user1.client!.removeChannel(messagesChannel);

  if (!messagesRealtimeWorks) {
    debugState.issues.push('Cannot subscribe to messages table realtime');
    debugState.fixes.push(`
Run this SQL in Supabase Dashboard:
ALTER PUBLICATION supabase_realtime ADD TABLE messages;`);
  }

  const messagesRealtimeDuration = endTimer('messages_realtime');
  recordTest('Messages Realtime', messagesRealtimeWorks, messagesRealtimeDuration, {
    subscribed: messagesRealtimeWorks,
    eventsReceived: receivedTestEvent,
  });
}

async function setupTestChat() {
  separator('STEP 6: CREATE/GET TEST CHAT');
  startTimer('setup_chat');

  log('info', 'Creating or getting direct chat between test users...');

  try {
    const { data: chatId, error } = await debugState.user1.client!.rpc(
      'create_or_get_direct_chat',
      {
        other_user_id: debugState.user2.session.user.id,
      },
    );

    if (error) {
      log('error', 'RPC create_or_get_direct_chat failed:', error);

      // Fallback: manually create chat
      log('warn', 'Trying fallback: manual chat creation...');

      const { data: newChat, error: createError } = await debugState.user1
        .client!.from('chats')
        .insert({
          participants: [debugState.user1.session.user.id, debugState.user2.session.user.id],
        })
        .select()
        .single();

      if (createError) {
        log('error', 'Manual chat creation also failed:', createError);
        throw createError;
      }

      debugState.chatId = newChat.id;
      log('success', 'Chat created manually:', newChat.id);
    } else {
      debugState.chatId = chatId;
      log('success', 'Chat retrieved/created:', chatId);
    }

    // Verify chat exists and has correct participants
    log('info', 'Verifying chat configuration...');

    const { data: chatData, error: verifyError } = await debugState.user1
      .client!.from('chats')
      .select('*')
      .eq('id', debugState.chatId)
      .single();

    if (verifyError) {
      log('error', 'Cannot verify chat:', verifyError);
      throw verifyError;
    }

    const hasUser1 = chatData.participants.includes(debugState.user1.session.user.id);
    const hasUser2 = chatData.participants.includes(debugState.user2.session.user.id);

    log('info', 'Chat verification:', {
      chatId: chatData.id,
      participants: chatData.participants,
      hasUser1,
      hasUser2,
      createdAt: chatData.created_at,
    });

    if (!hasUser1 || !hasUser2) {
      throw new Error('Chat does not include both test users');
    }

    // Load existing messages
    log('info', 'Loading existing messages in chat...');

    const { data: existingMessages, error: messagesError } = await debugState.user1
      .client!.from('messages')
      .select('*')
      .eq('chat_id', debugState.chatId)
      .order('timestamp', { ascending: true });

    if (messagesError) {
      log('error', 'Cannot load existing messages:', messagesError);
    } else {
      debugState.dbMessages = existingMessages || [];
      log('info', `Found ${existingMessages?.length || 0} existing messages in chat`);
    }
  } catch (error) {
    log('error', 'Chat setup failed:', error);
    recordTest('Chat Setup', false, 0, {}, error);
    throw error;
  }

  const duration = endTimer('setup_chat');
  recordTest('Chat Setup', true, duration, { chatId: debugState.chatId });

  log('success', 'Chat setup completed!');
}

async function testRealtimeSubscriptions() {
  separator('STEP 7: TEST REALTIME SUBSCRIPTIONS');
  startTimer('realtime_subscriptions');

  log('info', 'Setting up realtime subscriptions for both users...');

  // User 1 Channel Setup
  log('info', 'Setting up User 1 realtime channel...');
  startTimer('user1_subscription');

  debugState.user1.channel = debugState.user1.client!.channel(`chat:${debugState.chatId}:user1`);

  // Set up all event listeners for User 1
  debugState.user1.channel
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${debugState.chatId}`,
      },
      (payload) => {
        log('debug', '[USER 1] Received INSERT event:', {
          id: payload.new.id,
          text: (payload.new as any).original_text,
          sender: payload.new.sender_id,
        });
        debugState.user1.messagesReceived.push(payload);
        debugState.realTimeEvents.push({ user: 1, type: 'INSERT', payload });
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${debugState.chatId}`,
      },
      (payload) => {
        log('debug', '[USER 1] Received UPDATE event:', payload.new.id);
        debugState.realTimeEvents.push({ user: 1, type: 'UPDATE', payload });
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        log('debug', '[USER 1] Received ANY messages event (unfiltered):', {
          type: payload.eventType,
          chatId: (payload.new as any)?.chat_id,
          ourChatId: debugState.chatId,
        });
      },
    );

  // Subscribe User 1
  const user1Connected = await new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      log('error', '[USER 1] Subscription timeout!');
      debugState.user1.connectionStatus = 'TIMEOUT';
      resolve(false);
    }, 15000);

    debugState.user1.channel!.subscribe((status) => {
      log('info', `[USER 1] Channel status: ${status}`);
      debugState.user1.connectionStatus = status;

      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout);
        const subTime = endTimer('user1_subscription');
        log('success', `[USER 1] Subscribed successfully in ${subTime}ms`);
        resolve(true);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timeout);
        log('error', `[USER 1] Subscription failed: ${status}`);
        resolve(false);
      }
    });
  });

  // User 2 Channel Setup
  log('info', 'Setting up User 2 realtime channel...');
  startTimer('user2_subscription');

  debugState.user2.channel = debugState.user2.client!.channel(`chat:${debugState.chatId}:user2`);

  // Set up all event listeners for User 2
  debugState.user2.channel
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${debugState.chatId}`,
      },
      (payload) => {
        log('debug', '[USER 2] Received INSERT event:', {
          id: payload.new.id,
          text: (payload.new as any).original_text,
          sender: payload.new.sender_id,
        });
        debugState.user2.messagesReceived.push(payload);
        debugState.realTimeEvents.push({ user: 2, type: 'INSERT', payload });
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${debugState.chatId}`,
      },
      (payload) => {
        log('debug', '[USER 2] Received UPDATE event:', payload.new.id);
        debugState.realTimeEvents.push({ user: 2, type: 'UPDATE', payload });
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        log('debug', '[USER 2] Received ANY messages event (unfiltered):', {
          type: payload.eventType,
          chatId: (payload.new as any)?.chat_id,
          ourChatId: debugState.chatId,
        });
      },
    );

  // Subscribe User 2
  const user2Connected = await new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      log('error', '[USER 2] Subscription timeout!');
      debugState.user2.connectionStatus = 'TIMEOUT';
      resolve(false);
    }, 15000);

    debugState.user2.channel!.subscribe((status) => {
      log('info', `[USER 2] Channel status: ${status}`);
      debugState.user2.connectionStatus = status;

      if (status === 'SUBSCRIBED') {
        clearTimeout(timeout);
        const subTime = endTimer('user2_subscription');
        log('success', `[USER 2] Subscribed successfully in ${subTime}ms`);
        resolve(true);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timeout);
        log('error', `[USER 2] Subscription failed: ${status}`);
        resolve(false);
      }
    });
  });

  // Wait for subscriptions to stabilize
  log('info', 'Waiting for subscriptions to stabilize...');
  await sleep(3000, 'Subscription stabilization');

  const duration = endTimer('realtime_subscriptions');
  recordTest('Realtime Subscriptions', user1Connected && user2Connected, duration, {
    user1Connected,
    user2Connected,
    user1Status: debugState.user1.connectionStatus,
    user2Status: debugState.user2.connectionStatus,
  });

  if (!user1Connected || !user2Connected) {
    debugState.issues.push('One or both users failed to subscribe to realtime');
    debugState.fixes.push('Check WebSocket connectivity');
    debugState.fixes.push('Verify realtime is enabled for messages table');
  }
}

async function testMessageFlow() {
  separator('STEP 8: TEST MESSAGE FLOW');
  startTimer('message_flow');

  // Clear previous received messages
  debugState.user1.messagesReceived = [];
  debugState.user2.messagesReceived = [];
  debugState.realTimeEvents = [];

  // Test 1: User 1 sends a message
  log('title', 'Test 1: User 1 sends a message');
  const testMessage1 = `Test message from User 1 - ${Date.now()}`;

  log('info', `[USER 1] Sending: "${testMessage1}"`);
  startTimer('send_message1');

  try {
    const { data: sentMessage1, error: sendError1 } = await debugState.user1
      .client!.from('messages')
      .insert({
        chat_id: debugState.chatId!,
        sender_id: debugState.user1.session.user.id,
        original_text: testMessage1,
        original_language: 'en',
      })
      .select()
      .single();

    if (sendError1) {
      log('error', '[USER 1] Failed to send message:', sendError1);
      throw sendError1;
    }

    const sendTime1 = endTimer('send_message1');
    log('success', `[USER 1] Message sent in ${sendTime1}ms`, {
      id: sentMessage1.id,
      timestamp: sentMessage1.timestamp,
    });

    // Wait for realtime propagation
    log('info', 'Waiting for realtime propagation...');
    await sleep(5000, 'Message 1 propagation');

    // Analyze results
    log('info', 'Analyzing message 1 results...');

    const user1ReceivedOwn = debugState.user1.messagesReceived.some(
      (m) => m.new?.id === sentMessage1.id,
    );
    const user2ReceivedMessage = debugState.user2.messagesReceived.some(
      (m) => m.new?.id === sentMessage1.id,
    );

    log(
      user1ReceivedOwn ? 'success' : 'error',
      `[USER 1] Received own message: ${user1ReceivedOwn ? 'YES' : 'NO'}`,
    );
    log(
      user2ReceivedMessage ? 'success' : 'error',
      `[USER 2] Received User 1's message: ${user2ReceivedMessage ? 'YES' : 'NO'}`,
    );

    if (!user1ReceivedOwn || !user2ReceivedMessage) {
      debugState.issues.push('Message 1 not received by all users in realtime');
    }

    recordTest('Message 1 Flow', user1ReceivedOwn && user2ReceivedMessage, sendTime1, {
      sent: true,
      user1Received: user1ReceivedOwn,
      user2Received: user2ReceivedMessage,
    });
  } catch (error) {
    log('error', 'Message 1 test failed:', error);
    recordTest('Message 1 Flow', false, 0, {}, error);
  }

  // Test 2: User 2 sends a message
  log('title', 'Test 2: User 2 sends a message');

  // Clear received messages
  debugState.user1.messagesReceived = [];
  debugState.user2.messagesReceived = [];

  const testMessage2 = `Test message from User 2 - ${Date.now()}`;

  log('info', `[USER 2] Sending: "${testMessage2}"`);
  startTimer('send_message2');

  try {
    const { data: sentMessage2, error: sendError2 } = await debugState.user2
      .client!.from('messages')
      .insert({
        chat_id: debugState.chatId!,
        sender_id: debugState.user2.session.user.id,
        original_text: testMessage2,
        original_language: 'en',
      })
      .select()
      .single();

    if (sendError2) {
      log('error', '[USER 2] Failed to send message:', sendError2);
      throw sendError2;
    }

    const sendTime2 = endTimer('send_message2');
    log('success', `[USER 2] Message sent in ${sendTime2}ms`, {
      id: sentMessage2.id,
      timestamp: sentMessage2.timestamp,
    });

    // Wait for realtime propagation
    log('info', 'Waiting for realtime propagation...');
    await sleep(5000, 'Message 2 propagation');

    // Analyze results
    log('info', 'Analyzing message 2 results...');

    const user2ReceivedOwn = debugState.user2.messagesReceived.some(
      (m) => m.new?.id === sentMessage2.id,
    );
    const user1ReceivedMessage = debugState.user1.messagesReceived.some(
      (m) => m.new?.id === sentMessage2.id,
    );

    log(
      user2ReceivedOwn ? 'success' : 'error',
      `[USER 2] Received own message: ${user2ReceivedOwn ? 'YES' : 'NO'}`,
    );
    log(
      user1ReceivedMessage ? 'success' : 'error',
      `[USER 1] Received User 2's message: ${user1ReceivedMessage ? 'YES' : 'NO'}`,
    );

    if (!user2ReceivedOwn || !user1ReceivedMessage) {
      debugState.issues.push('Message 2 not received by all users in realtime');
    }

    recordTest('Message 2 Flow', user2ReceivedOwn && user1ReceivedMessage, sendTime2, {
      sent: true,
      user2Received: user2ReceivedOwn,
      user1Received: user1ReceivedMessage,
    });
  } catch (error) {
    log('error', 'Message 2 test failed:', error);
    recordTest('Message 2 Flow', false, 0, {}, error);
  }

  // Test 3: Rapid message sending
  log('title', 'Test 3: Rapid message sending');

  debugState.user1.messagesReceived = [];
  debugState.user2.messagesReceived = [];

  const rapidMessages = 5;
  log('info', `Sending ${rapidMessages} rapid messages...`);

  for (let i = 0; i < rapidMessages; i++) {
    const rapidMessage = `Rapid message ${i + 1} - ${Date.now()}`;

    await debugState.user1
      .client!.from('messages')
      .insert({
        chat_id: debugState.chatId!,
        sender_id: debugState.user1.session.user.id,
        original_text: rapidMessage,
        original_language: 'en',
      })
      .select();

    await sleep(100, 'Between rapid messages');
  }

  log('info', 'Waiting for rapid messages to propagate...');
  await sleep(5000, 'Rapid messages propagation');

  log('info', `User 1 received ${debugState.user1.messagesReceived.length} rapid messages`);
  log('info', `User 2 received ${debugState.user2.messagesReceived.length} rapid messages`);

  const duration = endTimer('message_flow');
  recordTest('Message Flow', true, duration, {
    totalEventsReceived: debugState.realTimeEvents.length,
  });
}

async function testEdgeCases() {
  separator('STEP 9: TEST EDGE CASES');
  startTimer('edge_cases');

  // Test 1: Message update
  log('title', 'Edge Case 1: Message Update');

  // First, send a message
  const { data: messageToUpdate } = await debugState.user1
    .client!.from('messages')
    .insert({
      chat_id: debugState.chatId!,
      sender_id: debugState.user1.session.user.id,
      original_text: 'Message to be updated',
      original_language: 'en',
    })
    .select()
    .single();

  await sleep(2000, 'Before update');

  // Clear events
  debugState.realTimeEvents = [];

  // Update the message
  const { error: updateError } = await debugState.user1
    .client!.from('messages')
    .update({
      original_text: 'Updated message content',
      edited_at: new Date().toISOString(),
    })
    .eq('id', messageToUpdate!.id);

  if (updateError) {
    log('error', 'Failed to update message:', updateError);
  } else {
    log('success', 'Message updated successfully');
  }

  await sleep(3000, 'Update propagation');

  const updateEvents = debugState.realTimeEvents.filter((e) => e.type === 'UPDATE');
  log('info', `Received ${updateEvents.length} UPDATE events`);

  // Test 2: Connection recovery
  log('title', 'Edge Case 2: Connection Recovery');

  // This would require actually disrupting the connection, which is difficult to simulate
  log('info', 'Connection recovery test skipped (requires network manipulation)');

  // Test 3: Query messages directly
  log('title', 'Edge Case 3: Direct Message Query');

  const { data: allMessages, error: queryError } = await debugState.user1
    .client!.from('messages')
    .select('*')
    .eq('chat_id', debugState.chatId!)
    .order('timestamp', { ascending: false })
    .limit(10);

  if (queryError) {
    log('error', 'Failed to query messages:', queryError);
  } else {
    log('success', `Direct query returned ${allMessages?.length || 0} messages`);
  }

  const duration = endTimer('edge_cases');
  recordTest('Edge Cases', true, duration, {
    updateEventsReceived: updateEvents.length,
    directQueryWorking: !queryError,
  });
}

async function generateReport() {
  separator('FINAL REPORT');

  console.log('\n' + colors.bright + colors.cyan + '📊 TEST RESULTS SUMMARY' + colors.reset);
  console.log('─'.repeat(80));

  // Test results table
  Object.entries(debugState.testResults).forEach(([name, result]) => {
    const status = result.passed
      ? colors.green + '✅ PASSED' + colors.reset
      : colors.red + '❌ FAILED' + colors.reset;
    const duration = colors.dim + `(${result.duration}ms)` + colors.reset;

    console.log(`${name.padEnd(30)} ${status} ${duration}`);

    if (!result.passed && result.error) {
      console.log(
        colors.red + `  └─ Error: ${result.error.message || result.error}` + colors.reset,
      );
    }
  });

  console.log('\n' + colors.bright + colors.yellow + '🔍 ISSUES FOUND' + colors.reset);
  console.log('─'.repeat(80));

  if (debugState.issues.length === 0) {
    console.log(
      colors.green + 'No issues found! Realtime should be working correctly.' + colors.reset,
    );
  } else {
    debugState.issues.forEach((issue, index) => {
      console.log(colors.red + `${index + 1}. ${issue}` + colors.reset);
    });
  }

  console.log('\n' + colors.bright + colors.green + '🔧 RECOMMENDED FIXES' + colors.reset);
  console.log('─'.repeat(80));

  if (debugState.fixes.length === 0) {
    console.log('No fixes needed.');
  } else {
    debugState.fixes.forEach((fix, index) => {
      console.log(colors.cyan + `${index + 1}. ${fix}` + colors.reset);
    });
  }

  // Most likely issue
  console.log('\n' + colors.bright + colors.magenta + '🎯 MOST LIKELY ISSUE' + colors.reset);
  console.log('─'.repeat(80));

  if (debugState.issues.includes('Cannot subscribe to messages table realtime')) {
    console.log(colors.yellow + 'Realtime is not enabled for the messages table.' + colors.reset);
    console.log('\n' + colors.bright + 'Run this SQL in Supabase Dashboard:' + colors.reset);
    console.log(colors.green + '```sql');
    console.log('ALTER PUBLICATION supabase_realtime ADD TABLE messages;');
    console.log('```' + colors.reset);
  } else if (
    debugState.issues.includes('Message 1 not received by all users in realtime') ||
    debugState.issues.includes('Message 2 not received by all users in realtime')
  ) {
    console.log(colors.yellow + 'RLS policies might be blocking realtime events.' + colors.reset);
    console.log('\n' + colors.bright + 'Ensure this RLS policy exists:' + colors.reset);
    console.log(colors.green + '```sql');
    console.log('CREATE POLICY "Users can view messages in their chats"');
    console.log('ON messages FOR SELECT');
    console.log('USING (');
    console.log('  EXISTS (');
    console.log('    SELECT 1 FROM chats');
    console.log('    WHERE chats.id = messages.chat_id');
    console.log('    AND auth.uid() = ANY(chats.participants)');
    console.log('  )');
    console.log(');');
    console.log('```' + colors.reset);
  } else if (debugState.issues.includes('Cannot establish WebSocket connection')) {
    console.log(colors.yellow + 'WebSocket connection is being blocked.' + colors.reset);
    console.log('1. Check if Supabase project is active (not paused)');
    console.log('2. Check browser console for CORS or WebSocket errors');
    console.log('3. Try disabling browser extensions');
    console.log('4. Check firewall/VPN settings');
  }

  // Statistics
  console.log('\n' + colors.bright + colors.blue + '📈 STATISTICS' + colors.reset);
  console.log('─'.repeat(80));
  console.log(`Total execution time: ${((Date.now() - debugState.startTime) / 1000).toFixed(2)}s`);
  console.log(`Realtime events received: ${debugState.realTimeEvents.length}`);
  console.log(`User 1 messages received: ${debugState.user1.messagesReceived.length}`);
  console.log(`User 2 messages received: ${debugState.user2.messagesReceived.length}`);
  console.log(`Database messages found: ${debugState.dbMessages.length}`);

  // Save detailed log
  const logFilename = `realtime-debug-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  console.log('\n' + colors.dim + `Full debug data saved to: ${logFilename}` + colors.reset);

  const fs = await import('fs');
  fs.writeFileSync(
    logFilename,
    JSON.stringify(
      {
        ...debugState,
        user1: {
          ...debugState.user1,
          client: undefined,
          channel: undefined,
          session: { userId: debugState.user1.session?.user?.id },
        },
        user2: {
          ...debugState.user2,
          client: undefined,
          channel: undefined,
          session: { userId: debugState.user2.session?.user?.id },
        },
      },
      null,
      2,
    ),
  );
}

async function cleanup() {
  log('info', 'Cleaning up...');

  try {
    // Unsubscribe channels
    if (debugState.user1.channel) {
      await debugState.user1.channel.unsubscribe();
      await debugState.user1.client!.removeChannel(debugState.user1.channel);
    }

    if (debugState.user2.channel) {
      await debugState.user2.channel.unsubscribe();
      await debugState.user2.client!.removeChannel(debugState.user2.channel);
    }

    // Sign out
    await debugState.user1.client?.auth.signOut();
    await debugState.user2.client?.auth.signOut();

    log('success', 'Cleanup completed');
  } catch (error) {
    log('error', 'Cleanup error:', error);
  }
}

// Run the ultimate debug script
console.log('Starting in 2 seconds...\n');
setTimeout(() => {
  ultimateRealtimeDebug().catch((error) => {
    console.error(colors.red + '\n💥 FATAL ERROR:' + colors.reset, error);
    process.exit(1);
  });
}, 2000);
