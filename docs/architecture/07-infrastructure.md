# Infrastructure Architecture

Based on PRD **Epic 1: Foundation & Business Registration**, this document defines the specific infrastructure requirements for MVP launch, including development environment setup, CI/CD pipeline, and Colombian market optimizations.

## Development Environment Setup

### Prerequisites and Tooling

**Required Software:**
```
Node.js: 20+ LTS
Package Manager: npm (workspaces)
IDE: VS Code with TypeScript/Tailwind extensions
Database: PostgreSQL 15+ (via Supabase)
Authentication: Supabase Auth
Deployment: Vercel CLI
```

**Project Structure for Epic 1:**
```
appointments-demo/
├── apps/
│   └── web/                    # Next.js 14+ application
│       ├── src/
│       │   ├── app/           # App Router structure
│       │   │   ├── (auth)/    # Authentication routes
│       │   │   ├── (business)/ # Business dashboard
│       │   │   └── api/       # API routes
│       │   ├── components/    # Shared components
│       │   ├── lib/          # Utilities
│       │   └── types/        # TypeScript definitions
│       ├── public/           # Static assets
│       └── package.json
├── packages/
│   ├── types/                # Shared TypeScript types
│   ├── utils/               # Colombian utilities
│   └── ui/                  # Shared UI components
├── supabase/
│   ├── migrations/          # Database schema
│   └── seed.sql            # Initial data
└── package.json            # Workspace root
```

### Development Setup Commands

```bash
# 1. Clone and setup workspace
git clone <repository-url>
cd appointments-demo
npm install

# 2. Setup Supabase
npx supabase init
npx supabase start
npx supabase db reset

# 3. Environment configuration
cp .env.example .env.local
# Configure environment variables (see below)

# 4. Start development
npm run dev

# 5. Database migrations
npm run db:generate
npm run db:push
```

### Environment Configuration

```typescript
// .env.local - Development environment variables
interface EnvironmentConfig {
  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
  SUPABASE_SERVICE_ROLE_KEY=eyJ...
  
  // Colombian Market Configuration
  COLOMBIA_TIMEZONE=America/Bogota
  COLOMBIA_CURRENCY=COP
  COLOMBIA_PHONE_PREFIX=+57
  
  // Infrastructure
  VERCEL_URL=http://localhost:3000
  DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
  
  // Development
  NODE_ENV=development
  
  // Colombian Holiday API (Epic 3 integration)
  COLOMBIA_HOLIDAY_API_URL=https://date.nager.at/api/v3/publicholidays
  COLOMBIA_HOLIDAY_API_KEY=optional_api_key
}
```

## CI/CD Pipeline Architecture

### GitHub Actions Workflow

**Main Deployment Pipeline (Epic 1.1 Requirement):**

```yaml
# .github/workflows/main.yml
name: Deploy to Vercel
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run TypeScript check
        run: npm run type-check
      
      - name: Run tests
        run: npm run test
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
      
      - name: Run Colombian utilities tests
        run: npm run test:colombian
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### Environment-Specific Deployments

**Development Environment:**
```yaml
# Triggered on: feature branches
# Deploy target: Vercel preview deployment
# Database: Supabase development instance
# Colombian data: Test holiday calendar
```

**Staging Environment:**
```yaml
# Triggered on: develop branch
# Deploy target: staging.appointments-demo.com
# Database: Supabase staging instance  
# Colombian data: Current year holidays
```

**Production Environment:**
```yaml
# Triggered on: main branch
# Deploy target: appointments-demo.com
# Database: Supabase production instance
# Colombian data: Live holiday API integration
```

## Colombian Utilities Architecture

### Core Colombian Market Functions (Epic 1.1 Requirement)

```typescript
// packages/utils/src/colombian/index.ts

