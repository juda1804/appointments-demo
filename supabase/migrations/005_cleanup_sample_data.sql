-- Migration: Clean up sample data for production readiness
-- Description: Remove sample businesses with NULL user_id for production deployment

-- RECOMMENDED APPROACH: Remove sample businesses entirely
-- This is the safest approach since sample businesses have no real users
DELETE FROM businesses WHERE user_id IS NULL;

-- Alternative: Keep sample businesses for development testing
-- If you want to keep sample businesses for testing, you need to:
-- 1. Create real users through Supabase Auth signup (via application)
-- 2. Manually update businesses with real user_id values
-- 3. Or leave them with NULL user_id for development (already handled in RLS policies)

-- Note: You cannot create auth.users directly through migrations
-- Use the Supabase Auth API or the application's registration flow instead

-- For development testing, you can create users through the application with these emails:
-- - owner@salonmaria.com (for Salón de Belleza María)  
-- - admin@clinicasonrisas.com (for Clínica Dental Sonrisas)
-- - gerente@fitlifecali.com (for Gimnasio FitLife)

-- Then update the businesses table with proper user_id values:
-- UPDATE businesses SET user_id = 'actual-user-uuid' WHERE email = 'business-email';

-- Production deployment recommendations:
-- 1. Start with clean database (no sample data)
-- 2. Use proper user registration flow through the application
-- 3. All businesses will be created with proper user_id through unified registration API