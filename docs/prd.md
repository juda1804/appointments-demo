# Colombian Appointment Management System Product Requirements Document (PRD)

## Goals and Background Context

### Goals
- Enable Colombian service businesses to eliminate double-booking conflicts and manual scheduling inefficiencies
- Provide complete multi-tenant appointment management with zero cross-business data visibility
- Deliver API-driven booking system with Colombian market specializations (holidays, peso pricing, WhatsApp integration)  
- Reduce administrative overhead by 60%+ through automated scheduling intelligence
- Achieve 99.5%+ booking accuracy with real-time conflict prevention
- Scale Colombian service businesses without proportional increase in administrative staff

### Background Context

Colombian service-based businesses currently lose 15-20% of potential revenue due to fragmented appointment management systems that rely on manual processes like WhatsApp and phone calls. Most existing solutions are either too simple (basic calendar tools) or too complex (enterprise systems), and none provide the Colombian market specializations like holiday integration, peso-based pricing, and WhatsApp-first communication workflows that local businesses require.

Our solution addresses this gap by delivering a specialized SaaS platform built specifically for Colombian service businesses, featuring complete multi-tenant isolation and API-driven architecture with 15-minute scheduling granularity. The platform enables businesses to maximize specialist utilization while providing seamless booking experiences, positioning it to become the "Stripe for appointments" in the Colombian market.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-08-12 | 1.0 | Initial PRD based on comprehensive Project Brief and Architecture analysis | John (PM) |

## Requirements

### Functional

**FR1:** The system shall provide complete multi-tenant business registration with auto-generated UUID, Colombian address structure (street, city, department), and WhatsApp number integration

**FR2:** The system shall automatically create client records during booking with required fields (name, email, Colombian phone format +57 XXX XXX XXXX, cédula ID number) and enable cross-business booking capability

**FR3:** The system shall manage specialists within businesses including individual working hours configuration, service specialties assignment, and active/inactive status control

**FR4:** The system shall implement 15-minute granular scheduling where longer services automatically consume multiple consecutive time slots with real-time availability calculation

**FR5:** The system shall provide robust booking API endpoints with comprehensive validation including availability checking, working hours verification, service duration validation, and Colombian business rules enforcement

**FR6:** The system shall integrate Colombian national holiday calendar to automatically prevent bookings during holidays and support configurable business closure days

**FR7:** The system shall implement appointment lifecycle management including booking, rescheduling, cancellation with 2-hour minimum notice policy, and status tracking (CONFIRMED, CANCELLED, NO_SHOW, COMPLETED, RESCHEDULED)

**FR8:** The system shall prevent double-booking through database-level unique constraints and pessimistic locking with conflict detection returning next available slot suggestions

**FR9:** The system shall support service management with name, duration (multiples of 15 minutes), Colombian peso pricing (integer-based), and category classification

**FR10:** The system shall provide working hours configuration at both business and specialist levels with overlap validation and Colombian timezone support (America/Bogota)

### Non Functional

**NFR1:** The system shall maintain 99.5%+ booking accuracy with zero double-booking incidents through ACID database transactions and Row Level Security

**NFR2:** API response times shall be <500ms for booking operations with 99.9% uptime SLA to support Colombian internet infrastructure

**NFR3:** The system shall enforce complete multi-tenant data isolation using PostgreSQL Row Level Security where businesses have zero visibility into other business data

**NFR4:** The system shall handle 100+ concurrent appointment bookings without conflicts using pessimistic database locking

**NFR5:** The system shall maintain data compliance with Colombian data protection regulations and secure API authentication via JWT tokens

**NFR6:** The system shall support 500+ active business accounts within 18 months with auto-scaling cloud infrastructure

**NFR7:** The system shall provide <3 days time-to-value where 90% of new businesses achieve their first successful appointment booking

**NFR8:** The system shall maintain <5% monthly business churn rate through reliable operations and Colombian market specialization

## User Interface Design Goals

### Overall UX Vision

Create a mobile-first, intuitive appointment management interface that mirrors familiar Colombian business workflows while providing professional digital experiences. The UI should feel like a natural extension of how Colombian service businesses operate - simple enough for staff with basic tech comfort levels, yet sophisticated enough to handle complex scheduling scenarios. Emphasize visual clarity for appointment conflicts, Colombian holiday indicators, and real-time availability updates to prevent booking errors.

### Key Interaction Paradigms

