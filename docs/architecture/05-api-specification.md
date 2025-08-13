# API Specification

Based on the REST API style selected in the tech stack, this document defines all endpoints required for the Colombian Appointment Management System MVP. All endpoints use JSON for request/response formatting and include comprehensive validation for Colombian business requirements.

## Authentication & Authorization

All API endpoints except public booking queries require authentication via Supabase Auth JWT tokens. Multi-tenant isolation is enforced through Row Level Security policies that automatically filter data by business_id.

**Authentication Header:**
```
Authorization: Bearer <jwt_token>
```

**Tenant Context:**
Each authenticated request automatically includes the user's business context through Supabase RLS policies and the X-Business-ID header.

## Core Business Management

### POST /api/business/register

**Purpose:** Register a new Colombian service business with complete multi-tenant setup

**Request Body:**
```typescript
interface BusinessRegistrationRequest {
  name: string;
  email: string;
  phone: string; // +57 XXX XXX XXXX format
  address: {
    street: string;
    city: string;
    department: string;
    postal_code?: string;
  };
  whatsapp_number: string;
  owner_name: string;
  owner_email: string;
  password: string;
}
```

**Response:**
```typescript
interface BusinessRegistrationResponse {
  business: Business;
  owner: {
    id: string;
    email: string;
    access_token: string;
  };
  setup_required: {
    specialists: boolean;
    services: boolean;
    working_hours: boolean;
  };
}
```

**Status Codes:**
- `201` - Business created successfully
- `400` - Validation error (invalid Colombian phone format, duplicate email)
- `409` - Business already exists with this email

### GET /api/business/profile

**Purpose:** Retrieve current business profile and settings

**Response:**
```typescript
interface BusinessProfileResponse {
  business: Business;
  statistics: {
    total_specialists: number;
    total_services: number;
    total_appointments_month: number;
    revenue_month_cop: number;
  };
}
```

### PUT /api/business/profile

**Purpose:** Update business profile information

**Request Body:** Partial<Business> (excluding id, created_at, updated_at)

## Specialist Management

### GET /api/specialists

**Purpose:** List all specialists for the authenticated business

**Query Parameters:**
- `active_only?: boolean` - Filter to active specialists only
- `service_id?: string` - Filter specialists who can perform specific service

**Response:**
```typescript
interface SpecialistsListResponse {
  specialists: (Specialist & {
    upcoming_appointments: number;
    services_count: number;
  })[];
  total: number;
}
```

### POST /api/specialists

**Purpose:** Add new specialist to the business

**Request Body:**
```typescript
interface CreateSpecialistRequest {
  name: string;
  email?: string;
  specialties: string[]; // Service IDs
}
```

**Response:**
```typescript
interface CreateSpecialistResponse {
  specialist: Specialist;
  message: string;
}
```

**Status Codes:**
- `201` - Specialist created successfully
- `400` - Validation error
- `409` - Specialist with email already exists in business

### PUT /api/specialists/[id]

**Purpose:** Update specialist information

**Request Body:** Partial<CreateSpecialistRequest>

### PUT /api/specialists/[id]/working-hours

**Purpose:** Set specialist working hours

**Request Body:**
```typescript
interface SetWorkingHoursRequest {
  working_hours: SpecialistWorkingHours[];
}
```

## Service Management

### GET /api/services

**Purpose:** List all services offered by the business

**Response:**
```typescript
interface ServicesListResponse {
  services: (Service & {
    specialists_count: number;
    appointments_this_month: number;
  })[];
  categories: ServiceCategory[];
}
```

### POST /api/services

**Purpose:** Create new service with Colombian peso pricing

**Request Body:**
```typescript
interface CreateServiceRequest {
  name: string;
  description?: string;
  duration_minutes: number; // Must be multiple of 15
  price_cop: number; // Integer, Colombian pesos
  category: ServiceCategory;
}
```

**Validation:**
- `duration_minutes` must be multiple of 15 (15, 30, 45, 60, etc.)
- `price_cop` must be positive integer
- `name` must be unique within business

**Response:**
```typescript
interface CreateServiceResponse {
  service: Service;
  message: string;
}
```

