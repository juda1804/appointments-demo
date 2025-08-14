# Environment Configuration Guide

This guide explains how to set up environment variables for the Colombian Appointment Management System across different environments.

## Environment Files

The project uses separate environment configuration files for different deployment stages:

- `.env.development.example` - Development environment template
- `.env.staging.example` - Staging environment template  
- `.env.production.example` - Production environment template
- `.env.local.example` - Legacy template (still supported)

## Quick Setup for Local Development

1. **Copy the development environment template:**
   ```bash
   cp .env.development.example .env.local
   ```

2. **Update Supabase configuration** in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_actual_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_actual_supabase_service_role_key
   ```

3. **Verify configuration:**
   ```bash
   npm run dev
   ```
   
   Check the console for environment validation messages.

## Environment Variables Reference

### Required Variables

#### Supabase Configuration
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key for client-side operations
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key for server-side operations

#### Colombian Configuration (Auto-configured)
- `COLOMBIA_TIMEZONE` - Default: `America/Bogota`
- `COLOMBIA_CURRENCY` - Default: `COP`
- `COLOMBIA_PHONE_PREFIX` - Default: `+57`

### Optional Variables

#### Application Configuration
- `NEXT_PUBLIC_APP_ENV` - Environment identifier (`development`, `staging`, `production`)
- `NEXT_PUBLIC_APP_VERSION` - Application version (default: `1.0.0`)
- `NEXT_PUBLIC_API_BASE_URL` - Base URL for API calls
- `API_TIMEOUT` - API request timeout in milliseconds (default: 10000)

#### Feature Flags
- `ENABLE_DEBUG_MODE` - Enable debug logging (default: true in development)
- `ENABLE_TEST_DATA` - Enable test data features (default: true in development)
- `NEXT_PUBLIC_ENABLE_ANALYTICS` - Enable analytics tracking (default: false)

#### Logging
- `LOG_LEVEL` - Logging level (`debug`, `info`, `warn`, `error`) (default: `info`)

## Environment-Specific Configuration

### Development Environment
- **File:** `.env.local` (copied from `.env.development.example`)
- **Features:** Debug mode enabled, test data available
- **Base URL:** `http://localhost:3000`
- **Logging:** Debug level

### Staging Environment
- **File:** Environment variables set in Vercel dashboard
- **Features:** Debug mode enabled, no test data
- **Base URL:** Your staging domain
- **Logging:** Info level
- **Additional:** NextAuth configuration required

### Production Environment
- **File:** Environment variables set in Vercel dashboard
- **Features:** All debug features disabled, analytics enabled
- **Base URL:** Your production domain
- **Logging:** Error level only
- **Additional:** NextAuth and analytics configuration required

## Vercel Deployment Setup

### Staging Environment (Vercel)

1. **In Vercel Dashboard** → Your Project → Settings → Environment Variables
2. **Add staging variables:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_staging_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_staging_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_staging_service_role_key
   NEXT_PUBLIC_APP_ENV=staging
   NEXT_PUBLIC_API_BASE_URL=https://your-staging-domain.vercel.app
   LOG_LEVEL=info
   ```

### Production Environment (Vercel)

1. **In Vercel Dashboard** → Your Project → Settings → Environment Variables
2. **Add production variables:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
   NEXT_PUBLIC_APP_ENV=production
   NEXT_PUBLIC_API_BASE_URL=https://your-production-domain.com
   NEXT_PUBLIC_ENABLE_ANALYTICS=true
   LOG_LEVEL=error
   ```

## Environment Configuration API

The application provides a centralized environment configuration system through `/apps/web/src/lib/env.ts`:

### Usage Example
```typescript
import { env, validateEnvironment, isDevelopment } from '@/lib/env';

// Access configuration
const supabaseUrl = env.supabase.url;
const colombianTimezone = env.colombia.timezone;

// Environment checks
if (isDevelopment) {
  console.log('Running in development mode');
}

// Validate configuration
validateEnvironment();
```

### Available Helper Functions
- `validateEnvironment()` - Validates all required environment variables
- `isDevelopment`, `isStaging`, `isProduction` - Environment detection
- `getColombianTimezone()` - Returns Colombian timezone
- `getColombianCurrency()` - Returns Colombian currency code
- `getColombianPhonePrefix()` - Returns Colombian phone prefix

## Troubleshooting

### Common Issues

1. **Missing environment variables error:**
   - Ensure `.env.local` exists and contains all required variables
   - Check variable names match exactly (case-sensitive)

2. **Supabase connection failed:**
   - Verify your Supabase URL and keys are correct
   - Check your Supabase project is in São Paulo region

3. **Environment not detected correctly:**
   - Set `NEXT_PUBLIC_APP_ENV` explicitly
   - Clear Next.js cache: `rm -rf .next`

4. **Type errors in environment configuration:**
   - Run `npm run typecheck` to identify specific issues
   - Ensure all required variables are defined

### Validation Commands

```bash
# Check environment configuration
npm run dev

# Run environment tests
npm test -- env.test.ts

# Validate TypeScript configuration
npm run typecheck
```

## Security Notes

- **Never commit actual environment values** to version control
- **Use different Supabase projects** for each environment
- **Rotate keys regularly** in production
- **Restrict service role key access** to server-side operations only
- **Use HTTPS** for all staging and production URLs

## Colombian Market Defaults

The system automatically configures Colombian market defaults:

- **Timezone:** America/Bogota (GMT-5)
- **Currency:** COP (Colombian Peso)
- **Phone Format:** +57 XXX XXX XXXX
- **Business Hours:** 8:00 AM - 6:00 PM Colombian time
- **Holiday Calendar:** Colombian national holidays included

These defaults ensure the application works correctly for Colombian businesses without additional configuration.