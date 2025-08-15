# Colombian Appointment Management System Architecture

This directory contains the complete architecture documentation for the Colombian Appointment Management System, split into focused domain-specific documents for better maintainability and navigation.

## Architecture Documents

### Core Architecture
- **[System Overview](./01-system-overview.md)** - High-level architecture, platform choices, and architectural patterns
- **[Technology Stack](./02-tech-stack.md)** - Complete technology selection with rationale and versions

### Data & API Architecture  
- **[Data Models](./03-data-models.md)** - TypeScript interfaces and business entity definitions
- **[Database Schema](./04-database-schema.md)** - PostgreSQL schema with multi-tenant RLS policies
- **[API Specification](./05-api-specification.md)** - REST API endpoints with Colombian market integration

### Application Architecture
- **[Frontend Architecture](./06-frontend-architecture.md)** - React/Next.js component patterns and state management
- **[Infrastructure Setup](./07-infrastructure.md)** - Epic 1 implementation details and deployment configuration

### Colombian Market Specialization
- **[Colombian Integration](./08-colombian-integration.md)** - Holiday calendar, peso pricing, phone validation, and market-specific features

### Operations & Troubleshooting
- **[Known Issues](./09-known-issues.md)** - Critical issues, solutions, and prevention strategies

## Quick Navigation

- **Getting Started**: Start with [System Overview](./01-system-overview.md)
- **Development Setup**: See [Infrastructure Setup](./07-infrastructure.md)
- **API Integration**: Check [API Specification](./05-api-specification.md)
- **Database Design**: Review [Database Schema](./04-database-schema.md)

## Architecture Principles

1. **Colombian-First Design**: Built specifically for Colombian market requirements
2. **Multi-Tenant Architecture**: Complete business isolation with zero cross-tenant visibility  
3. **Zero Double-Booking**: Database-level conflict prevention with real-time updates
4. **Progressive Enhancement**: Simple MVP that scales to sophisticated business operations hub
5. **Pragmatic Technology**: Proven, boring technologies over cutting-edge solutions

## Status

**Architecture Status: ✅ MODERNIZED - Ready for Epic 1 Implementation**

- ✅ All PRD functional requirements (FR1-FR10) covered
- ✅ Non-functional requirements (NFR1-NFR8) addressed  
- ✅ Epic 1 infrastructure foundation complete
- ✅ Colombian market specialization patterns defined
- ✅ Multi-tenancy and conflict prevention implemented
- **✅ Environment configuration modernized** - Zod validation with Next.js best practices
- **✅ Known issues resolved** - Critical environment variable loading fixed

## Recent Updates (2025-08-15)

### 🔧 Environment Configuration Modernization
- **Removed explicit `env` section** from Next.js config
- **Implemented Zod-based validation** for type-safe environment configuration
- **Added Colombian defaults** with automatic fallbacks
- **Enhanced security** with proper client/server variable separation
- **Improved developer experience** with clear error messages

**Impact:** Resolves critical environment variable loading issues and establishes modern configuration patterns.

---

*Last Updated: 2025-08-15*  
*Version: 1.2 - Environment Modernization*  
*Architecture: Enhanced with Zod validation patterns*