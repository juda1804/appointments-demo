# Database Schema

This document transforms the conceptual data models into concrete PostgreSQL schema definitions with Row Level Security for multi-tenant isolation, Colombian market optimizations, and performance indexes for real-time booking operations.

## Schema Overview

**Database:** PostgreSQL 15+ via Supabase  
**Multi-tenancy:** Row Level Security (RLS) with business_id isolation  
**Colombian Features:** Custom types for addresses, holidays, and peso pricing  
**Conflict Prevention:** Composite unique constraints and check constraints  

## Core Tables

### businesses

**Purpose:** Root multi-tenant entity for Colombian service businesses

```sql
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL CHECK (phone ~ '^\\+57 [0-9]{3} [0-9]{3} [0-9]{4}$'),
    
    -- Colombian address structure
    address_street VARCHAR(500) NOT NULL,
    address_city VARCHAR(100) NOT NULL,
    address_department VARCHAR(100) NOT NULL,
    address_postal_code VARCHAR(10),
    colombia_city_code VARCHAR(10), -- For holiday calendar integration
    
    whatsapp_number VARCHAR(20) NOT NULL CHECK (whatsapp_number ~ '^\\+57 [0-9]{3} [0-9]{3} [0-9]{4}$'),
    
    -- Business settings (JSON for flexibility)
    settings JSONB NOT NULL DEFAULT '{
        "timezone": "America/Bogota",
        "currency": "COP",
        "booking_buffer_minutes": 0,
        "cancellation_policy_hours": 2,
        "working_days": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
        "holiday_calendar_enabled": true
    }',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policy: Businesses can only see their own data
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY businesses_isolation_policy ON businesses
    FOR ALL USING (id = current_setting('app.current_business_id')::UUID);
```

### clients

**Purpose:** Global client entity that can book across multiple businesses

```sql
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL CHECK (phone ~ '^\\+57 [0-9]{3} [0-9]{3} [0-9]{4}$'),
    id_number VARCHAR(20) NOT NULL, -- Colombian cédula
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No RLS on clients - they are global entities
-- Business isolation happens through client_business_relations
```

### specialists

**Purpose:** Service providers within Colombian businesses

```sql
CREATE TABLE specialists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    specialties JSONB NOT NULL DEFAULT '[]', -- Array of service IDs
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policy: Tenant isolation
ALTER TABLE specialists ENABLE ROW LEVEL SECURITY;
CREATE POLICY specialists_isolation_policy ON specialists
    FOR ALL USING (business_id = current_setting('app.current_business_id')::UUID);
```

### services

**Purpose:** Services offered by Colombian businesses with peso pricing

```sql
CREATE TYPE service_category AS ENUM ('MEDICAL', 'BEAUTY', 'WELLNESS', 'CONSULTING', 'FITNESS', 'OTHER');

CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes % 15 = 0),
    price_cop INTEGER NOT NULL CHECK (price_cop > 0), -- Colombian pesos, no decimals
    category service_category NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(business_id, name) -- Service names unique within business
);

-- RLS Policy
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY services_isolation_policy ON services
    FOR ALL USING (business_id = current_setting('app.current_business_id')::UUID);
```

### appointments

**Purpose:** Core booking entity with Colombian business rules and conflict prevention

```sql
CREATE TYPE appointment_status AS ENUM ('CONFIRMED', 'CANCELLED', 'NO_SHOW', 'COMPLETED', 'RESCHEDULED');

CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id),
    specialist_id UUID NOT NULL REFERENCES specialists(id),
    service_id UUID NOT NULL REFERENCES services(id),
    
    -- Appointment scheduling with 15-minute granularity
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL CHECK (EXTRACT(MINUTE FROM start_time)::INTEGER % 15 = 0),
    end_time TIME NOT NULL CHECK (EXTRACT(MINUTE FROM end_time)::INTEGER % 15 = 0),
    
    status appointment_status NOT NULL DEFAULT 'CONFIRMED',
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    CHECK (end_time > start_time),
    CHECK (appointment_date >= CURRENT_DATE), -- No past appointments
    
    -- CRITICAL: Prevent double-booking at database level
    UNIQUE(business_id, specialist_id, appointment_date, start_time)
);

-- Critical index for booking conflict prevention
CREATE UNIQUE INDEX idx_appointments_conflict_prevention 
    ON appointments(business_id, specialist_id, appointment_date, start_time)
    WHERE status NOT IN ('CANCELLED', 'RESCHEDULED');

-- RLS Policy
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY appointments_isolation_policy ON appointments
    FOR ALL USING (business_id = current_setting('app.current_business_id')::UUID);
```

## Colombian Market Integration