- **Calendar-centric navigation** with clear 15-minute time slot visualization and drag-drop appointment management
- **Progressive disclosure** where complex features (specialist management, service configuration) are accessible but don't overwhelm daily operations
- **Colombian phone number auto-formatting** with +57 prefix and standard formatting during input
- **Real-time conflict prevention** with immediate visual feedback and alternative slot suggestions
- **Peso pricing display** with proper Colombian currency formatting (COP $XX,XXX)
- **Touch-friendly mobile interactions** optimized for Colombian smartphone usage patterns

### Core Screens and Views

- **Business Dashboard** - Today's appointments overview with key metrics and quick actions
- **Calendar View** - Weekly/daily appointment calendar with specialist filtering and availability visualization  
- **Booking Form** - New appointment creation with client search, service selection, and real-time availability checking
- **Client Management** - Client profiles with appointment history and cross-business booking capability
- **Specialist Management** - Staff profiles with individual working hours and service assignments
- **Service Configuration** - Service creation with duration, pricing, and category management
- **Business Settings** - Working hours, Colombian address management, and holiday calendar configuration

### Accessibility: WCAG AA

Implement WCAG AA compliance to ensure accessibility for Colombian users with disabilities, including proper color contrast ratios, keyboard navigation, and screen reader support for appointment information.

### Branding

Clean, professional design that conveys reliability and trustworthiness - critical for businesses trusting their appointment management to the platform. Use Colombian-friendly color schemes avoiding colors with negative cultural associations. Include subtle visual indicators for Colombian holidays and business-specific branding accommodation.

### Target Device and Platforms: Web Responsive

Primary focus on responsive web application optimized for Colombian mobile usage patterns, with progressive web app capabilities for offline calendar viewing. Designed for modern browsers with mobile-first responsive breakpoints supporting both smartphone and desktop usage.

## Technical Assumptions

### Repository Structure: Monorepo

Monorepo using npm workspaces with Next.js fullstack application. This approach enables shared TypeScript interfaces between frontend and backend, centralized dependency management, atomic deployments of related changes, and Colombian-specific utilities (holiday calendar, peso formatting) as shared packages. Supports the small team requirement (2-3 developers) with reduced complexity.

### Service Architecture

Modular monolithic architecture deployed as serverless functions via Vercel. TypeScript-based fullstack using Next.js for frontend with server-side rendering and Node.js/Express API routes for backend. Multi-tenant PostgreSQL database via Supabase with Row Level Security for complete business isolation. This combines development simplicity needed for small team with scalability for 500+ business accounts while maintaining ACID transactions for conflict-free booking.

### Testing Requirements

Unit + Integration testing approach using Jest + React Testing Library for frontend components and Jest + Supertest for API endpoints. Playwright for end-to-end testing covering critical booking workflows. Focus on API endpoint validation, booking conflict prevention, and Colombian business rule enforcement. Testing pyramid emphasizes unit tests for business logic with integration tests for booking operations and e2e tests for user workflows.

### Additional Technical Assumptions and Requests

- **Database:** PostgreSQL 15+ via Supabase with São Paulo region deployment for optimal Colombian latency (<100ms)
- **Multi-tenancy:** Row Level Security policies with automatic tenant context via business_id filtering
- **Colombian Specializations:** Custom types for Colombian addresses, holiday calendar integration, peso pricing (integer-based), phone number validation (+57 format)
- **Real-time Capabilities:** Supabase realtime subscriptions for live availability updates and booking conflict prevention
- **Deployment:** Vercel platform with automatic deployment on GitHub push, preview environments for staging
- **State Management:** Zustand for lightweight state management with TypeScript support
- **UI Framework:** Tailwind CSS for rapid UI development with Colombian design system tokens
- **API Design:** REST endpoints with comprehensive validation, rate limiting, and Colombian business rules enforcement
- **Performance:** <500ms API response times, 99.9% uptime SLA, aggressive caching for Colombian network conditions
- **Security:** JWT authentication, HTTPS everywhere, Colombian data protection compliance
- **Monitoring:** Vercel Analytics + Sentry for performance and error tracking with Colombian user insights

## Epic List

**Epic 1: Foundation & Business Registration** - Establish project infrastructure, Colombian business registration system, and core authentication with basic business profile management to enable the first Colombian service business to successfully register and access the platform.

**Epic 2: Specialist & Service Management** - Create specialist profiles with working hours configuration and service catalog management with Colombian peso pricing to enable businesses to define their team structure and service offerings.

