# Data Models

The core data models represent Colombian business entities shared between frontend and backend. These TypeScript interfaces ensure type safety and define the business domain clearly.

## Business Entity

### Purpose
Represents a Colombian service business with complete multi-tenant isolation. This is the root tenant entity that owns all other business data.

### TypeScript Interface

```typescript
interface Business {
  id: string; // UUID for tenant isolation
  name: string;
  email: string;
  phone: string; // Colombian format: +57 XXX XXX XXXX
  address: BusinessAddress;
  whatsapp_number: string;
  settings: BusinessSettings;
  created_at: Date;
  updated_at: Date;
}

interface BusinessAddress {
  street: string;
  city: string;
  department: string; // Colombian administrative division
  postal_code?: string;
  colombia_city_code?: string; // For holiday calendar integration
}

interface BusinessSettings {
  timezone: string; // e.g., "America/Bogota"
  currency: "COP"; // Colombian Peso only for MVP
  booking_buffer_minutes: number; // Default: 0, allows 15-minute buffer
  cancellation_policy_hours: number; // Default: 2 hours minimum
  working_days: WeekDay[];
  holiday_calendar_enabled: boolean;
}
```

### Key Attributes
- **id**: UUID for tenant isolation across all related data
- **phone/whatsapp_number**: Colombian phone format validation (+57 XXX XXX XXXX)
- **address**: Colombian department structure (not states/provinces)
- **settings**: JSON configuration for business-specific rules

### Relationships
- **Has many**: Specialists, Services, Appointments, WorkingHours
- **Belongs to**: None (root tenant entity)

## Client Entity

### Purpose
End customers who book appointments across businesses. Clients are global entities that can book with multiple businesses.

### TypeScript Interface

```typescript
interface Client {
  id: string; // UUID - can book across multiple businesses
  name: string;
  email: string;
  phone: string; // Colombian format
  id_number: string; // Colombian cédula number
  created_at: Date;
  updated_at: Date;
}

// Client relationship to businesses (many-to-many)
interface ClientBusinessRelation {
  client_id: string;
  business_id: string;
  first_appointment_date: Date;
  total_appointments: number;
  notes?: string; // Business-specific client notes
  created_at: Date;
}
```

### Key Attributes
- **id**: Global client identifier (not tenant-isolated)
- **id_number**: Colombian cédula for unique identification
- **phone**: Colombian format validation

### Relationships
- **Belongs to many**: Businesses (through appointments)
- **Has many**: Appointments across different businesses

## Specialist Entity

### Purpose
Service providers working within Colombian businesses. Each specialist belongs to exactly one business.

### TypeScript Interface

```typescript
interface Specialist {
  id: string;
  business_id: string; // Tenant isolation
  name: string;
  email?: string;
  specialties: string[]; // Service IDs they can perform
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Specialist availability (overrides business hours)
interface SpecialistWorkingHours {
  id: string;
  specialist_id: string;
  business_id: string; // Tenant isolation
  day_of_week: WeekDay;
  start_time: string; // "09:00" format
  end_time: string; // "17:00" format
  is_available: boolean;
  effective_date: Date; // When these hours take effect
}

type WeekDay = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
```

### Key Attributes
- **business_id**: Enforces tenant isolation
- **specialties**: Array of service IDs they can perform
- **is_active**: Controls availability for new bookings

### Relationships
- **Belongs to**: Business (tenant isolation)
- **Has many**: Appointments, SpecialistWorkingHours
- **Belongs to many**: Services (through specialties)

## Service Entity

### Purpose
Services offered by Colombian businesses with peso pricing and duration requirements.

### TypeScript Interface

```typescript
interface Service {
  id: string;
  business_id: string; // Tenant isolation
  name: string;
  description?: string;
  duration_minutes: number; // Must be multiple of 15 (15, 30, 45, 60, etc.)
  price_cop: number; // Colombian pesos (integer, no decimals)
  category: ServiceCategory;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

type ServiceCategory = 
  | 'MEDICAL' 
  | 'BEAUTY' 
  | 'WELLNESS' 
  | 'CONSULTING' 
  | 'FITNESS' 
  | 'OTHER';
```

### Key Attributes
- **duration_minutes**: Must be multiple of 15 for scheduling grid compatibility
- **price_cop**: Integer-based Colombian peso pricing (no decimal cents)
- **category**: Predefined service categories for Colombian market

### Relationships
- **Belongs to**: Business (tenant isolation)
- **Has many**: Appointments
- **Belongs to many**: Specialists (who can perform the service)

## Appointment Entity

### Purpose
Core booking entity with conflict prevention and Colombian business rules. This is the most critical entity for zero double-booking requirement.

### TypeScript Interface

