# Technology Stack

This is the **DEFINITIVE** technology selection for the entire project. All development must use these exact versions and tools.

## Core Technology Stack

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------| 
| **Frontend Language** | TypeScript | 5.3+ | Type-safe frontend development | Shared types with backend, prevents integration bugs, Colombian dev familiarity |
| **Frontend Framework** | Next.js | 14+ (App Router) | React-based fullstack framework | SSR for SEO, serverless API routes, Vercel optimization |
| **UI Component Library** | Headless UI | 1.7+ | Unstyled accessible components | Tailwind integration, accessibility compliance, customization flexibility |
| **State Management** | Zustand | 4.4+ | Lightweight state management | Simple API, TypeScript support, no boilerplate compared to Redux |
| **Backend Language** | Node.js | 20+ LTS | Server-side JavaScript runtime | Shared language with frontend, excellent Colombian dev ecosystem |
| **Backend Framework** | Next.js API Routes | 14+ | Serverless API functions | Integrated with frontend, automatic deployment, no separate backend needed |
| **API Style** | REST | - | HTTP-based API design | Simple integration for external bookings, familiar to Colombian developers |

## Database & Infrastructure

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------| 
| **Database** | PostgreSQL | 15+ | Relational database via Supabase | ACID transactions for booking conflicts, RLS for multi-tenancy |
| **Cache** | Supabase Edge Cache | - | Database query caching | Built-in performance optimization, no additional setup |
| **File Storage** | Supabase Storage | - | Business logos and attachments | Integrated authentication, CDN delivery |
| **Authentication** | Supabase Auth | 2.0+ | User authentication system | Email/password + social logins, JWT tokens, RLS integration |

## Development & Testing

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------| 
| **Frontend Testing** | Jest + React Testing Library | 29+ / 14+ | Component and unit testing | Industry standard, excellent TypeScript support |
| **Backend Testing** | Jest + Supertest | 29+ / 6+ | API endpoint testing | Same framework as frontend, HTTP testing capabilities |
| **E2E Testing** | Playwright | 1.40+ | End-to-end testing | Modern E2E testing, Colombian browser compatibility |
| **Build Tool** | Next.js | 14+ | Integrated build system | Zero configuration, optimized for Vercel deployment |
| **Bundler** | Turbopack (Next.js) | - | Fast bundler for Next.js | Built-in with Next.js, faster than Webpack |

## DevOps & Monitoring

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------| 
| **IaC Tool** | Vercel Dashboard + Supabase Console | - | Infrastructure management | GUI-based setup reduces DevOps complexity |
| **CI/CD** | GitHub Actions + Vercel | - | Continuous deployment | Automatic deployment on push, preview environments |
| **Monitoring** | Vercel Analytics + Sentry | - | Performance and error tracking | Real user metrics, Colombian user insights |
| **Logging** | Supabase Logs + Vercel Functions Logs | - | Application logging | Centralized logging across platform |

## Frontend Styling & Components

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------| 
| **CSS Framework** | Tailwind CSS | 3.4+ | Utility-first CSS framework | Rapid UI development, excellent Next.js integration |

## Colombian Market Specific Technologies

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------| 
| **WhatsApp Integration** | WhatsApp Business API | Cloud API | Business communication | Primary communication channel for Colombian businesses |
| **Holiday Calendar** | Custom Integration | - | Colombian national holidays | Government holiday API integration for booking prevention |
| **Currency Formatting** | Intl.NumberFormat | Native | Peso currency display | Native browser support, proper Colombian peso formatting |
| **Calendar Components** | React Big Calendar | 1.8+ | Appointment calendar UI | Customizable for 15-minute slots, timezone support |
| **Form Validation** | Zod | 3.22+ | Schema validation | TypeScript-first validation, shared between frontend/backend |
| **Date/Time Handling** | date-fns | 2.30+ | Date manipulation | Lightweight, tree-shakeable, timezone support |

## Key Technology Rationale

### Why TypeScript Everywhere?

1. **Shared interfaces** between frontend and backend prevent integration bugs
2. **Colombian businesses have complex data** (services, specialists, schedules) - types prevent errors  
3. **Better developer experience** for small team maintenance
4. **Compile-time error detection** reduces runtime bugs in production

### Why Next.js Full-Stack?

1. **Single framework** reduces complexity for 2-3 developer team
2. **API routes eliminate** need for separate backend deployment
3. **Built-in optimizations** for Colombian market (image optimization, SEO)
4. **Vercel platform optimization** with edge network benefits
5. **App Router** provides modern React patterns with server components

### Why Supabase Over Self-Hosted?

1. **Row Level Security** provides database-level multi-tenancy out of the box
2. **Real-time subscriptions** prevent booking conflicts automatically
3. **Managed infrastructure** reduces DevOps overhead for small team
4. **São Paulo region** provides <100ms latency to Colombian users
5. **ACID transactions** guarantee zero double-booking at database level

### Why React Big Calendar?

1. **Proven solution** for appointment scheduling UIs in production
2. **Handles 15-minute granularity** requirements without custom development
3. **Customizable** for Colombian business workflows and terminology
4. **Mobile-responsive** for Colombian mobile-first usage patterns
5. **TypeScript support** integrates with our type-safe architecture

## Version Management

### Node.js Version Requirements
- **Development**: Node.js 20+ LTS
- **Production**: Node.js 20+ LTS (Vercel runtime)
- **Package Manager**: npm (built-in workspaces support)

### Key Dependencies Lock Strategy
```json
{
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=9.0.0"
  },
  "volta": {
    "node": "20.10.0",
    "npm": "10.2.3"
  }
}
```

### Dependency Update Strategy
1. **Major versions**: Manual review and testing required
2. **Minor versions**: Auto-update via Dependabot (with tests)
3. **Security patches**: Immediate update and deployment
4. **Colombian-specific libraries**: Manual testing with Colombian data

## Colombian Market Optimizations

### Phone Number Handling
```typescript
// Colombian phone format validation
const COLOMBIAN_PHONE_REGEX = /^\+57 \d{3} \d{3} \d{4}$/
```

### Currency Formatting
```typescript
// Colombian peso formatting (no decimals)
const formatPesoCOP = (amount: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount)
```

### Timezone Handling
```typescript
// Colombian timezone (no daylight saving)
const COLOMBIA_TIMEZONE = 'America/Bogota'
```

## Performance Requirements

### Colombian Network Optimization
- **API Timeout**: 10 seconds (Colombian network conditions)
- **Retry Attempts**: 3 with exponential backoff
- **Cache Duration**: 5 minutes for availability data
- **Image Optimization**: WebP format with fallbacks

### Database Performance
- **Connection Pooling**: Supabase managed (automatic)
- **Query Timeout**: 5 seconds for booking operations
- **Index Strategy**: Covering indexes for availability queries
- **Real-time Subscriptions**: Business-scoped to reduce bandwidth

## Security Requirements

### Authentication & Authorization
- **JWT Token Expiry**: 1 hour (automatic refresh)
- **Password Requirements**: Colombian business standards
- **MFA Support**: SMS via Colombian providers (future enhancement)
- **Session Management**: Supabase managed with RLS

### Data Protection
- **Row Level Security**: Every table with business_id isolation
- **API Rate Limiting**: 100 req/min per business, 20 req/min for bookings
- **Input Validation**: Zod schemas on both client and server
- **SQL Injection Prevention**: Supabase client parameterized queries

---

*This technology stack is optimized for the Colombian market while maintaining development velocity for a small team. Any deviations require architectural review.*