**Epic 3: Core Booking Engine** - Implement 15-minute granular scheduling with real-time availability calculation, conflict prevention, and Colombian holiday integration to enable reliable appointment booking with zero double-booking incidents.

**Epic 4: Client Management & Appointment Operations** - Build client profile system with Colombian ID integration and complete appointment lifecycle management (booking, rescheduling, cancellation) to deliver end-to-end appointment workflow.

## Epic 1: Foundation & Business Registration

**Epic Goal:** Establish project infrastructure with Next.js/Supabase foundation, implement Colombian business registration with multi-tenant isolation, and deliver core authentication system that enables the first Colombian service business to successfully register, authenticate, and access their business dashboard with proper tenant context.

### Story 1.1: Project Foundation & Infrastructure Setup

As a **developer**,
I want **Next.js monorepo with Supabase integration and Colombian utilities**,
so that **the technical foundation supports Colombian market requirements and multi-tenant architecture**.

#### Acceptance Criteria

1. Next.js 14+ project initialized with App Router and TypeScript configuration
2. Supabase client configured with São Paulo region and authentication setup
3. PostgreSQL database schema created with Row Level Security policies for multi-tenancy
4. Colombian utility functions implemented (phone formatting, peso currency, holiday calendar)
5. Tailwind CSS configured with Colombian design system base tokens
6. GitHub repository setup with CI/CD pipeline via GitHub Actions and Vercel deployment
7. Environment configuration supports development, staging, and production environments
8. Basic health check API endpoint returns successful response

### Story 1.2: Colombian Business Registration System

As a **Colombian service business owner**,
I want **to register my business with Colombian-specific information**,
so that **I can create my account with proper address, phone, and business details**.

#### Acceptance Criteria

1. Business registration form captures name, email, Colombian phone (+57 format), and address (street, city, department)
2. Colombian phone number validation enforces +57 XXX XXX XXXX format
3. WhatsApp number field with same validation as business phone
4. Colombian address form includes department dropdown with all 32 Colombian departments
5. Business registration creates UUID identifier for multi-tenant isolation
6. Email uniqueness validation prevents duplicate business registrations
7. Registration success creates business record and redirects to dashboard
8. Form validation provides clear error messages in Spanish for Colombian users

### Story 1.3: Authentication & Business Context

As a **business owner**,
I want **secure authentication with automatic business context**,
so that **I can safely access my business data without seeing other businesses' information**.

#### Acceptance Criteria

1. Supabase Auth integration supports email/password login and registration
2. JWT tokens include business_id for automatic tenant context
3. Row Level Security policies filter all database queries by current business_id
4. Login form validates credentials and provides clear error messages
5. Authentication state persists across browser sessions
6. Logout functionality clears all authentication tokens and business context
7. Protected routes redirect unauthenticated users to login page
8. Business context automatically set in API calls via middleware

### Story 1.4: Business Dashboard Foundation

As a **business owner**,
I want **a dashboard showing my business overview**,
so that **I can see my business profile and begin configuring my appointment system**.

#### Acceptance Criteria

1. Dashboard displays current business name, address, and contact information
2. Business profile edit functionality for updating Colombian address and phone details
3. Dashboard shows setup progress indicators for specialists, services, and working hours
4. Navigation menu provides access to all major system sections
5. Dashboard is mobile-responsive for Colombian mobile usage patterns
6. Business settings panel allows timezone configuration (defaults to America/Bogota)
7. Colombian peso currency formatting displays correctly throughout dashboard
8. Quick actions panel provides shortcuts to add specialists and services

## Epic 2: Specialist & Service Management

**Epic Goal:** Enable Colombian businesses to define their team structure and service offerings by implementing specialist profile management with individual working hours configuration and comprehensive service catalog with Colombian peso pricing, providing the business configuration foundation required for appointment booking operations.

### Story 2.1: Specialist Profile Management

As a **business owner**,
I want **to add and manage specialist profiles within my business**,
so that **I can define my team members who will provide services and manage appointments**.

#### Acceptance Criteria

1. Specialist creation form captures name, email (optional), and specialties assignment
2. Specialist list view displays all business specialists with active/inactive status indicators
3. Specialist profiles are tenant-isolated using business_id with Row Level Security
4. Edit specialist functionality allows updating name, email, and specialty assignments
5. Active/inactive toggle controls specialist availability for booking operations
6. Specialist deletion removes profile but preserves historical appointment references
7. Specialist unique constraints prevent duplicate names within same business
8. Form validation ensures required fields and provides clear error messaging

