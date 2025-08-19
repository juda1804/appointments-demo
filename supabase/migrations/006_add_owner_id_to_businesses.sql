-- Migration: Add owner_id column to businesses table for explicit multi-tenancy
-- Description: Adds foreign key relationship between businesses and auth.users for proper multi-tenant isolation

-- Add owner_id column to businesses table
ALTER TABLE businesses 
ADD COLUMN owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_businesses_owner_id ON businesses(owner_id);

-- Update RLS policies to use owner_id instead of session context
-- Drop existing policies first
DROP POLICY IF EXISTS businesses_isolation_policy ON businesses;
DROP POLICY IF EXISTS businesses_insert_policy ON businesses;
DROP POLICY IF EXISTS businesses_update_policy ON businesses;
DROP POLICY IF EXISTS businesses_delete_policy ON businesses;

-- Create new policies using owner_id for better performance and clarity
CREATE POLICY businesses_owner_access_policy ON businesses
    FOR ALL 
    USING (owner_id = auth.uid());

CREATE POLICY businesses_owner_insert_policy ON businesses
    FOR INSERT 
    WITH CHECK (owner_id = auth.uid());

-- Add constraint to ensure owner_id is always set to the authenticated user
CREATE OR REPLACE FUNCTION ensure_business_owner_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Set owner_id to current authenticated user if not explicitly set
    IF NEW.owner_id IS NULL THEN
        NEW.owner_id = auth.uid();
    END IF;
    
    -- Ensure owner_id matches authenticated user (security check)
    IF NEW.owner_id != auth.uid() THEN
        RAISE EXCEPTION 'Cannot create business for another user';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set owner_id on insert
CREATE TRIGGER ensure_business_owner_id_trigger
    BEFORE INSERT ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION ensure_business_owner_id();

-- Update existing businesses to have a valid owner_id (if any exist)
-- This is safe because there should be no existing businesses yet
-- But we'll add a comment for future reference
COMMENT ON COLUMN businesses.owner_id IS 'Foreign key to auth.users - identifies the business owner for multi-tenant isolation';

-- Add comments for new policies
COMMENT ON POLICY businesses_owner_access_policy ON businesses IS 'Users can only access businesses they own via owner_id';
COMMENT ON POLICY businesses_owner_insert_policy ON businesses IS 'Users can only create businesses for themselves via owner_id';

-- Update function comments
COMMENT ON FUNCTION ensure_business_owner_id() IS 'Automatically sets owner_id to authenticated user and prevents cross-user business creation';
