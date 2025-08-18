# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Colombian-first appointment management system built as a fullstack Next.js application with a Supabase backend. The project uses a monorepo structure with npm workspaces and is specifically tailored for the Colombian market with features like peso currency formatting, Colombian phone validation, department support, and holiday calendar integration.

## Architecture & Structure

### Monorepo Organization
- `apps/web/` - Next.js 14+ application (App Router)
- `packages/types/` - Shared TypeScript types 
- `packages/utils/` - Colombian-specific utilities (phone, currency, holidays, departments)
- `packages/ui/` - Shared UI components
- `supabase/` - Database migrations and schema
- `docs/architecture/` - Comprehensive architecture documentation

### Key Technologies
- **Frontend**: Next.js 14+ with App Router, TypeScript 5.3+, React 19, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase (PostgreSQL + Auth + Realtime)
- **Testing**: Jest + React Testing Library + Playwright
- **Database**: PostgreSQL with Row Level Security (RLS) for multi-tenancy
- **Deployment**: Vercel + Supabase (São Paulo region for Colombian latency)

## Development Commands

### Essential Commands
```bash
# Development
npm run dev                    # Start development server on localhost:3000
npm run build                  # Build for production
npm run start                  # Start production server

# Environment-specific builds
cd apps/web && npm run dev:staging     # Development with staging config
cd apps/web && npm run build:staging   # Build for staging environment
cd apps/web && npm run build:production # Build for production environment

# Code Quality
npm run lint                   # Run ESLint
npm run typecheck              # TypeScript type checking

# Testing
npm test                       # Run all tests across packages
npm run test:coverage          # Run tests with coverage
npm test --workspace=web       # Test specific workspace
npm test --workspace=packages/utils
npm run test:e2e               # Run end-to-end tests with Playwright
npm run test:e2e:ui            # Run Playwright tests with UI
npm run test:e2e:headed        # Run Playwright tests in headed mode
npm run test:e2e:report        # Run e2e tests and generate HTML report

# Environment
npm run env:validate           # Validate environment variables
npm run audit                  # Security audit

# Development utilities
npm run seed:dev               # Seed development data
npm run cleanup:dev            # Clean up development data
```

### Testing Structure
- Unit tests: `.test.tsx` and `.test.ts` files alongside source code
- Integration tests: API route tests in `apps/web/src/app/api/*/route.test.ts`
- Component tests: React Testing Library tests for all components
- End-to-end tests: Playwright tests in `apps/web/tests/`
- Test a single file: `npm test -- filename.test.ts`
- Watch mode: `cd apps/web && npm run test:watch`

## Colombian Market Specialization

This system is specifically built for the Colombian market with built-in utilities:

### Phone Numbers
- Format: `+57 300 123 4567`
- Validation: `validateColombianPhone()` in `@appointments-demo/utils`
- All phone inputs use Colombian formatting

### Currency 
- Colombian Peso (COP) with no decimals
- Format: `$50.000 COP`
- Use `formatPesoCOP()` from `@appointments-demo/utils`

### Geographic Data
- All 32 Colombian departments + Bogotá D.C.
- Validation: `validateColombianDepartment()` 
- Department list: `COLOMBIAN_DEPARTMENTS` constant

### Business Hours & Holidays
- Timezone: `America/Bogota` (no daylight saving)
- Colombian national holidays integration
- Use `isColombianHoliday()` and `getNextBusinessDay()`

## Database & Multi-Tenancy

### Row Level Security (RLS)
- **CRITICAL**: Every business is completely isolated via RLS policies
- Business context must be set before database operations: `businessDb.setBusinessContext(businessId)`
- All database operations automatically respect business boundaries
- Zero cross-tenant data visibility is guaranteed

### Database Operations
- Use `businessDb` utilities in `apps/web/src/lib/database.ts`
- Server operations use `createServerSupabaseClient()` 
- Client operations use the lazy-loaded `supabase` client
- Test RLS isolation: `businessDb.testMultiTenantIsolation()`

