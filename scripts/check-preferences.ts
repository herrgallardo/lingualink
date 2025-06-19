#!/usr/bin/env node
/**
 * Script to check if preferences are set up correctly
 * Run with: npx tsx scripts/check-preferences.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import type { Database } from '../lib/types/database';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

type PreferencesJson = Record<string, unknown>;

async function checkPreferences() {
  console.log('🔍 Checking User Preferences Setup...\n');

  try {
    // 1. Check if preferences column exists
    console.log('📊 Checking preferences column...');

    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, username, preferences')
      .limit(1);

    if (fetchError) {
      if (fetchError.message.includes('preferences')) {
        console.error('  ❌ Preferences column not found!');
        console.log('\n💡 Solution: Run the preferences migration:');
        console.log('1. Go to Supabase Dashboard > SQL Editor');
        console.log(
          '2. Copy and run the contents of: supabase/migrations/006_user_preferences.sql',
        );
        return;
      }
      throw fetchError;
    }

    console.log('  ✅ Preferences column exists');

    // 2. Check if RPC functions exist
    console.log('\n⚡ Checking RPC functions...');

    // Test update_user_preference function
    try {
      // This will fail if the function doesn't exist
      await supabase.rpc('update_user_preference', {
        user_id: '00000000-0000-0000-0000-000000000000',
        preference_key: 'test',
        preference_value: JSON.stringify(true),
      });
    } catch (rpcError: unknown) {
      const errorMessage = rpcError instanceof Error ? rpcError.message : String(rpcError);
      if (errorMessage.includes('function') && !errorMessage.includes('Access denied')) {
        console.error('  ❌ RPC function update_user_preference not found!');
        console.log('\n💡 Solution: The function is missing from your database.');
        console.log('Run the preferences migration to create it.');
        return;
      }
      // If it's an access error, the function exists
      console.log('  ✅ Function update_user_preference exists');
    }

    // 3. Check a user's preferences structure
    if (users && users.length > 0) {
      const user = users[0];
      if (user) {
        console.log(`\n👤 Checking user preferences for: ${user.username}`);

        if (user.preferences) {
          const prefs = user.preferences as PreferencesJson;
          console.log('  ✅ User has preferences object');

          // Check for expected keys
          const expectedKeys = [
            'compactView',
            'notificationSounds',
            'messagePreview',
            'showTypingIndicator',
            'autoTranslate',
            'theme',
            'fontSize',
            'soundVolume',
            'enterToSend',
            'showTimestamps',
            'showReadReceipts',
            'messageGrouping',
          ];

          const missingKeys = expectedKeys.filter((key) => !(key in prefs));

          if (missingKeys.length > 0) {
            console.log(`  ⚠️  Missing preference keys: ${missingKeys.join(', ')}`);
          } else {
            console.log('  ✅ All expected preference keys present');
          }

          // Show current preferences
          console.log('\n📋 Current preferences:');
          console.log(JSON.stringify(prefs, null, 2));
        } else {
          console.log('  ⚠️  User has no preferences set');
        }
      }
    } else {
      console.log('\n⚠️  No users found in the database');
    }

    console.log('\n✅ Preferences setup check complete!');
    console.log('\nIf preferences are still not saving:');
    console.log('1. Check browser console for errors');
    console.log('2. Ensure you have the latest code deployed');
    console.log('3. Try clearing browser cache and cookies');
    console.log('4. Check that Row Level Security policies allow preference updates');
  } catch (error) {
    console.error('❌ Error during check:', error);
  }
}

// Run check
checkPreferences().catch(console.error);
