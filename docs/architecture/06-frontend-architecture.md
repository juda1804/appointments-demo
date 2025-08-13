# Frontend Architecture

This document defines the frontend-specific architecture for the Colombian Appointment Management System using Next.js, React, TypeScript, and Tailwind CSS. The architecture emphasizes Colombian business workflows, real-time appointment management, and mobile-responsive design patterns.

## Architecture Overview

**Framework:** Next.js 14+ with App Router  
**Component Strategy:** Compound component patterns with Colombian business context  
**State Management:** Zustand with real-time synchronization via Supabase  
**Styling:** Tailwind CSS with Colombian design system tokens  
**Mobile Strategy:** Progressive Web App (PWA) with offline calendar viewing  

## Component Architecture

### Component Organization

The frontend follows a feature-based organization with shared components and Colombian-specific business logic:

```
apps/web/src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication routes
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   ├── (business)/               # Main business application
│   │   ├── dashboard/
│   │   ├── appointments/
│   │   ├── calendar/
│   │   ├── specialists/
│   │   ├── services/
│   │   ├── clients/
│   │   ├── settings/
│   │   └── layout.tsx           # Business dashboard layout
│   ├── api/                     # Next.js API routes
│   └── page.tsx                 # Landing/marketing page
├── components/                   # Shared components
│   ├── ui/                      # Base UI components
│   ├── business/                # Business-specific components
│   ├── colombian/               # Colombian market components
│   ├── forms/                   # Form components
│   └── layouts/                 # Layout components
├── hooks/                       # Custom React hooks
├── stores/                      # Zustand state stores
├── services/                    # API service layer
├── utils/                       # Utility functions
└── types/                       # TypeScript type definitions
```

### Component Design Patterns

#### Business-Specific Component Example

```typescript
// components/business/appointment-card.tsx
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPesoCOP, formatColombianPhone } from '@/utils/colombian-utils'
import { Appointment, Client, Service, Specialist } from '@/types/business'

interface AppointmentCardProps {
  appointment: Appointment & {
    client: Pick<Client, 'name' | 'phone'>
    specialist: Pick<Specialist, 'name'>
    service: Pick<Service, 'name' | 'price_cop' | 'duration_minutes'>
  }
  onReschedule?: (appointmentId: string) => void
  onCancel?: (appointmentId: string) => void
  onComplete?: (appointmentId: string) => void
}

export function AppointmentCard({ 
  appointment, 
  onReschedule, 
  onCancel, 
  onComplete 
}: AppointmentCardProps) {
  const { client, specialist, service } = appointment
  
  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">
              {service.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {specialist.name} • {service.duration_minutes}min
            </p>
          </div>
          <Badge variant={getStatusVariant(appointment.status)}>
            {getStatusLabel(appointment.status)}
          </Badge>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Cliente:</span>
            <span className="font-medium">{client.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Teléfono:</span>
            <span className="font-medium">
              {formatColombianPhone(client.phone)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Precio:</span>
            <span className="font-semibold text-green-600">
              {formatPesoCOP(service.price_cop)}
            </span>
          </div>
        </div>
        
        {appointment.status === 'CONFIRMED' && (
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => onComplete?.(appointment.id)}
              className="btn-primary text-xs"
            >
              Completar
            </button>
            <button
              onClick={() => onReschedule?.(appointment.id)}
              className="btn-secondary text-xs"
            >
              Reprogramar
            </button>
            <button
              onClick={() => onCancel?.(appointment.id)}
              className="btn-danger text-xs"
            >
              Cancelar
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

#### Colombian-Specific Input Components

```typescript
// components/colombian/phone-input.tsx
import { Input } from '@/components/ui/input'
import { formatColombianPhone, validateColombianPhone } from '@/utils/colombian-utils'

interface ColombianPhoneInputProps {
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
}

export function ColombianPhoneInput({ 
  value, 
  onChange, 
  error, 
  placeholder = "Ej: +57 300 123 4567" 
}: ColombianPhoneInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value.replace(/[^\d]/g, '') // Only numbers
    
    // Auto-format as user types
    if (inputValue.length >= 10) {
      const formatted = `+57 ${inputValue.slice(-10, -7)} ${inputValue.slice(-7, -4)} ${inputValue.slice(-4)}`
      onChange(formatted)
    } else {
      onChange(inputValue)
    }
  }
  
  return (
    <div>
      <Input
        type="tel"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={error ? 'border-red-500' : ''}
      />
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  )
}
```

## State Management Architecture

### Business Store (Multi-tenant Context)

```typescript
// stores/business-store.ts
import { create } from 'zustand'
import { Business, BusinessSettings } from '@/types/business'