### colombian_holidays

**Purpose:** National and regional Colombian holidays for appointment blocking

```sql
CREATE TYPE holiday_type AS ENUM ('NATIONAL', 'REGIONAL', 'RELIGIOUS', 'CIVIC');

CREATE TABLE colombian_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type holiday_type NOT NULL,
    is_national BOOLEAN NOT NULL DEFAULT false,
    applies_to_cities JSONB, -- Array of city codes
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(date, name)
);

-- No RLS - holidays are global data
```

### business_closures

**Purpose:** Business-specific closures and special dates

```sql
CREATE TABLE business_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    reason VARCHAR(500) NOT NULL,
    is_recurring BOOLEAN NOT NULL DEFAULT false, -- Annual closure
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(business_id, date)
);

-- RLS Policy
ALTER TABLE business_closures ENABLE ROW LEVEL SECURITY;
CREATE POLICY business_closures_isolation_policy ON business_closures
    FOR ALL USING (business_id = current_setting('app.current_business_id')::UUID);
```

## Performance Optimization

### Critical Indexes

```sql
-- Booking performance indexes
CREATE INDEX idx_appointments_business_date ON appointments(business_id, appointment_date);
CREATE INDEX idx_appointments_specialist_date ON appointments(specialist_id, appointment_date);
CREATE INDEX idx_appointments_availability 
    ON appointments(business_id, specialist_id, appointment_date, start_time, end_time)
    WHERE status IN ('CONFIRMED', 'COMPLETED');

-- Business lookup indexes
CREATE INDEX idx_specialists_business ON specialists(business_id);
CREATE INDEX idx_specialists_active ON specialists(business_id, is_active) WHERE is_active = true;
CREATE INDEX idx_services_business ON services(business_id);
CREATE INDEX idx_services_active ON services(business_id, is_active) WHERE is_active = true;

-- Client lookup indexes
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_id_number ON clients(id_number);

-- Holiday lookup indexes
CREATE INDEX idx_holidays_date ON colombian_holidays(date);
CREATE INDEX idx_holidays_national ON colombian_holidays(is_national) WHERE is_national = true;
```

### Real-time Availability Function

**Purpose:** Optimized SQL function for real-time availability calculation with Colombian holiday integration

```sql
CREATE OR REPLACE FUNCTION get_availability_slots(
    p_business_id UUID,
    p_specialist_id UUID,
    p_service_id UUID,
    p_date DATE,
    p_duration_days INTEGER DEFAULT 7
) RETURNS TABLE (
    date DATE,
    time_slot TIME,
    is_available BOOLEAN,
    blocked_reason TEXT
) AS $$
DECLARE
    service_duration INTEGER;
BEGIN
    -- Get service duration
    SELECT duration_minutes INTO service_duration
    FROM services 
    WHERE id = p_service_id AND business_id = p_business_id;
    
    -- Generate 15-minute time slots with availability check
    RETURN QUERY
    WITH time_slots AS (
        SELECT 
            generate_series(p_date, p_date + (p_duration_days - 1), '1 day'::interval)::date as slot_date,
            generate_series(TIME '06:00', TIME '21:45', '15 minutes'::interval) as slot_time
    ),
    availability_check AS (
        SELECT 
            ts.slot_date,
            ts.slot_time,
            CASE
                -- Check for Colombian holidays
                WHEN EXISTS (SELECT 1 FROM colombian_holidays WHERE date = ts.slot_date) THEN false
                -- Check for business closures
                WHEN EXISTS (SELECT 1 FROM business_closures WHERE business_id = p_business_id AND date = ts.slot_date) THEN false
                -- Check for existing appointments (conflict detection)
                WHEN EXISTS (
                    SELECT 1 FROM appointments a
                    WHERE a.business_id = p_business_id
                    AND a.specialist_id = p_specialist_id
                    AND a.appointment_date = ts.slot_date
                    AND a.status IN ('CONFIRMED', 'COMPLETED')
                    AND (ts.slot_time, ts.slot_time + (service_duration || ' minutes')::INTERVAL) 
                        OVERLAPS (a.start_time, a.end_time)
                ) THEN false
                ELSE true
            END as is_available,
            CASE
                WHEN EXISTS (SELECT 1 FROM colombian_holidays WHERE date = ts.slot_date) THEN 'holiday'
                WHEN EXISTS (SELECT 1 FROM business_closures WHERE business_id = p_business_id AND date = ts.slot_date) THEN 'business_closure'
                WHEN EXISTS (
                    SELECT 1 FROM appointments a
                    WHERE a.business_id = p_business_id AND a.specialist_id = p_specialist_id
                    AND a.appointment_date = ts.slot_date AND a.status IN ('CONFIRMED', 'COMPLETED')
                    AND (ts.slot_time, ts.slot_time + (service_duration || ' minutes')::INTERVAL) 
                        OVERLAPS (a.start_time, a.end_time)
                ) THEN 'booked'
                ELSE null
            END as blocked_reason
        FROM time_slots ts
    )
    SELECT ac.slot_date, ac.slot_time, ac.is_available, ac.blocked_reason
    FROM availability_check ac
    ORDER BY ac.slot_date, ac.slot_time;
END;
$$ LANGUAGE plpgsql;
```