### PUT /api/services/[id]

**Purpose:** Update service information

**Request Body:** Partial<CreateServiceRequest>

## Appointment Booking (Core Feature)

### GET /api/availability

**Purpose:** Get real-time availability for appointment booking with Colombian holiday integration

**Query Parameters:**
- `specialist_id: string` - Required
- `service_id: string` - Required  
- `date: string` - ISO date (YYYY-MM-DD)
- `duration_days?: number` - Days to look ahead (default: 7, max: 30)

**Response:**
```typescript
interface AvailabilityResponse {
  available_slots: {
    date: string; // YYYY-MM-DD
    time_slots: {
      start_time: string; // "09:00", "09:15", etc.
      end_time: string;
      is_available: boolean;
      blocked_reason?: 'holiday' | 'working_hours' | 'booked' | 'buffer';
    }[];
  }[];
  holidays_in_range: ColombianHoliday[];
  business_closures: BusinessClosure[];
}
```

### POST /api/appointments

**Purpose:** Book new appointment with conflict prevention

**Request Body:**
```typescript
interface CreateAppointmentRequest {
  client_id?: string; // If existing client
  client_data?: CreateClientRequest; // If new client
  specialist_id: string;
  service_id: string;
  appointment_date: string; // YYYY-MM-DD
  start_time: string; // "14:30" (15-minute granularity)
  notes?: string;
}

interface CreateClientRequest {
  name: string;
  email: string;
  phone: string; // Colombian format
  id_number: string; // Colombian cédula
}
```

**Response:**
```typescript
interface CreateAppointmentResponse {
  appointment: Appointment;
  client: Client; // Created or existing
  conflict_check: {
    conflicts_found: boolean;
    validation_passed: boolean;
  };
  next_available_slot?: {
    date: string;
    start_time: string;
  };
}
```

**Status Codes:**
- `201` - Appointment created successfully
- `400` - Validation error (invalid time slot, client data issues)
- `409` - Booking conflict (slot no longer available)
- `422` - Business rules violation (holiday, working hours, cancellation policy)

### GET /api/appointments

**Purpose:** List appointments for the business with filtering

**Query Parameters:**
- `date_from?: string` - ISO date
- `date_to?: string` - ISO date
- `specialist_id?: string` - Filter by specialist
- `status?: AppointmentStatus` - Filter by status
- `limit?: number` - Default 50, max 200

**Response:**
```typescript
interface AppointmentsListResponse {
  appointments: (Appointment & {
    client: Pick<Client, 'name' | 'phone' | 'email'>;
    specialist: Pick<Specialist, 'name'>;
    service: Pick<Service, 'name' | 'duration_minutes' | 'price_cop'>;
  })[];
  total: number;
  summary: {
    total_revenue_cop: number;
    appointments_by_status: Record<AppointmentStatus, number>;
  };
}
```

### PUT /api/appointments/[id]

**Purpose:** Update appointment status or details

**Request Body:**
```typescript
interface UpdateAppointmentRequest {
  status?: AppointmentStatus;
  notes?: string;
  cancellation_reason?: string; // Required if status = 'CANCELLED'
}
```

### PUT /api/appointments/[id]/reschedule

**Purpose:** Reschedule appointment to new time slot

**Request Body:**
```typescript
interface RescheduleAppointmentRequest {
  new_date: string; // YYYY-MM-DD
  new_start_time: string; // "14:30"
  reason?: string;
}
```

## Client Management

### GET /api/clients

**Purpose:** List clients who have booked with the business

**Query Parameters:**
- `search?: string` - Search by name, phone, or email
- `limit?: number` - Default 50
- `offset?: number` - Pagination

**Response:**
```typescript
interface ClientsListResponse {
  clients: (Client & {
    last_appointment_date?: Date;
    total_appointments: number;
    total_spent_cop: number;
  })[];
  total: number;
}
```

### POST /api/clients

**Purpose:** Add new client to the business

**Request Body:** CreateClientRequest (same as in appointment booking)

### PUT /api/clients/[id]

**Purpose:** Update client information

