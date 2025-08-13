# Database Setup for Colombian Appointment Management System

## Overview

This document outlines the database schema setup for the Colombian appointment management system with multi-tenant Row Level Security (RLS) policies.

## Migration Files

The database schema is implemented through SQL migration files located in `supabase/migrations/`:

### 001_create_businesses_table.sql
- Creates the `businesses` table with Colombian market specializations
- Implements Colombian phone number validation (`+57 XXX XXX XXXX` format)
- Validates Colombian departments (all 32 departments + Bogotá D.C.)
- Sets default Colombian business settings (timezone, currency, business hours)
- Adds proper indexing for performance

### 002_enable_rls_policies.sql
- Enables Row Level Security on the businesses table
- Creates multi-tenant isolation policies
- Implements session-based business context functions
- Ensures complete data isolation between businesses

### 003_seed_sample_data.sql
- Adds sample Colombian businesses for testing
- Includes businesses from different Colombian cities (Bogotá, Medellín, Cali)
- Demonstrates proper phone format and department validation

## Database Schema

### Businesses Table

```sql
businesses (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Colombian address structure
    street VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    department VARCHAR(50) NOT NULL, -- Validated against 33 Colombian departments
    postal_code VARCHAR(20),
    
    -- Colombian phone validation
    phone VARCHAR(20) NOT NULL,      -- Must match +57 XXX XXX XXXX
    whatsapp_number VARCHAR(20),     -- Optional, same format
    
    email VARCHAR(255) NOT NULL,
    settings JSONB NOT NULL,         -- Colombian defaults (COP, America/Bogota)
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
```

## Row Level Security (RLS)

### Multi-Tenant Isolation

The system implements complete multi-tenant isolation using PostgreSQL's Row Level Security:

1. **Session Context**: Each request sets the current business ID in the session
2. **Automatic Filtering**: All queries are automatically filtered to the current business
3. **Policy Enforcement**: Separate policies for SELECT, INSERT, UPDATE, DELETE operations
4. **Security Functions**: Helper functions for managing business context

### Key RLS Functions

- `set_current_business_id(UUID)` - Sets business context for session
- `get_current_business_id()` - Retrieves current business from session
- `validate_business_access(UUID)` - Validates user access to business

## Colombian Market Specializations

### Phone Number Validation
- Format: `+57 XXX XXX XXXX` (Colombian country code + 10 digits)
- Applied to both `phone` and `whatsapp_number` fields
- Enforced via CHECK constraints

### Department Validation
- Validates against all 32 Colombian departments plus Bogotá D.C.
- Ensures accurate address data for Colombian businesses
- List includes: Amazonas, Antioquia, Arauca, Atlántico, Bolívar, Boyacá, etc.

### Default Settings
```json
{
    "timezone": "America/Bogota",
    "currency": "COP",
    "businessHours": [
        // Monday-Friday 8AM-6PM, Saturday 8AM-2PM, Sunday closed
    ]
}
```

## How to Apply Migrations

### Option 1: Manual Application (Recommended)

1. Create your Supabase project in São Paulo region
2. Go to the SQL Editor in Supabase dashboard
3. Run each migration file in order (001, 002, 003)
4. Verify tables and policies are created

### Option 2: Supabase CLI (If Available)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

## Testing Multi-Tenant Isolation

Use the provided database utility functions in `apps/web/src/lib/database.ts`:

```typescript
import { businessDb } from './lib/database';

// Test isolation (should return empty without context)
const result = await businessDb.testMultiTenantIsolation();

// Set business context
await businessDb.setBusinessContext('business-uuid-here');

// Now queries will be filtered to this business only
const business = await businessDb.getCurrentBusiness();
```

## Security Considerations

1. **Service Role Key**: Never expose the service role key on the client
2. **Business Context**: Always set business context before database operations
3. **User Authentication**: Implement proper user authentication before production
4. **Audit Logging**: Consider adding audit trails for business data changes

## Performance Notes

- Indexes are created on frequently queried columns (email, city/department, created_at)
- JSONB settings field allows flexible business configuration
- RLS policies are optimized for session-based filtering

## Next Steps

1. Apply migrations to your Supabase database
2. Test RLS isolation with sample data
3. Implement user authentication and business access control
4. Add appointment-related tables in future migrations