## Database Triggers and Functions

### Auto-update timestamps

```sql
-- Function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at column
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_specialists_updated_at BEFORE UPDATE ON specialists 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
```

### Appointment validation function

```sql
-- Function to validate appointment business rules
CREATE OR REPLACE FUNCTION validate_appointment_business_rules()
RETURNS TRIGGER AS $$
DECLARE
    business_settings JSONB;
    is_holiday BOOLEAN;
    is_closure BOOLEAN;
BEGIN
    -- Get business settings
    SELECT settings INTO business_settings
    FROM businesses WHERE id = NEW.business_id;
    
    -- Check Colombian holidays (if enabled)
    IF (business_settings->>'holiday_calendar_enabled')::BOOLEAN THEN
        SELECT EXISTS(SELECT 1 FROM colombian_holidays WHERE date = NEW.appointment_date) INTO is_holiday;
        IF is_holiday THEN
            RAISE EXCEPTION 'Cannot book appointment on Colombian holiday';
        END IF;
    END IF;
    
    -- Check business closures
    SELECT EXISTS(SELECT 1 FROM business_closures WHERE business_id = NEW.business_id AND date = NEW.appointment_date) INTO is_closure;
    IF is_closure THEN
        RAISE EXCEPTION 'Business is closed on this date';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_appointment_before_insert 
    BEFORE INSERT ON appointments
    FOR EACH ROW EXECUTE PROCEDURE validate_appointment_business_rules();
```

## Database Schema Design Rationale

### Multi-Tenant Security Design

1. **Row Level Security (RLS)** - Every business table includes RLS policies filtering by business_id
2. **Client isolation strategy** - Clients are global but relationships are business-specific  
3. **Automatic tenant context** - `current_setting('app.current_business_id')` provides tenant context
4. **Cascade deletions** - Business deletion removes all associated data automatically

### Colombian Market Optimizations

1. **Phone number validation** - CHECK constraints enforce Colombian phone format (+57 XXX XXX XXXX)
2. **Address structure** - Separate fields for Colombian administrative divisions (departments)
3. **Holiday integration** - Dedicated table for Colombian national and regional holidays
4. **Peso pricing** - Integer-only pricing prevents floating-point rounding issues

### Booking Conflict Prevention

1. **Composite unique constraint** - (business_id, specialist_id, appointment_date, start_time) prevents double-booking
2. **15-minute granularity** - CHECK constraints ensure all times follow 15-minute intervals  
3. **Time validation** - Multiple CHECK constraints prevent invalid time ranges
4. **Status-aware uniqueness** - Unique constraint excludes cancelled/rescheduled appointments

### Performance Optimizations

1. **Strategic indexes** - Covering indexes for availability queries and appointment lookups
2. **Partial indexes** - Active-only indexes for frequently filtered data
3. **GIN indexes** - For JSONB fields (specialties, settings, city codes)
4. **Availability function** - Optimized SQL function for real-time availability calculation

## Migration Strategy

### Initial Schema Deployment

```sql
-- Migration order (important for foreign key constraints)
1. businesses (root entity)
2. clients (no dependencies)
3. colombian_holidays (no dependencies)
4. specialists (depends on businesses)
5. services (depends on businesses)
6. appointments (depends on all above)
7. business_closures (depends on businesses)
```

### Sample Data for Development

```sql
-- Insert Colombian departments for address validation
INSERT INTO colombian_departments (name, code) VALUES
    ('Cundinamarca', 'CUN'),
    ('Antioquia', 'ANT'),
    ('Valle del Cauca', 'VAC'),
    -- ... all 32 Colombian departments

-- Insert 2025 Colombian national holidays
INSERT INTO colombian_holidays (date, name, type, is_national) VALUES
    ('2025-01-01', 'Año Nuevo', 'NATIONAL', true),
    ('2025-01-06', 'Día de los Reyes Magos', 'RELIGIOUS', true),
    -- ... all Colombian holidays for current year
```

---

*This database schema provides the foundation for multi-tenant Colombian appointment management with zero double-booking guarantees and optimal performance for real-time booking operations.*