### Key Database Utilities
```typescript
// Set business context (required for RLS)
await businessDb.setBusinessContext(businessId);

// Business operations
const business = await businessDb.getById(id);
const newBusiness = await businessDb.createColombianBusiness(data);
await businessDb.updateSettings(id, settings);

// Colombian business validation
businessDb.validateColombianPhone(phone);
businessDb.validateColombianDepartment(department);
```

## Environment Configuration

### Required Environment Variables
Copy `.env.local.example` to `apps/web/.env.local` and configure:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key  
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Colombian Settings
COLOMBIA_TIMEZONE=America/Bogota
COLOMBIA_CURRENCY=COP
COLOMBIA_PHONE_PREFIX=+57
```

### Environment Validation
- Run `npm run env:validate` or `cd apps/web && npm run env:check` to check all required variables
- Environment validation is in `apps/web/scripts/validate-env.js`
- Type-safe environment access via `apps/web/src/lib/env.ts`

## Code Style & Standards

### TypeScript Standards
- Strict TypeScript configuration across all packages
- Shared types in `@appointments-demo/types`
- No `any` types allowed - use proper typing
- All API responses and database operations are typed

### Component Patterns
- React Server Components by default in App Router
- Client components only when needed (use `'use client'`)
- All components have corresponding `.test.tsx` files
- Tailwind CSS for styling - no custom CSS files

### Import Conventions
```typescript
// Internal packages (note: types is imported for TypeScript types only)
import type { Business } from '@appointments-demo/types';
import { formatColombianPhone } from '@appointments-demo/utils';
import { Button, Card } from '@appointments-demo/ui';

// Relative imports for local modules
import { businessDb } from '@/lib/database';
import { env } from '@/lib/env';
```

### Testing Requirements
- Every new component needs a test file
- Test Colombian-specific functionality with real Colombian data
- Mock Supabase operations in tests using Jest mocks
- API route tests should test RLS isolation
- Use descriptive test names that explain the scenario

## Key Files & Locations

### Configuration
- `jest.config.js` - Root Jest configuration with workspace support
- `apps/web/jest.config.js` - Web app specific Jest setup
- `apps/web/tailwind.config.js` - Tailwind configuration
- `apps/web/next.config.ts` - Next.js configuration

### Core Libraries
- `apps/web/src/lib/supabase.ts` - Supabase client configuration
- `apps/web/src/lib/database.ts` - Database operations with RLS
- `apps/web/src/lib/auth.ts` - Authentication utilities
- `apps/web/src/lib/env.ts` - Type-safe environment variables

### Colombian Utilities  
- `packages/utils/src/colombian/` - All Colombian market utilities
- `packages/types/src/business.ts` - Business entity types
- `packages/ui/src/components/ColombianDisplay.tsx` - Colombian data display

### Database Schema
- `supabase/migrations/` - Database migrations
- RLS policies enforce business isolation automatically
- Multi-tenant architecture with zero cross-business data access

## Common Development Patterns

### Creating New Features
1. Add types to `packages/types/src/`
2. Implement business logic in `apps/web/src/lib/`
3. Create UI components with tests
4. Add API routes with RLS-aware database operations
5. Write integration tests that verify RLS isolation

### Adding Colombian-Specific Features
1. Add utilities to `packages/utils/src/colombian/`
2. Include proper validation and formatting
3. Add comprehensive tests with Colombian data
4. Update types if needed
5. Document Colombian business context

### Database Operations
1. Always set business context first: `businessDb.setBusinessContext(businessId)`
2. Use typed database utilities in `database.ts`
3. Test multi-tenant isolation in every feature
4. Verify RLS policies prevent cross-business access

## Documentation References

- [Architecture Overview](docs/architecture/01-system-overview.md) - High-level system design
- [Technology Stack](docs/architecture/02-tech-stack.md) - Complete tech stack rationale
- [Database Schema](docs/architecture/04-database-schema.md) - Database design and RLS
- [Colombian Integration](docs/architecture/08-colombian-integration.md) - Market-specific features
- [Setup Guides](SUPABASE_SETUP.md) - Environment setup instructions