interface BusinessState {
  // State
  currentBusiness: Business | null
  isLoading: boolean
  error: string | null
  
  // Actions
  setCurrentBusiness: (business: Business) => void
  updateBusinessSettings: (settings: Partial<BusinessSettings>) => Promise<void>
  loadBusinessProfile: () => Promise<void>
  
  // Colombian-specific methods
  updateColombianAddress: (address: ColombianAddress) => Promise<void>
  setHolidayCalendarEnabled: (enabled: boolean) => Promise<void>
}

export const useBusinessStore = create<BusinessState>((set, get) => ({
  currentBusiness: null,
  isLoading: false,
  error: null,
  
  setCurrentBusiness: (business) => {
    set({ currentBusiness: business })
    
    // Set tenant context for API calls
    if (business) {
      localStorage.setItem('current_business_id', business.id)
    }
  },
  
  updateBusinessSettings: async (settings) => {
    const { currentBusiness } = get()
    if (!currentBusiness) throw new Error('No business context')
    
    set({ isLoading: true })
    
    try {
      const updated = await businessService.updateSettings(
        currentBusiness.id, 
        settings
      )
      
      set({
        currentBusiness: { ...currentBusiness, settings: updated.settings },
        isLoading: false
      })
    } catch (error) {
      set({ error: error.message, isLoading: false })
    }
  }
}))
```

### Appointment Store (Real-time Management)

```typescript
// stores/appointment-store.ts
import { create } from 'zustand'
import { Appointment, CreateAppointmentRequest } from '@/types/business'
import { supabase } from '@/services/supabase'

interface AppointmentState {
  appointments: Appointment[]
  selectedDate: Date
  selectedSpecialist: string | null
  isLoading: boolean
  realtimeSubscription: any
  
  // Actions
  loadAppointments: (filters?: AppointmentFilters) => Promise<void>
  createAppointment: (data: CreateAppointmentRequest) => Promise<Appointment>
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => Promise<void>
  
  // Real-time methods
  subscribeToAppointments: () => void
  unsubscribeFromAppointments: () => void
}

export const useAppointmentStore = create<AppointmentState>((set, get) => ({
  appointments: [],
  selectedDate: new Date(),
  selectedSpecialist: null,
  isLoading: false,
  realtimeSubscription: null,
  
  createAppointment: async (data) => {
    const response = await appointmentService.createAppointment(data)
    
    // Optimistically add to local state
    set(state => ({
      appointments: [...state.appointments, response.appointment]
    }))
    
    return response.appointment
  },
  
  subscribeToAppointments: () => {
    const businessId = useBusinessStore.getState().currentBusiness?.id
    if (!businessId) return
    
    const subscription = supabase
      .channel('appointments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `business_id=eq.${businessId}`
        },
        (payload) => {
          // Handle real-time appointment changes
          if (payload.eventType === 'INSERT') {
            set(state => ({
              appointments: [...state.appointments, payload.new as Appointment]
            }))
          }
          // ... handle UPDATE and DELETE
        }
      )
      .subscribe()
    
    set({ realtimeSubscription: subscription })
  }
}))
```

## Routing Architecture

### Protected Route Pattern

```typescript
// components/auth/protected-route.tsx
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useBusinessStore } from '@/stores/business-store'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireBusiness?: boolean
}