**Request Body:** Partial<CreateClientRequest>

## Colombian Market Integration

### GET /api/colombian-holidays

**Purpose:** Get Colombian holidays for appointment blocking

**Query Parameters:**
- `year: number` - Required
- `city_code?: string` - Filter regional holidays

**Response:**
```typescript
interface ColombianHolidaysResponse {
  holidays: ColombianHoliday[];
  next_holiday: ColombianHoliday | null;
}
```

### POST /api/whatsapp/webhook

**Purpose:** Handle WhatsApp Business API webhooks

**Request Body:** WhatsApp webhook payload (varies by event type)

**Response:** `{ status: 'received' }`

## Business Dashboard

### GET /api/business/dashboard

**Purpose:** Get business dashboard data

**Query Parameters:**
- `period?: 'today' | 'week' | 'month'` - Default 'today'

**Response:**
```typescript
interface DashboardResponse {
  summary: {
    appointments_today: number;
    revenue_today_cop: number;
    upcoming_appointments: number;
    completion_rate_percent: number;
  };
  recent_appointments: (Appointment & {
    client: Pick<Client, 'name' | 'phone'>;
    specialist: Pick<Specialist, 'name'>;
    service: Pick<Service, 'name' | 'price_cop'>;
  })[];
  availability_summary: {
    available_slots_today: number;
    busiest_specialist: string;
    peak_hours: { hour: number; appointment_count: number }[];
  };
}
```

## Error Handling

All API endpoints return errors in a consistent format:

```typescript
interface ApiErrorResponse {
  error: {
    code: string; // Machine-readable error code
    message: string; // Human-readable error message
    details?: Record<string, any>; // Additional context
    field_errors?: Record<string, string>; // Validation errors by field
    timestamp: string;
    request_id: string;
  };
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Request data validation failed
- `BOOKING_CONFLICT` - Appointment slot conflict
- `BUSINESS_NOT_FOUND` - Business not found or access denied
- `HOLIDAY_RESTRICTION` - Booking blocked due to Colombian holiday
- `CANCELLATION_POLICY_VIOLATION` - Cancellation too close to appointment time
- `SPECIALIST_UNAVAILABLE` - Specialist not available at requested time
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `RATE_LIMIT_EXCEEDED` - Too many requests

## Rate Limiting

**Business Operations:** 100 requests per minute per business  
**Booking Operations:** 20 requests per minute per IP (prevents booking abuse)  
**Availability Queries:** 200 requests per minute per business (high frequency for UI updates)  
**Client Operations:** 50 requests per minute per business

Rate limit headers included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
```

## API Design Rationale

### RESTful Design Decisions

1. **Resource-based URLs** - Clear endpoint structure following Colombian business entities
2. **HTTP methods** - GET for queries, POST for creation, PUT for updates, DELETE for removal
3. **Status codes** - Meaningful HTTP status codes for different error types
4. **JSON everywhere** - Consistent request/response format with Colombian locale support

### Colombian Market Optimizations

1. **Holiday integration** - Built-in Colombian holiday checking prevents invalid bookings
2. **Phone format validation** - Colombian phone number format validation (+57 XXX XXX XXXX)
3. **Peso pricing** - Integer-based peso pricing prevents rounding errors
4. **WhatsApp webhooks** - First-class WhatsApp integration for business communication

### Conflict Prevention Strategy

1. **Real-time availability** - GET /api/availability shows current state with Colombian holidays
2. **Pessimistic booking** - POST /api/appointments uses database locks for conflict prevention  
3. **Conflict response** - 409 status with next available slot suggestion
4. **Buffer time support** - Configurable buffer between appointments in business settings

### Multi-tenant Security

1. **Automatic tenant isolation** - All endpoints respect business_id through RLS policies
2. **Cross-business client support** - Clients can book across businesses safely
3. **Business-specific data** - Specialists, services, appointments are tenant-isolated
4. **Colombian market context** - Holiday calendar and closures respect business location

---

*This API specification provides comprehensive endpoints for Colombian appointment management with built-in conflict prevention, holiday integration, and multi-tenant security.*