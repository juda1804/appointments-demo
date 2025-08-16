# Development Setup Guide

## Database Migrations

### Running Migrations

1. **Run all migrations:**
```bash
supabase migration up
```

2. **Check migration status:**
```bash
supabase migration list
```

### Migration Sequence

1. `001_create_businesses_table.sql` - Core businesses table
2. `002_enable_rls_policies.sql` - Row Level Security  
3. `003_seed_sample_data.sql` - Sample Colombian businesses
4. `004_setup_authentication_schema.sql` - User-business linking
5. `005_cleanup_sample_data.sql` - Production cleanup

## Development Users

### Creating Sample Users

Instead of using database migrations for users (which don't work with Supabase Auth), use the development seeding script:

```bash
# Create development users with proper authentication
npm run seed:dev
```

This creates three realistic Colombian business owners:

1. **María González** - `maria.gonzalez@salonmaria.com`
   - Business: Salón de Belleza María (Bogotá)
   - Password: `DevPassword123!`

2. **Dr. Carlos Rodríguez** - `carlos.rodriguez@clinicasonrisas.com`
   - Business: Clínica Dental Sonrisas (Medellín)  
   - Password: `DevPassword123!`

3. **Ana Martínez** - `ana.martinez@fitlifecali.com`
   - Business: Gimnasio FitLife (Cali)
   - Password: `DevPassword123!`

### Cleaning Up Development Data

```bash
# Remove all development users and businesses
npm run cleanup:dev
```

## Environment Setup

### Required Environment Variables

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

### Validate Environment

```bash
npm run env:validate
```

## Testing the Registration Flow

1. **Start the development server:**
```bash
npm run dev
```

2. **Test unified registration:**
   - Go to `/auth/register/business`
   - Fill out the form with Colombian data
   - Complete email verification
   - Should redirect to dashboard with business context

3. **Test existing user login:**
   - Use any of the seeded development users
   - Should automatically set business context
   - Access dashboard with proper RLS isolation

## Production Deployment

### Clean Database Approach (Recommended)

1. **Skip sample data migrations:**
```bash
# Run only core migrations
supabase migration up --include 001,002,004
```

2. **Or clean existing sample data:**
```bash
# Run migration 005 to remove sample businesses
supabase migration up
```

### All users created through the application will have:
- Proper email verification
- Linked user-business relationships  
- Colombian market compliance
- Secure RLS isolation

## Troubleshooting

### Foreign Key Constraint Errors

If you see errors like `violates foreign key constraint "businesses_user_id_fkey"`:

1. **Check user exists:**
```sql
SELECT id, email FROM auth.users WHERE email = 'user@example.com';
```

2. **Update business with correct user_id:**
```sql
UPDATE businesses SET user_id = 'actual-user-uuid' WHERE email = 'business@example.com';
```

3. **Or remove orphaned businesses:**
```sql
DELETE FROM businesses WHERE user_id IS NULL;
```

### Permission Errors

If you see `must be owner of table users`:
- This is expected - you cannot directly insert into `auth.users`
- Use the seeding scripts instead of migrations for user creation
- Use proper Supabase Auth signup flow in production

## Development Workflow

1. **Clean slate:**
```bash
npm run cleanup:dev
supabase migration up
```

2. **Create development users:**
```bash
npm run seed:dev
```

3. **Test the application:**
```bash
npm run dev
```

4. **Run tests:**
```bash
npm test
npm run typecheck
npm run lint
```

This approach ensures:
- ✅ Proper authentication flow
- ✅ Secure RLS isolation  
- ✅ Colombian market compliance
- ✅ Production-ready architecture