// Phone number formatting and validation
export const formatColombianPhone = (phone: string): string => {
  // Formats to +57 XXX XXX XXXX
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10 && digits.startsWith('3')) {
    return `+57 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }
  return phone
}

export const validateColombianPhone = (phone: string): boolean => {
  const regex = /^\+57 \d{3} \d{3} \d{4}$/
  return regex.test(phone)
}

// Colombian peso formatting
export const formatPesoCOP = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount)
}

// Colombian departments for address validation
export const COLOMBIAN_DEPARTMENTS = [
  'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar',
  'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca',
  'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía',
  'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta',
  'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío',
  'Risaralda', 'San Andrés y Providencia', 'Santander',
  'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'
] as const

export type ColombianDepartment = typeof COLOMBIAN_DEPARTMENTS[number]

// Colombian ID (cédula) validation
export const validateColombianID = (idNumber: string): boolean => {
  // Basic validation for Colombian cédula format
  const regex = /^\d{7,10}$/
  return regex.test(idNumber.replace(/\D/g, ''))
}

// Colombian holiday integration (stub for Epic 3)
export const isColombianHoliday = async (date: Date): Promise<boolean> => {
  try {
    // Implementation for Colombian government holiday API
    const response = await fetch(
      `${process.env.COLOMBIA_HOLIDAY_API_URL}/${date.getFullYear()}/CO`
    )
    const holidays = await response.json()
    const dateString = date.toISOString().split('T')[0]
    return holidays.some((holiday: any) => holiday.date === dateString)
  } catch (error) {
    console.error('Holiday API error:', error)
    return false // Fallback: assume no holiday
  }
}

// Colombian business hours utilities
export const COLOMBIA_BUSINESS_HOURS = {
  defaultStart: '08:00',
  defaultEnd: '18:00',
  lunchStart: '12:00',
  lunchEnd: '14:00',
  timezone: 'America/Bogota'
} as const

// Colombian address utilities
export const formatColombianAddress = (address: {
  street: string
  city: string
  department: ColombianDepartment
  postal_code?: string
}): string => {
  const parts = [address.street, address.city, address.department]
  if (address.postal_code) {
    parts.push(address.postal_code)
  }
  return parts.join(', ')
}
```

### Colombian Data Seeding

```sql
-- supabase/seed.sql
-- Colombian holidays for 2025 (Epic 1.1 requirement)
INSERT INTO colombian_holidays (date, name, type, is_national) VALUES
    ('2025-01-01', 'Año Nuevo', 'NATIONAL', true),
    ('2025-01-06', 'Día de los Reyes Magos', 'RELIGIOUS', true),
    ('2025-03-24', 'Día de San José', 'RELIGIOUS', true),
    ('2025-04-13', 'Domingo de Ramos', 'RELIGIOUS', true),
    ('2025-04-17', 'Jueves Santo', 'RELIGIOUS', true),
    ('2025-04-18', 'Viernes Santo', 'RELIGIOUS', true),
    ('2025-05-01', 'Día del Trabajo', 'NATIONAL', true),
    ('2025-05-26', 'Ascensión del Señor', 'RELIGIOUS', true),
    ('2025-06-16', 'Corpus Christi', 'RELIGIOUS', true),
    ('2025-06-23', 'Sagrado Corazón de Jesús', 'RELIGIOUS', true),
    ('2025-06-30', 'San Pedro y San Pablo', 'RELIGIOUS', true),
    ('2025-07-20', 'Día de la Independencia', 'NATIONAL', true),
    ('2025-08-07', 'Batalla de Boyacá', 'NATIONAL', true),
    ('2025-08-18', 'Asunción de la Virgen', 'RELIGIOUS', true),
    ('2025-10-13', 'Día de la Raza', 'NATIONAL', true),
    ('2025-11-03', 'Todos los Santos', 'RELIGIOUS', true),
    ('2025-11-17', 'Independencia de Cartagena', 'NATIONAL', true),
    ('2025-12-08', 'Inmaculada Concepción', 'RELIGIOUS', true),
    ('2025-12-25', 'Navidad', 'RELIGIOUS', true);
```

## Health Check API Implementation

### Health Check Endpoint (Epic 1.1 Acceptance Criteria 8)

```typescript
// apps/web/src/app/api/health/route.ts
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabaseHealth(),
      supabase: await checkSupabaseHealth(),
      colombian_holidays: await checkColombianHolidayAPI(),
    },
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    colombian_config: {
      timezone: process.env.COLOMBIA_TIMEZONE,
      currency: process.env.COLOMBIA_CURRENCY,
      phone_prefix: process.env.COLOMBIA_PHONE_PREFIX,
    }
  }

  const overallStatus = Object.values(health.services).every(
    service => service === 'healthy'
  ) ? 200 : 503

  return Response.json(health, { status: overallStatus })
}

async function checkDatabaseHealth(): Promise<'healthy' | 'unhealthy'> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('count')
      .limit(1)
    
    return error ? 'unhealthy' : 'healthy'
  } catch {
    return 'unhealthy'
  }
}

async function checkSupabaseHealth(): Promise<'healthy' | 'unhealthy'> {
  try {
    const { error } = await supabase.auth.getSession()
    return error ? 'unhealthy' : 'healthy'
  } catch {
    return 'unhealthy'
  }
}

async function checkColombianHolidayAPI(): Promise<'healthy' | 'unhealthy'> {
  try {
    const currentYear = new Date().getFullYear()
    const response = await fetch(
      `${process.env.COLOMBIA_HOLIDAY_API_URL}/${currentYear}/CO`,
      { method: 'HEAD', timeout: 5000 }
    )
    return response.ok ? 'healthy' : 'unhealthy'
  } catch {
    return 'unhealthy'
  }
}
```

## Database Migration Strategy

### Supabase Migration Management

```sql
-- supabase/migrations/20250101000000_initial_schema.sql
-- Create initial tables with RLS policies
-- (See database-schema.md for full schema)

-- supabase/migrations/20250101000001_colombian_data.sql
-- Seed Colombian holidays and departments
-- (See seed data above)

-- supabase/migrations/20250101000002_rls_policies.sql
-- Row Level Security policies for multi-tenancy
-- (See database-schema.md for RLS policies)
```

### Migration Commands

```bash
# Generate new migration
npm run db:migration:new "description"

# Apply migrations
npm run db:migration:up

# Rollback migration
npm run db:migration:down

# Reset database (development only)
npm run db:reset
```

## Performance Monitoring for Colombian Infrastructure

### Colombian Network Optimization

```typescript
// lib/colombian-performance.ts
export const COLOMBIAN_PERFORMANCE_CONFIG = {
  // Network timeouts optimized for Colombian conditions
  API_TIMEOUT_MS: 10000, // 10s for Colombian network conditions
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  
  // Caching strategy for Colombian data
  CACHE_DURATION_MS: 300000, // 5 minutes for availability data
  HOLIDAY_CACHE_DURATION_MS: 86400000, // 24 hours for holidays
  
  // Database connection pooling
  DB_POOL_SIZE: 20,
  DB_IDLE_TIMEOUT_MS: 30000,
  
  // Colombian-specific monitoring
  SUPABASE_REGION: 'sa-east-1', // São Paulo for Colombian latency
  CDN_REGIONS: ['sa-east-1', 'us-east-1'], // Fallback regions
} as const

// Performance monitoring for Colombian users
export interface ColombianPerformanceMetrics {
  latencyToSaoPaulo: number
  averageResponseTime: number
  colombianHolidayApiStatus: 'healthy' | 'degraded' | 'offline'
  pesoFormattingErrors: number
  phoneValidationErrors: number
  appointmentBookingLatency: number
}

export const trackColombianMetrics = async (): Promise<ColombianPerformanceMetrics> => {
  // Implementation for Colombian-specific performance tracking
  return {
    latencyToSaoPaulo: await measureLatencyToSaoPaulo(),
    averageResponseTime: await getAverageResponseTime(),
    colombianHolidayApiStatus: await checkHolidayApiStatus(),
    pesoFormattingErrors: await getPesoFormattingErrorCount(),
    phoneValidationErrors: await getPhoneValidationErrorCount(),
    appointmentBookingLatency: await getAppointmentBookingLatency(),
  }
}
```

### Monitoring and Alerting

```typescript
// Vercel Analytics integration
export const initializeVercelAnalytics = () => {
  if (process.env.NODE_ENV === 'production') {
    // Track Colombian-specific events
    analytics.track('business_registration', {
      country: 'CO',
      department: businessData.address.department,
    })
    
    analytics.track('appointment_booking', {
      duration_minutes: service.duration_minutes,
      price_cop: service.price_cop,
      specialist_id: appointment.specialist_id,
    })
  }
}

// Sentry error tracking with Colombian context
export const initializeSentry = () => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    beforeSend: (event) => {
      // Add Colombian context to errors
      if (event.user) {
        event.tags = {
          ...event.tags,
          country: 'CO',
          timezone: 'America/Bogota',
        }
      }
      return event
    }
  })
}
```

## Deployment Architecture

### Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["gru1", "iad1"],
  "env": {
    "COLOMBIA_TIMEZONE": "America/Bogota",
    "COLOMBIA_CURRENCY": "COP",
    "COLOMBIA_PHONE_PREFIX": "+57"
  },
  "functions": {
    "apps/web/src/app/api/**": {
      "maxDuration": 30
    }
  },
  "redirects": [
    {
      "source": "/docs/architecture.md",
      "destination": "/docs/architecture/README.md",
      "permanent": true
    }
  ]
}
```

### Supabase Configuration

```toml
# supabase/config.toml
[api]
port = 54321
schemas = ["public", "auth"]
extra_search_path = ["public"]
max_rows = 1000

