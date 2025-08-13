# Colombian Appointment Management System

A comprehensive fullstack solution for appointment booking tailored to the Colombian market. Built with Next.js, Supabase, and TypeScript in a modern monorepo architecture.

## 🚀 Features

- **Colombian Market Focus**: Phone formatting (+57), peso currency (COP), Colombian departments, and holiday calendar
- **Multi-tenant Architecture**: Row Level Security for complete business isolation
- **Modern Tech Stack**: Next.js 14+, TypeScript, Supabase, Tailwind CSS
- **Comprehensive Testing**: Jest with React Testing Library across all packages
- **CI/CD Pipeline**: Automated testing, linting, and deployment via GitHub Actions
- **Monorepo Structure**: Organized packages for types, utilities, and UI components

## 🏗️ Architecture

```
appointments-demo/
├── apps/
│   └── web/                    # Next.js 14+ application
├── packages/
│   ├── types/                  # Shared TypeScript types
│   ├── utils/                  # Colombian utilities
│   └── ui/                     # Shared UI components
└── supabase/                   # Database migrations
```

## 🛠️ Quick Start

### Prerequisites

- Node.js 22+ LTS
- npm 10+
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/juda1804/appointments-demo.git
   cd appointments-demo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   ```bash
   # Follow the setup guide
   cat SUPABASE_SETUP.md
   
   # Copy environment template
   cp .env.local.example apps/web/.env.local
   # Edit with your Supabase credentials
   ```

4. **Run database migrations**
   ```bash
   # Follow the database setup guide
   cat DATABASE_SETUP.md
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🧪 Testing

Run all tests across packages:
```bash
npm test
```

Test specific packages:
```bash
npm test --workspace=packages/utils
npm test --workspace=packages/ui
npm test --workspace=web
```

Run with coverage:
```bash
npm run test:coverage
```

## 🔧 Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm test` | Run all tests |
| `npm run audit` | Run security audit |

## 🏭 Colombian Utilities

The project includes comprehensive Colombian market utilities:

### Phone Formatting
```typescript
import { formatColombianPhone, validateColombianPhone } from '@appointments-demo/utils/colombian';

formatColombianPhone('3001234567');     // "+57 300 123 4567"
validateColombianPhone('+57 300 123 4567'); // true
```

### Currency Formatting
```typescript
import { formatPesoCOP } from '@appointments-demo/utils/colombian';

formatPesoCOP(50000);  // "$50.000 COP"
```

### Geographic Data
```typescript
import { COLOMBIAN_DEPARTMENTS, validateDepartment } from '@appointments-demo/utils/colombian';

validateDepartment('Bogotá D.C.');  // true
```

### Holiday Calendar
```typescript
import { isColombianHoliday, getNextBusinessDay } from '@appointments-demo/utils/colombian';

isColombianHoliday(new Date('2024-12-25'));  // true
```

## 🚀 CI/CD Pipeline

The project uses GitHub Actions for automated CI/CD:

### Automated Testing
- ✅ Unit tests across all packages
- ✅ TypeScript type checking
- ✅ ESLint code quality
- ✅ Security audit

### Deployment Pipeline
- 🔄 Preview deployments on pull requests
- 🚀 Production deployment on main branch
- 🏥 Health checks post-deployment

### Required Secrets

For deployment, configure these GitHub secrets:

```bash
VERCEL_TOKEN          # Vercel deployment token
VERCEL_ORG_ID        # Vercel organization ID
VERCEL_PROJECT_ID    # Vercel project ID
PRODUCTION_URL       # Production URL for health checks
```

## 📊 Health Check

Monitor application health at `/api/health`:

```json
{
  "status": "healthy",
  "timestamp": "2024-08-13T10:30:00.000Z",
  "services": {
    "database": "healthy",
    "supabase": "healthy"
  },
  "version": "0.1.0",
  "environment": "production"
}
```

## 🔐 Environment Configuration

Required environment variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Colombian Configuration
COLOMBIA_TIMEZONE=America/Bogota
COLOMBIA_CURRENCY=COP
COLOMBIA_PHONE_PREFIX=+57
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a pull request

## 📚 Documentation

- [Architecture Documentation](docs/architecture.md)
- [Database Setup Guide](DATABASE_SETUP.md)
- [Supabase Setup Guide](SUPABASE_SETUP.md)
- [Colombian Market Features](docs/architecture/08-colombian-integration.md)

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## 🚀 Deployment

The application is automatically deployed to Vercel on every push to the main branch. 

**Production URL**: [To be configured]

---

Built with ❤️ for the Colombian market