```typescript
interface Appointment {
  id: string;
  business_id: string; // Tenant isolation
  client_id: string;
  specialist_id: string;
  service_id: string;
  appointment_date: Date; // Date only (YYYY-MM-DD)
  start_time: string; // Time only ("14:30") - 15-minute granularity
  end_time: string; // Calculated from service duration
  status: AppointmentStatus;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  cancelled_at?: Date;
  cancellation_reason?: string;
}

type AppointmentStatus = 
  | 'CONFIRMED'    // Successfully booked
  | 'CANCELLED'    // Cancelled by client or business
  | 'NO_SHOW'      // Client didn't show up
  | 'COMPLETED'    // Service was provided
  | 'RESCHEDULED'; // Moved to different time

// For conflict checking and availability calculation
interface TimeSlot {
  date: Date;
  start_time: string; // "09:00", "09:15", "09:30", etc.
  end_time: string;
  is_available: boolean;
  specialist_id: string;
  business_id: string;
}
```

### Key Attributes
- **appointment_date/start_time**: Separated for timezone handling and Colombian holiday integration
- **status**: Clear workflow states for business operations
- **15-minute granularity**: start_time follows 15-minute intervals only

### Conflict Prevention
- **Composite unique constraint**: (business_id, specialist_id, appointment_date, start_time)
- **TimeSlot abstraction**: Enables availability calculation and conflict checking

### Relationships
- **Belongs to**: Business, Client, Specialist, Service (all required)

## Colombian Holiday Integration

### Purpose
Colombian national holidays and business-specific closures that block appointment booking.

### TypeScript Interface

```typescript
interface ColombianHoliday {
  id: string;
  date: Date;
  name: string;
  type: HolidayType;
  is_national: boolean;
  applies_to_cities?: string[]; // City codes where applicable
}

type HolidayType = 
  | 'NATIONAL'     // National holiday (all Colombia)
  | 'REGIONAL'     // Regional/departmental
  | 'RELIGIOUS'    // Religious observance
  | 'CIVIC';       // Civic celebration

interface BusinessClosure {
  id: string;
  business_id: string; // Tenant isolation
  date: Date;
  reason: string;
  is_recurring: boolean; // Annual closure
  created_at: Date;
}
```

### Key Attributes
- **applies_to_cities**: Regional holidays apply only to specific Colombian cities
- **is_recurring**: Annual closures (e.g., business anniversary)

## Data Model Design Rationale

### Multi-Tenant Design Decisions

1. **business_id in every entity** - Ensures complete tenant isolation at the data layer
2. **Client as global entity** - Allows booking across businesses while maintaining business-specific relations  
3. **UUID identifiers** - Prevents enumeration attacks and ensures global uniqueness
4. **Composite relationships** - ClientBusinessRelation tracks cross-business client history

### Colombian Market Specializations

1. **id_number (cédula)** - Colombian national ID for client identification and verification
2. **Colombian address structure** - Departments instead of states/provinces matches government structure
3. **WhatsApp integration** - Business phone number as first-class field for primary communication
4. **COP currency** - Colombian peso as native currency with integer pricing (no cents)
5. **Holiday integration** - Colombian government holiday calendar prevents invalid bookings

### Scheduling Engine Design

1. **15-minute granularity** - start_time follows 15-minute intervals ("09:00", "09:15", "09:30") 
2. **Date/time separation** - Enables timezone handling and Colombian holiday integration
3. **Duration validation** - Service duration must be multiple of 15 minutes for grid alignment
4. **TimeSlot abstraction** - Enables real-time conflict checking and availability calculation
5. **Status workflow** - Clear appointment states support Colombian business processes

### Appointment Conflict Prevention

1. **Composite unique constraints** - (business_id, specialist_id, appointment_date, start_time) prevents double-booking
2. **Status tracking** - Clear states enable proper cancellation and rescheduling workflows  
3. **Cancellation policy** - 2-hour minimum notice built into data model validation
4. **Real-time synchronization** - Data model supports Supabase real-time subscriptions

## Type Safety Patterns

### Shared Type Definitions
All interfaces are exported from a shared package for use across frontend and backend:

```typescript
// packages/types/src/business.ts
export type { Business, Client, Specialist, Service, Appointment }
export type { BusinessAddress, BusinessSettings }
export type { AppointmentStatus, ServiceCategory, WeekDay }
export type { ColombianHoliday, HolidayType, BusinessClosure }
```

### Validation Schemas
Zod schemas provide runtime validation matching TypeScript interfaces:

```typescript
import { z } from 'zod'

export const ColombianPhoneSchema = z.string().regex(
  /^\+57 \d{3} \d{3} \d{4}$/,
  'Invalid Colombian phone format'
)

export const BusinessSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: ColombianPhoneSchema,
  // ... other fields
})
```

---

*These data models provide the foundation for type-safe Colombian appointment management with complete multi-tenant isolation and zero double-booking guarantees.*