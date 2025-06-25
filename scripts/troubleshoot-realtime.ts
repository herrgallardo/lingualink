import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkEnvironment() {
  log('\n🔍 Checking Environment Variables...', 'cyan');

  const checks = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', value: supabaseUrl, required: true },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: supabaseKey, required: true },
    {
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      value: process.env.SUPABASE_SERVICE_ROLE_KEY,
      required: false,
    },
  ];

  let hasErrors = false;

  for (const check of checks) {
    if (!check.value && check.required) {
      log(`  ❌ ${check.name} is missing`, 'red');
      hasErrors = true;
    } else if (check.value) {
      const masked = check.value.substring(0, 10) + '...';
      log(`  ✅ ${check.name} is set (${masked})`, 'green');
    } else {
      log(`  ⚠️  ${check.name} is not set (optional)`, 'yellow');
    }
  }

  return !hasErrors;
}

async function checkConnection() {
  log('\n🔌 Testing Supabase Connection...', 'cyan');

  if (!supabaseUrl || !supabaseKey) {
    log('  ❌ Missing required environment variables', 'red');
    return false;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test auth service
    const { error: authError } = await supabase.auth.getSession();
    if (authError) {
      log(`  ❌ Auth service error: ${authError.message}`, 'red');
      return false;
    }
    log('  ✅ Auth service is reachable', 'green');

    // Test database connection
    const { error: dbError } = await supabase.from('users').select('count').limit(1);
    if (dbError) {
      log(`  ❌ Database error: ${dbError.message}`, 'red');
      return false;
    }
    log('  ✅ Database is reachable', 'green');

    // Test storage
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
    if (storageError) {
      log(`  ⚠️  Storage error: ${storageError.message}`, 'yellow');
    } else {
      log(`  ✅ Storage is reachable (${buckets?.length || 0} buckets)`, 'green');
    }

    return true;
  } catch (error) {
    log(`  ❌ Connection failed: ${error}`, 'red');
    return false;
  }
}

async function checkRealtimeService() {
  log('\n📡 Testing Realtime Service...', 'cyan');

  if (!supabaseUrl || !supabaseKey) {
    log('  ❌ Missing required environment variables', 'red');
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  let channel: RealtimeChannel | undefined;

  try {
    // Create a test channel
    const channelName = `test-troubleshoot-${Date.now()}`;
    channel = supabase.channel(channelName);

    log(`  📍 Creating channel: ${channelName}`, 'blue');

    // Track subscription states
    const states: string[] = [];

    const subscriptionPromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Subscription timeout after 10 seconds'));
      }, 10000);

      // At this point, channel is definitely defined because we just assigned it
      const currentChannel = channel;
      if (!currentChannel) {
        reject(new Error('Channel not initialized'));
        return;
      }

      currentChannel.subscribe((status) => {
        states.push(status);
        log(`  📡 Status: ${status}`, status === 'SUBSCRIBED' ? 'green' : 'yellow');

        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeout);
          reject(new Error(`Subscription failed with status: ${status}`));
        }
      });
    });

    await subscriptionPromise;
    log('  ✅ Successfully subscribed to channel', 'green');

    // Test presence
    log('\n  🔍 Testing Presence...', 'blue');
    const presenceState = channel.presenceState();
    log(`  📊 Presence state: ${JSON.stringify(presenceState)}`, 'cyan');

    // Clean up
    await channel.unsubscribe();
    await supabase.removeChannel(channel);
    log('  ✅ Channel cleaned up successfully', 'green');

    return true;
  } catch (error) {
    log(`  ❌ Realtime test failed: ${error}`, 'red');

    // Attempt cleanup
    if (channel) {
      try {
        await channel.unsubscribe();
        await supabase.removeChannel(channel);
      } catch (cleanupError) {
        log(`  ⚠️  Cleanup failed: ${cleanupError}`, 'yellow');
      }
    }

    return false;
  }
}

async function checkPolicies() {
  log('\n🛡️  Checking RLS Policies...', 'cyan');

  if (!supabaseUrl || !supabaseKey) {
    log('  ❌ Missing required environment variables', 'red');
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test as anonymous user
  log('  👤 Testing as anonymous user...', 'blue');

  const tables = ['users', 'chats', 'messages', 'message_reactions', 'read_receipts'];
  const results: Record<string, { select: boolean; insert: boolean }> = {};

  for (const table of tables) {
    results[table] = { select: false, insert: false };

    // Test SELECT
    const { error: selectError } = await supabase.from(table).select('*').limit(1);
    if (!selectError || selectError.code !== 'PGRST301') {
      results[table].select = true;
    }

    // Test INSERT (with minimal data)
    const { error: insertError } = await supabase.from(table).insert({}).select();
    if (!insertError || insertError.code !== 'PGRST301') {
      results[table].insert = true;
    }
  }

  // Display results
  for (const [table, perms] of Object.entries(results)) {
    const status = perms.select || perms.insert ? '⚠️ ' : '✅';
    const message = `${status} ${table}: SELECT=${perms.select}, INSERT=${perms.insert}`;
    log(`  ${message}`, perms.select || perms.insert ? 'yellow' : 'green');
  }

  log('\n  💡 Note: Tables should be protected by RLS for anonymous users', 'cyan');

  return true;
}

async function suggestFixes() {
  log('\n💡 Common Fixes:', 'cyan');

  log('\n1. If connection fails:', 'yellow');
  log('   - Check your Supabase project is active', 'reset');
  log('   - Verify your environment variables are correct', 'reset');
  log('   - Check if your project URL is accessible', 'reset');

  log('\n2. If Realtime fails:', 'yellow');
  log('   - Enable Realtime in your Supabase dashboard', 'reset');
  log('   - Check Realtime logs in Supabase dashboard', 'reset');
  log('   - Verify your tables have Realtime enabled', 'reset');
  log("   - Check your project's Realtime quotas", 'reset');

  log('\n3. If RLS issues:', 'yellow');
  log('   - Review your RLS policies in Supabase dashboard', 'reset');
  log('   - Ensure authenticated users have proper permissions', 'reset');
  log('   - Check if service role key is needed for certain operations', 'reset');

  log('\n📚 Resources:', 'cyan');
  log('   - Supabase Status: https://status.supabase.com', 'reset');
  log('   - Realtime Docs: https://supabase.com/docs/guides/realtime', 'reset');
  log('   - RLS Docs: https://supabase.com/docs/guides/auth/row-level-security', 'reset');
}

async function main() {
  log('🔧 LinguaLink Realtime Troubleshooter', 'cyan');
  log('=====================================\n', 'cyan');

  const envOk = await checkEnvironment();
  if (!envOk) {
    log('\n❌ Please fix environment variables before continuing', 'red');
    process.exit(1);
  }

  const connectionOk = await checkConnection();
  if (!connectionOk) {
    log('\n❌ Cannot connect to Supabase. Check your configuration.', 'red');
    await suggestFixes();
    process.exit(1);
  }

  const realtimeOk = await checkRealtimeService();
  await checkPolicies();

  if (realtimeOk) {
    log('\n✅ All systems operational!', 'green');
  } else {
    log('\n⚠️  Some issues detected. See suggestions above.', 'yellow');
    await suggestFixes();
  }
}

main().catch((error) => {
  log(`\n❌ Unexpected error: ${error}`, 'red');
  process.exit(1);
});
