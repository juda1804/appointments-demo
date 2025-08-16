#!/usr/bin/env tsx
/**
 * Development Data Cleanup Script
 * 
 * Removes all development users and their associated businesses
 * USE WITH CAUTION - This will delete data permanently
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') });

// Development environment check
if (process.env.NODE_ENV === 'production') {
  console.error('❌ This script should not be run in production!');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const devUserEmails = [
  'maria.gonzalez@salonmaria.com',
  'carlos.rodriguez@clinicasonrisas.com',
  'ana.martinez@fitlifecali.com'
];

async function cleanupDevData() {
  console.log('🧹 Starting development data cleanup...');
  
  // Get all dev users
  const { data: users, error: getUsersError } = await supabase.auth.admin.listUsers();
  
  if (getUsersError) {
    throw getUsersError;
  }

  const devUsers = users.users.filter(user => 
    devUserEmails.includes(user.email || '')
  );

  console.log(`Found ${devUsers.length} development users to remove`);

  for (const user of devUsers) {
    console.log(`\n🗑️  Removing user: ${user.email} (${user.id})`);
    
    try {
      // Delete businesses first (CASCADE should handle this, but being explicit)
      const { error: businessError } = await supabase
        .from('businesses')
        .delete()
        .eq('user_id', user.id);
      
      if (businessError) {
        console.warn(`⚠️  Failed to delete businesses for ${user.email}:`, businessError);
      } else {
        console.log(`✅ Businesses deleted for ${user.email}`);
      }

      // Delete user (this will cascade to profiles)
      const { error: userError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (userError) {
        console.error(`❌ Failed to delete user ${user.email}:`, userError);
      } else {
        console.log(`✅ User deleted: ${user.email}`);
      }
      
    } catch (error) {
      console.error(`❌ Error removing ${user.email}:`, error);
    }
  }

  // Also clean up any orphaned businesses with NULL user_id
  const { error: orphanError } = await supabase
    .from('businesses')
    .delete()
    .is('user_id', null);
    
  if (orphanError) {
    console.warn(`⚠️  Failed to clean orphaned businesses:`, orphanError);
  } else {
    console.log(`✅ Orphaned businesses cleaned up`);
  }

  console.log('\n✅ Cleanup completed!');
}

// Run cleanup
cleanupDevData()
  .catch((error) => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  });