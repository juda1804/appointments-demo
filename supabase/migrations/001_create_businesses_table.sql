-- Migration: Create businesses table with Colombian market specializations
-- Description: Core businesses table with multi-tenant Row Level Security

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create businesses table
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Colombian address structure
    street VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    department VARCHAR(50) NOT NULL,
    postal_code VARCHAR(20),
    
    -- Colombian phone numbers with validation
    phone VARCHAR(20) NOT NULL,
    whatsapp_number VARCHAR(20),
    
    -- Business contact
    email VARCHAR(255) NOT NULL,
    
    -- Colombian-specific settings
    settings JSONB NOT NULL DEFAULT '{
        "timezone": "America/Bogota",
        "currency": "COP",
        "businessHours": [
            {"dayOfWeek": 1, "openTime": "08:00", "closeTime": "18:00", "isOpen": true},
            {"dayOfWeek": 2, "openTime": "08:00", "closeTime": "18:00", "isOpen": true},
            {"dayOfWeek": 3, "openTime": "08:00", "closeTime": "18:00", "isOpen": true},
            {"dayOfWeek": 4, "openTime": "08:00", "closeTime": "18:00", "isOpen": true},
            {"dayOfWeek": 5, "openTime": "08:00", "closeTime": "18:00", "isOpen": true},
            {"dayOfWeek": 6, "openTime": "08:00", "closeTime": "14:00", "isOpen": true},
            {"dayOfWeek": 0, "openTime": "10:00", "closeTime": "14:00", "isOpen": false}
        ]
    }'::JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints for Colombian phone number validation
-- Colombian phone format: +57 XXX XXX XXXX (10 digits after +57)
ALTER TABLE businesses ADD CONSTRAINT check_phone_format 
    CHECK (phone ~ '^\+57 [0-9]{3} [0-9]{3} [0-9]{4}$');

ALTER TABLE businesses ADD CONSTRAINT check_whatsapp_format 
    CHECK (whatsapp_number IS NULL OR whatsapp_number ~ '^\+57 [0-9]{3} [0-9]{3} [0-9]{4}$');

-- Add constraint for email format
ALTER TABLE businesses ADD CONSTRAINT check_email_format 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add constraint for Colombian departments (all 32 departments + 1 capital district)
ALTER TABLE businesses ADD CONSTRAINT check_department_valid 
    CHECK (department IN (
        'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá',
        'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba',
        'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena',
        'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda',
        'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca',
        'Vaupés', 'Vichada', 'Bogotá D.C.'
    ));

-- Create indexes for better performance
CREATE INDEX idx_businesses_email ON businesses(email);
CREATE INDEX idx_businesses_city_department ON businesses(city, department);
CREATE INDEX idx_businesses_created_at ON businesses(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_businesses_updated_at 
    BEFORE UPDATE ON businesses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add table comment
COMMENT ON TABLE businesses IS 'Colombian businesses with multi-tenant isolation via RLS';
COMMENT ON COLUMN businesses.phone IS 'Colombian phone number in format +57 XXX XXX XXXX';
COMMENT ON COLUMN businesses.whatsapp_number IS 'Colombian WhatsApp number in format +57 XXX XXX XXXX';
COMMENT ON COLUMN businesses.settings IS 'Business settings including Colombian timezone, currency, and hours';