### Story 2.2: Specialist Working Hours Configuration

As a **business owner**,
I want **to configure individual working hours for each specialist**,
so that **appointment availability reflects each specialist's specific schedule**.

#### Acceptance Criteria

1. Working hours interface allows setting start/end times for each day of the week
2. Time selection enforces 15-minute granularity (09:00, 09:15, 09:30, etc.)
3. Colombian timezone (America/Bogota) applied to all time calculations
4. Working hours validation prevents end time before start time
5. Day-specific availability allows specialists to have different schedules per weekday
6. Bulk copy functionality applies same hours across multiple days
7. Working hours override business default hours when configured
8. Visual calendar preview shows specialist availability based on configured hours

### Story 2.3: Service Catalog Management

As a **business owner**,
I want **to create and manage services offered by my business**,
so that **clients can book specific services with proper pricing and duration**.

#### Acceptance Criteria

1. Service creation form captures name, description, duration, price, and category
2. Duration selection enforces 15-minute increments (15, 30, 45, 60, 75, 90, etc.)
3. Colombian peso pricing uses integer input with COP currency formatting display
4. Service categories include MEDICAL, BEAUTY, WELLNESS, CONSULTING, FITNESS, OTHER
5. Service list displays all business services with active/inactive status
6. Service editing allows updating all fields except historical pricing references
7. Service unique constraints prevent duplicate service names within business
8. Price history tracking maintains audit trail of pricing changes

### Story 2.4: Specialist-Service Assignment System

As a **business owner**,
I want **to assign specialists to services they can perform**,
so that **booking system knows which specialists are qualified for each service**.

#### Acceptance Criteria

1. Service assignment interface shows specialist-service matrix with checkbox selections
2. Specialist profile displays list of services they are qualified to perform
3. Service profile shows all specialists capable of providing the service
4. Assignment changes immediately update booking availability calculations
5. Bulk assignment functionality allows selecting multiple services per specialist
6. Assignment validation prevents booking if no qualified specialists available
7. Assignment removal prompts for confirmation if specialist has future bookings
8. Visual indicators show service coverage (specialists assigned vs. unassigned services)

## Epic 3: Core Booking Engine

**Epic Goal:** Implement the core scheduling system with 15-minute granular time slots, real-time availability calculation, comprehensive conflict prevention using database-level constraints, and Colombian holiday integration to deliver zero double-booking appointment management that forms the competitive foundation of the platform.

### Story 3.1: Real-time Availability Calculation Engine

As a **booking system**,
I want **to calculate real-time appointment availability based on specialist schedules, existing bookings, and business rules**,
so that **only genuinely available time slots are presented for booking**.

#### Acceptance Criteria

1. Availability API endpoint accepts specialist_id, service_id, date, and duration parameters
2. 15-minute time slot generation from 06:00 to 21:45 with configurable business hours
3. Availability calculation considers specialist working hours, existing appointments, and service duration
4. Database function `get_availability_slots()` performs optimized availability queries
5. Response includes available slots with blocked reason indicators (holiday, working_hours, booked, buffer)
6. Real-time updates via Supabase subscriptions refresh availability when appointments change
7. Time slot overlap detection prevents booking conflicts for multi-slot services
8. Performance target: <200ms response time for 7-day availability queries

### Story 3.2: Colombian Holiday Integration System

As a **Colombian business owner**,
I want **the system to automatically prevent bookings on Colombian national holidays**,
so that **appointments are not scheduled when my business should be closed**.

#### Acceptance Criteria

1. Colombian holidays table populated with national holidays for current and next year
2. Holiday integration API fetches holidays from Colombian government sources
3. Availability calculation automatically excludes Colombian national holiday dates
4. Business closure management allows custom closure dates beyond national holidays
5. Holiday calendar displays visual indicators in booking interface
6. Regional holiday support for specific Colombian departments and cities
7. Annual holiday refresh process updates holiday calendar automatically
8. Holiday override functionality allows businesses to operate on holidays if desired

### Story 3.3: Appointment Booking with Conflict Prevention

As a **client or staff member**,
I want **to book appointments with guaranteed conflict prevention**,
so that **double-booking is impossible and appointment scheduling is reliable**.

#### Acceptance Criteria

