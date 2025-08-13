# Vercel Deployment Setup Guide

This guide walks you through setting up automatic deployment to Vercel for the Colombian Appointment Management System.

## 🚀 Initial Setup

### 1. Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

### 2. Connect GitHub Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository: `juda1804/appointments-demo`
4. Configure project settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: Leave empty (monorepo detected automatically)
   - **Build Command**: `npm run build`
   - **Output Directory**: `apps/web/.next`
   - **Install Command**: `npm ci`

### 3. Environment Variables Configuration

Add these environment variables in Vercel Dashboard → Settings → Environment Variables:

#### Production Environment
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
COLOMBIA_TIMEZONE=America/Bogota
COLOMBIA_CURRENCY=COP
COLOMBIA_PHONE_PREFIX=+57
```

#### Development/Preview Environment
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
COLOMBIA_TIMEZONE=America/Bogota
COLOMBIA_CURRENCY=COP
COLOMBIA_PHONE_PREFIX=+57
```

### 4. Regional Configuration

The project is configured for optimal Colombian performance:
- **Primary Region**: `gru1` (São Paulo, Brazil - closest to Colombia)
- **Edge Network**: Global CDN for Colombian users

## 🔧 GitHub Actions Integration

### Required GitHub Secrets

Add these secrets in GitHub Repository → Settings → Secrets:

```bash
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
PRODUCTION_URL=your_production_domain
```

### Getting Vercel Credentials

1. **Vercel Token**:
   - Go to Vercel Dashboard → Settings → Tokens
   - Create new token with appropriate scope

2. **Organization ID**:
   ```bash
   vercel org ls
   ```

3. **Project ID**:
   ```bash
   vercel project ls
   ```

## 📈 Deployment Workflow

### Automatic Deployments

- **Preview Deployments**: Triggered on pull requests
- **Production Deployments**: Triggered on pushes to `main` branch
- **Health Checks**: Automatic validation post-deployment

### Manual Deployment

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## 🏥 Health Check Integration

The deployment includes automatic health monitoring:

- **Endpoint**: `/api/health`
- **Post-deployment**: Automatic health verification
- **Monitoring**: Database connectivity and service status

### Health Check Response
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

## 🔍 Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check TypeScript errors: `npm run typecheck`
   - Verify dependencies: `npm audit`
   - Check build logs in Vercel dashboard

2. **Environment Variables**:
   - Ensure all required variables are set
   - Check variable names match exactly
   - Verify Supabase credentials are correct

3. **Monorepo Issues**:
   - Confirm `vercel.json` configuration
   - Check workspace dependencies are installed
   - Verify build command paths

### Build Optimization

The project includes several optimizations for Colombian users:

- **Regional deployment** in São Paulo (closest AWS region)
- **Colombian timezone** handling in server functions
- **Peso currency** formatting
- **Colombian phone** number validation

## 📊 Performance Monitoring

### Vercel Analytics

Enable Vercel Analytics for Colombian market insights:

1. Go to Project → Analytics
2. Enable Web Analytics
3. Monitor Colombian user performance

### Core Web Vitals

The application is optimized for Colombian mobile networks:
- **LCP**: < 2.5s (optimized for slower connections)
- **FID**: < 100ms (touch-optimized interface)
- **CLS**: < 0.1 (stable layouts)

## 🚀 Domain Configuration

### Custom Domain Setup

1. Go to Vercel Project → Settings → Domains
2. Add your custom domain
3. Configure DNS:
   ```
   Type: CNAME
   Name: www (or @)
   Value: cname.vercel-dns.com
   ```

### SSL/TLS Configuration

Vercel automatically provides SSL certificates:
- **Certificate**: Automatic Let's Encrypt
- **HTTPS**: Force HTTPS redirect enabled
- **HSTS**: Enabled for security

## 🔐 Security Configuration

### Headers Configuration

The deployment includes security headers:
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
]
```

### CORS Configuration

Configured for Supabase and Colombian domains:
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
    ? 'your-domain.com' 
    : '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}
```

---

## 🎯 Deployment Checklist

Before going live:

- [ ] Environment variables configured
- [ ] Supabase database migrations applied
- [ ] Health check endpoint responding
- [ ] Colombian utilities tested
- [ ] Custom domain configured (if applicable)
- [ ] Analytics enabled
- [ ] Security headers validated
- [ ] Performance optimized for Colombian networks

## 📞 Support

For deployment issues:
1. Check Vercel build logs
2. Verify GitHub Actions workflow
3. Test health check endpoint
4. Review Colombian utility functions

---

**Deployment URL**: Will be provided after initial setup
**Region**: São Paulo (GRU1) - Optimized for Colombian users