export function ProtectedRoute({ 
  children, 
  requireBusiness = true 
}: ProtectedRouteProps) {
  const { user, isLoading: authLoading } = useAuthStore()
  const { currentBusiness, loadBusinessProfile } = useBusinessStore()
  const router = useRouter()
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    
    if (user && requireBusiness && !currentBusiness) {
      loadBusinessProfile().catch(() => {
        router.push('/register/business')
      })
    }
  }, [user, authLoading, currentBusiness, requireBusiness])
  
  if (authLoading || (requireBusiness && !currentBusiness)) {
    return <div>Cargando...</div>
  }
  
  return <>{children}</>
}
```

### Business Layout with Colombian Context

```typescript
// app/(business)/layout.tsx
import { BusinessSidebar } from '@/components/business/sidebar'
import { ColombianHolidayBanner } from '@/components/colombian/holiday-banner'
import { useColombianHolidays } from '@/hooks/use-colombian-holidays'

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { nextHoliday, isToday } = useColombianHolidays()
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      <BusinessSidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Colombian Holiday Notification */}
        {nextHoliday && (
          <ColombianHolidayBanner 
            holiday={nextHoliday}
            isToday={isToday}
          />
        )}
        
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

## API Service Layer

### API Client Setup

```typescript
// services/api-client.ts
import axios, { AxiosInstance } from 'axios'
import { useAuthStore } from '@/stores/auth-store'

class ApiClient {
  private client: AxiosInstance
  
  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    this.setupInterceptors()
  }
  
  private setupInterceptors() {
    // Request interceptor - add auth token and business context
    this.client.interceptors.request.use(
      (config) => {
        const { user } = useAuthStore.getState()
        
        if (user?.access_token) {
          config.headers.Authorization = `Bearer ${user.access_token}`
        }
        
        // Add business context header for multi-tenancy
        const businessId = localStorage.getItem('current_business_id')
        if (businessId) {
          config.headers['X-Business-ID'] = businessId
        }
        
        return config
      },
      (error) => Promise.reject(error)
    )
    
    // Response interceptor - handle Colombian-specific errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          useAuthStore.getState().logout()
          window.location.href = '/login'
        }
        
        // Handle Colombian holiday restrictions
        if (error.response?.data?.error?.code === 'HOLIDAY_RESTRICTION') {
          // Show Colombian holiday notification
          console.log('Booking blocked due to Colombian holiday')
        }
        
        return Promise.reject(error)
      }
    )
  }
  
  async get<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.get(url, config)
    return response.data
  }
  
  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post(url, data, config)
    return response.data
  }
}

export const apiClient = new ApiClient()
```

### Business Service Layer

```typescript
// services/appointment-service.ts
import { apiClient } from './api-client'
import { 
  CreateAppointmentRequest, 
  CreateAppointmentResponse,
  AvailabilityResponse 
} from '@/types/api'

export class AppointmentService {
  async getAvailability(params: {
    specialist_id: string
    service_id: string
    date: string
    duration_days?: number
  }): Promise<AvailabilityResponse> {
    return apiClient.get('/api/availability', { params })
  }
  
  async createAppointment(data: CreateAppointmentRequest): Promise<CreateAppointmentResponse> {
    return apiClient.post('/api/appointments', data)
  }
  
  async updateAppointmentStatus(
    appointmentId: string, 
    status: AppointmentStatus,
    reason?: string
  ): Promise<Appointment> {
    return apiClient.put(`/api/appointments/${appointmentId}`, {
      status,
      cancellation_reason: reason
    })
  }
  
  async rescheduleAppointment(
    appointmentId: string,
    newDate: string,
    newTime: string,
    reason?: string
  ): Promise<Appointment> {
    return apiClient.put(`/api/appointments/${appointmentId}/reschedule`, {
      new_date: newDate,
      new_start_time: newTime,
      reason
    })
  }
}

export const appointmentService = new AppointmentService()
```

## Colombian Market Components

### Holiday Calendar Integration

```typescript
// components/colombian/holiday-banner.tsx
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar } from 'lucide-react'
import { ColombianHoliday } from '@/types/business'

interface ColombianHolidayBannerProps {
  holiday: ColombianHoliday
  isToday: boolean
}

export function ColombianHolidayBanner({ holiday, isToday }: ColombianHolidayBannerProps) {
  return (
    <Alert className={`border-0 ${isToday ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'}`}>
      <Calendar className="h-4 w-4" />
      <AlertDescription>
        {isToday ? (
          <span className="font-semibold">
            Hoy es {holiday.name} - Las citas están deshabilitadas
          </span>
        ) : (
          <span>
            Próximo feriado: <strong>{holiday.name}</strong> el {new Date(holiday.date).toLocaleDateString('es-CO')}
          </span>
        )}
      </AlertDescription>
    </Alert>
  )
}
```

### Peso Pricing Display

```typescript
// components/colombian/peso-display.tsx
import { formatPesoCOP } from '@/utils/colombian-utils'

