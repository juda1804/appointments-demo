#!/usr/bin/env node

/**
 * Environment validation script
 * Loads environment variables and validates configuration
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '..', '.env.local');
console.log(`Loading environment from: ${envPath}`);

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env.local:', result.error);
  process.exit(1);
}

console.log('✅ Environment file loaded successfully');

// Check required variables
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_COLOMBIA_TIMEZONE',
  'NEXT_PUBLIC_COLOMBIA_CURRENCY',
  'NEXT_PUBLIC_COLOMBIA_PHONE_PREFIX'
];

let allValid = true;

console.log('\n🔍 Checking required environment variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`   ✅ ${varName}: ${varName.includes('KEY') ? '[REDACTED]' : value}`);
  } else {
    console.log(`   ❌ ${varName}: MISSING`);
    allValid = false;
  }
});

// Check Colombian defaults
console.log('\n🇨🇴 Colombian Configuration:');
console.log(`   Timezone: ${process.env.NEXT_PUBLIC_COLOMBIA_TIMEZONE || 'NOT SET'}`);
console.log(`   Currency: ${process.env.NEXT_PUBLIC_COLOMBIA_CURRENCY || 'NOT SET'}`);
console.log(`   Phone Prefix: ${process.env.NEXT_PUBLIC_COLOMBIA_PHONE_PREFIX || 'NOT SET'}`);

// Test Supabase URL format
if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    if (url.hostname.includes('supabase.co')) {
      console.log('   ✅ Supabase URL format is valid');
    } else {
      console.log('   ⚠️  Supabase URL may not be a valid Supabase project URL');
    }
  } catch (error) {
    console.log('   ❌ Supabase URL format is invalid');
    allValid = false;
  }
}

console.log('\n📊 Validation Summary:');
if (allValid) {
  console.log('✅ All environment variables are properly configured');
  console.log('🚀 Ready to run the application');
} else {
  console.log('❌ Some environment variables are missing or invalid');
  console.log('📖 Check ENVIRONMENT_SETUP.md for configuration instructions');
  process.exit(1);
}