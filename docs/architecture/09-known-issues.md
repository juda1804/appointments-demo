# Known Issues & Solutions

> Last Updated: 2025-08-15
> Version: 1.0.0

## Overview

This document captures critical issues that have been encountered during development, their root causes, solutions, and prevention strategies. These issues are documented to prevent costly re-investigation and to help future developers avoid similar pitfalls.

## Critical Issues

### 1. Environment Variables Not Loading in Next.js

**Severity:** 🔴 Critical - Application fails to start
**Discovery Date:** 2025-08-15
**Resolution Time:** Significant development time lost

#### Problem Description

The application would fail with the following error when navigating to any page:
```
Environment variable NEXT_PUBLIC_SUPABASE_URL not found. Available env vars: []
```

#### Symptoms
- Development server starts but crashes seconds after accessing any route
- Console shows empty array for available environment variables
- All `NEXT_PUBLIC_*` variables appear as undefined
- Supabase client initialization fails completely

#### Root Cause

The explicit `env` section in `next.config.ts` was acting as a whitelist, filtering out essential environment variables:

```typescript
// PROBLEMATIC CODE - DO NOT USE
env: {
  COLOMBIA_TIMEZONE: process.env.COLOMBIA_TIMEZONE || 'America/Bogota',
  COLOMBIA_CURRENCY: process.env.COLOMBIA_CURRENCY || 'COP', 
  COLOMBIA_PHONE_PREFIX: process.env.COLOMBIA_PHONE_PREFIX || '+57',
},
```

When you define an `env` section in Next.js configuration, it **overrides** the default automatic environment variable loading behavior and **only** exposes the variables you explicitly list.

#### Solution

Remove the explicit `env` section from `next.config.ts` to restore Next.js automatic environment variable loading:

```typescript
// CORRECT APPROACH - Let Next.js handle env vars automatically
// Environment variable validation - removed explicit env section
// to allow Next.js automatic environment variable loading
// Colombian variables will use defaults from lib/env.ts
```

#### Verification Steps

1. **Environment Validation Script:**
   ```bash
   cd apps/web && npm run env:validate
   ```
   Should show all required variables as ✅ Found

2. **Development Server Test:**
   ```bash
   npm run dev
   ```
   Should start without environment variable errors

3. **API Health Check:**
   ```bash
   curl http://localhost:3001/api/health
   ```
   Should return healthy status for database and Supabase

4. **E2E Tests:**
   ```bash
   npm run test:e2e
   ```
   Should not fail due to environment variable issues

#### Prevention Strategy

1. **Never use explicit `env` sections** in `next.config.ts` unless absolutely necessary
2. **Always test environment loading** after Next.js configuration changes
3. **Use environment validation scripts** to catch issues early
4. **Document any custom environment handling** in this file

#### Technical Details

**Next.js Environment Variable Loading Order:**
1. `.env.local` (highest priority, local development)
2. `.env.development.local` / `.env.production.local` (environment-specific local)
3. `.env.development` / `.env.production` (environment-specific)
4. `.env` (lowest priority, defaults)

**Critical Variables for This Project:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side operations
- `COLOMBIA_TIMEZONE` - Colombian timezone (America/Bogota)
- `COLOMBIA_CURRENCY` - Colombian currency (COP)
- `COLOMBIA_PHONE_PREFIX` - Colombian phone prefix (+57)

#### Files Affected
- `apps/web/next.config.ts` - Configuration change
- `apps/web/src/lib/env.ts` - Environment management
- `apps/web/.env.local` - Local environment variables

---

## Issue Reporting Guidelines

When documenting new issues in this file:

1. **Severity Level:** 🔴 Critical, 🟡 Medium, 🟢 Low
2. **Include exact error messages** and symptoms
3. **Document root cause analysis** process
4. **Provide complete solution** with code examples
5. **Add verification steps** to confirm fix
6. **Include prevention strategies** for future

## Related Documentation

- [Environment Setup Guide](../../ENVIRONMENT_SETUP.md)
- [Supabase Setup Guide](../../SUPABASE_SETUP.md)
- [Tech Stack Documentation](02-tech-stack.md)
- [System Overview](01-system-overview.md)

---

*This document should be updated whenever significant issues are discovered and resolved. Time invested in documentation prevents future costly debugging sessions.*