1. Booking API endpoint validates all booking parameters before database insertion
2. Database-level unique constraint prevents double-booking at (business_id, specialist_id, appointment_date, start_time)
3. Pessimistic locking during booking transaction ensures atomicity
4. Conflict detection returns HTTP 409 with next available slot suggestions
5. Booking validation checks specialist qualifications, working hours, and holiday restrictions
6. End time calculation based on service duration with 15-minute granularity
7. Cancellation policy enforcement prevents bookings within 2-hour window
8. Booking success returns complete appointment object with client and service details

### Story 3.4: Calendar Interface with Conflict Visualization

As a **business owner**,
I want **a visual calendar showing appointments with conflict indicators**,
so that **I can see my schedule at a glance and identify any scheduling issues**.

#### Acceptance Criteria

1. Calendar component displays weekly and daily views with 15-minute time slot granularity
2. Appointments render as blocks showing client name, service, and duration
3. Specialist filtering allows viewing individual or combined specialist schedules
4. Real-time updates show new appointments and cancellations without page refresh
5. Colombian holiday dates display with visual indicators and tooltip descriptions
6. Unavailable time slots show with different styling and blocked reason tooltips
7. Mobile-responsive calendar design optimized for Colombian mobile usage
8. Drag-and-drop rescheduling capability with conflict prevention validation

## Epic 4: Client Management & Appointment Operations

**Epic Goal:** Complete the appointment management workflow by implementing client profile system with Colombian ID integration and full appointment lifecycle management including booking forms, rescheduling, cancellation policies, and status tracking to deliver end-to-end appointment operations that enable Colombian businesses to fully manage their client relationships and appointment workflows.

### Story 4.1: Client Profile Management System

As a **business owner**,
I want **to manage client profiles with Colombian identification requirements**,
so that **I can maintain accurate client records and enable efficient appointment booking**.

#### Acceptance Criteria

1. Client creation captures name, email, Colombian phone (+57 format), and cédula ID number
2. Client search functionality finds clients by name, phone, email, or ID number
3. Client profiles display appointment history across all businesses (where permitted)
4. Colombian ID (cédula) validation ensures proper format and uniqueness
5. Client-business relationship tracking maintains business-specific notes and preferences
6. Client data respects multi-tenant isolation while enabling cross-business booking capability
7. Client merge functionality handles duplicate client records
8. GDPR-compliant client data export and deletion capabilities

### Story 4.2: Comprehensive Booking Form Interface

As a **staff member or business owner**,
I want **an intuitive booking form that guides me through appointment creation**,
so that **I can quickly book appointments with all required information and conflict prevention**.

#### Acceptance Criteria

1. Booking form integrates real-time availability checking with visual slot selection
2. Client selection includes search existing clients or create new client workflow
3. Service selection filters available specialists and updates duration/pricing display
4. Colombian peso pricing displays with proper COP formatting throughout booking process
5. Date/time picker shows only available slots with holiday and closure indicators
6. Form validation provides immediate feedback on booking conflicts and business rule violations
7. Booking confirmation displays complete appointment summary before final submission
8. Success state provides appointment details and next available booking time

### Story 4.3: Appointment Lifecycle Management

As a **business owner**,
I want **complete appointment status management with rescheduling and cancellation**,
so that **I can handle the full lifecycle of appointments according to business policies**.

#### Acceptance Criteria

1. Appointment status tracking supports CONFIRMED, CANCELLED, NO_SHOW, COMPLETED, RESCHEDULED states
2. Rescheduling interface shows availability and prevents conflicts while maintaining client/service
3. Cancellation policy enforcement blocks cancellations within 2 hours of appointment time
4. Appointment completion marking updates status and enables business metrics tracking
5. No-show tracking allows marking clients who missed appointments
6. Cancellation reason capture provides business intelligence for cancellation patterns
7. Appointment history maintains audit trail of all status changes with timestamps
8. Bulk operations allow status updates for multiple appointments simultaneously

### Story 4.4: Appointment Dashboard & Business Intelligence

As a **business owner**,
I want **a comprehensive appointment dashboard with key business metrics**,
so that **I can monitor business performance and make data-driven operational decisions**.

#### Acceptance Criteria

1. Dashboard displays today's appointments with specialist assignments and status indicators
2. Business metrics show total appointments, revenue (Colombian pesos), and specialist utilization
3. Appointment status distribution shows confirmed, completed, cancelled, and no-show percentages
4. Weekly and monthly view options provide business performance trends
5. Specialist performance metrics show individual appointment counts and revenue generation
6. Service popularity analytics identify most/least booked services with revenue impact
7. Cancellation pattern analysis highlights peak cancellation times and reasons
8. Export functionality provides appointment data in CSV format for external analysis