interface PesoDisplayProps {
  amount: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'muted'
}

export function PesoDisplay({ 
  amount, 
  size = 'md', 
  variant = 'default' 
}: PesoDisplayProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold'
  }
  
  const variantClasses = {
    default: 'text-gray-900',
    success: 'text-green-600',
    muted: 'text-gray-500'
  }
  
  return (
    <span className={`${sizeClasses[size]} ${variantClasses[variant]}`}>
      {formatPesoCOP(amount)}
    </span>
  )
}
```

## Responsive Design & Mobile Optimization

### Mobile-First Calendar Component

```typescript
// components/business/appointment-calendar.tsx
import { useState, useEffect } from 'react'
import { Calendar } from 'react-big-calendar'
import { useAppointmentStore } from '@/stores/appointment-store'
import { useWindowSize } from '@/hooks/use-window-size'

export function AppointmentCalendar() {
  const { appointments, loadAppointments } = useAppointmentStore()
  const { width } = useWindowSize()
  const isMobile = width < 768
  
  const calendarEvents = appointments.map(appointment => ({
    id: appointment.id,
    title: `${appointment.service.name} - ${appointment.client.name}`,
    start: new Date(`${appointment.appointment_date} ${appointment.start_time}`),
    end: new Date(`${appointment.appointment_date} ${appointment.end_time}`),
    resource: appointment
  }))
  
  return (
    <div className="h-[600px] bg-white rounded-lg shadow">
      <Calendar
        events={calendarEvents}
        view={isMobile ? 'day' : 'week'}
        views={isMobile ? ['day', 'agenda'] : ['month', 'week', 'day']}
        step={15} // 15-minute granularity
        timeslots={4} // 4 slots per hour (15-minute intervals)
        culture="es-CO" // Colombian Spanish
        messages={{
          today: 'Hoy',
          previous: 'Anterior',
          next: 'Siguiente',
          month: 'Mes',
          week: 'Semana',
          day: 'Día',
          agenda: 'Agenda'
        }}
        onSelectSlot={({ start, end }) => {
          // Handle new appointment creation
          if (isMobile) {
            // Mobile: Navigate to appointment creation form
            router.push(`/appointments/new?date=${format(start, 'yyyy-MM-dd')}&time=${format(start, 'HH:mm')}`)
          }
        }}
      />
    </div>
  )
}
```

## Frontend Architecture Rationale

### Component Design Decisions

1. **Feature-based organization** - Groups related components together for better maintainability and Colombian business context
2. **Compound components** - Complex components like AppointmentCard encapsulate related functionality with Colombian formatting
3. **Colombian-specific components** - Dedicated components for phone inputs, address forms, peso pricing with local validation
4. **Shared UI components** - Consistent design system across all business features with Colombian terminology

### State Management Strategy

1. **Zustand over Redux** - Simpler API reduces complexity for small team while maintaining Colombian business context
2. **Store separation** - Business, appointment, and auth stores for clear boundaries and multi-tenant isolation
3. **Real-time integration** - Supabase subscriptions prevent booking conflicts through live data synchronization
4. **Multi-tenant context** - Business store manages tenant isolation automatically

### Performance Optimizations

1. **Next.js App Router** - Server components reduce client bundle size for Colombian network conditions
2. **Component lazy loading** - Route-based code splitting optimized for mobile data usage
3. **Colombian network optimization** - Aggressive caching and timeout handling for slower connections
4. **Image optimization** - Next.js automatic optimization with WebP support

### Colombian Market Specializations

1. **Phone number formatting** - Automatic +57 prefix and Colombian format validation
2. **Address structure** - Colombian departments and city codes with government integration
3. **Peso pricing** - Integer-based pricing with proper Colombian peso formatting (no cents)
4. **Holiday integration** - Visual indicators and booking prevention for Colombian national holidays
5. **Mobile-first design** - Responsive design optimized for Colombian mobile usage patterns
6. **Spanish localization** - All UI text in Colombian Spanish with proper terminology

---

*This frontend architecture provides a comprehensive, Colombian-optimized user interface with real-time capabilities, mobile responsiveness, and multi-tenant security.*