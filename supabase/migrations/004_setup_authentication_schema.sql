-- Migration: Setup User Authentication Schema and Business-User Relationships
-- Description: Complete authentication setup with user-business linking for multi-tenancy

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create public profiles table to extend auth.users
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Add user_id to businesses table to link businesses to users
-- Making it nullable initially to handle existing sample data
ALTER TABLE public.businesses 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_businesses_user_id ON public.businesses(user_id);

-- Update businesses RLS policies to include user ownership
DROP POLICY IF EXISTS businesses_isolation_policy ON businesses;
DROP POLICY IF EXISTS businesses_insert_policy ON businesses;
DROP POLICY IF EXISTS businesses_update_policy ON businesses;
DROP POLICY IF EXISTS businesses_delete_policy ON businesses;

-- New business policies that check both user_id and business context
-- Handle NULL user_id for sample data during development
CREATE POLICY "Users can view their own businesses" ON businesses
    FOR SELECT USING (
        (auth.uid() = user_id OR user_id IS NULL) 
        AND (
            current_setting('app.current_business_id', true) = '' 
            OR id = current_setting('app.current_business_id', true)::UUID
        )
    );

CREATE POLICY "Users can insert their own businesses" ON businesses
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own businesses" ON businesses
    FOR UPDATE USING (
        (auth.uid() = user_id OR user_id IS NULL) 
        AND id = current_setting('app.current_business_id', true)::UUID
    );

CREATE POLICY "Users can delete their own businesses" ON businesses
    FOR DELETE USING (
        (auth.uid() = user_id OR user_id IS NULL) 
        AND id = current_setting('app.current_business_id', true)::UUID
    );

-- Function to create profile after user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to get user's businesses
CREATE OR REPLACE FUNCTION get_user_businesses(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
    business_id UUID,
    business_name TEXT,
    business_email TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT b.id, b.name, b.email, b.created_at
    FROM businesses b
    WHERE b.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate user owns business
CREATE OR REPLACE FUNCTION user_owns_business(business_uuid UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM businesses 
        WHERE id = business_uuid 
        AND user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Sample businesses will have NULL user_id initially
-- This is acceptable for development/testing purposes
-- In production, businesses will be created with proper user_id during registration
-- The unified registration API will handle proper user-business linking

-- Add updated_at trigger for profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add constraints and indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_created_at ON public.profiles(created_at);

-- Add comments
COMMENT ON TABLE public.profiles IS 'User profiles extending auth.users with additional data';
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile automatically when user signs up';
COMMENT ON FUNCTION get_user_businesses(UUID) IS 'Returns all businesses owned by a user';
COMMENT ON FUNCTION user_owns_business(UUID, UUID) IS 'Validates if user owns specified business';

-- Enable email confirmations (run in Supabase dashboard or via SQL)
-- This should be set in the Supabase Auth settings, not via SQL migration
-- But documenting here for reference:
-- 1. Go to Authentication > Settings
-- 2. Enable "Confirm email" 
-- 3. Configure email templates in Colombian Spanish