[db]
port = 54322
major_version = 15

[studio]
port = 54323

[functions]
verify_jwt = true

[auth]
enabled = true
external_providers = ["google", "facebook"]
site_url = "http://localhost:3000"
additional_redirect_urls = ["https://appointments-demo.com"]

[edge_functions]
verify_jwt = true

[analytics]
enabled = true
```

## Security Configuration

### Environment Security

```bash
# Production secrets (stored in Vercel/GitHub)
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
COLOMBIA_HOLIDAY_API_KEY=<holiday_api_key>
SENTRY_DSN=<sentry_dsn>
```

### Security Headers

```typescript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=()' },
        ],
      },
    ]
  },
}
```

## Infrastructure Validation Summary

### ✅ Epic 1 Requirements Coverage

1. **Epic 1.1**: Complete project foundation with Colombian utilities
2. **Epic 1.2**: Business registration with Colombian address validation  
3. **Epic 1.3**: Authentication integration with Supabase Auth
4. **Epic 1.4**: Business profile management with peso pricing
5. **Health Check API**: Comprehensive system health monitoring

### 🔧 Implementation Readiness

- **Development Environment**: Complete setup instructions with Colombian data
- **CI/CD Pipeline**: GitHub Actions with Colombian-specific testing
- **Database Migrations**: Supabase migration strategy with RLS policies
- **Performance Monitoring**: Colombian network optimization and metrics
- **Security Configuration**: Multi-tenant security with Colombian context

### 📋 Next Steps

1. **Clone Repository**: Follow development setup commands
2. **Configure Environment**: Set up Supabase and Colombian API keys
3. **Run Migrations**: Initialize database with Colombian data
4. **Start Development**: Begin Epic 1.1 implementation
5. **Deploy Health Check**: Test API endpoint functionality

---

*Infrastructure architecture ready for Epic 1 implementation with complete Colombian market optimization and multi-tenant security.*