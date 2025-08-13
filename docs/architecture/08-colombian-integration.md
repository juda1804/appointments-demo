# Colombian Market Integration

This document defines the Colombian market-specific features and integrations that make this system specialized for Colombian service businesses, including holiday calendar integration, peso pricing, phone validation, and Colombian business workflows.

## Overview

The Colombian Appointment Management System is built as a **Colombian-first platform** rather than an international solution with Colombian features. This architectural principle drives every design decision to ensure optimal experience for Colombian businesses and their clients.

## Core Colombian Specializations

### 1. Colombian Phone Number System

**Format Requirements:**
- All Colombian mobile numbers follow the format: +57 XXX XXX XXXX
- Mobile numbers start with 3 (e.g., +57 300 123 4567)
- Landline numbers have different area codes by city

**Implementation:**

```typescript
// Colombian phone validation and formatting
export const COLOMBIAN_PHONE_PATTERNS = {
  mobile: /^(\+57\s?)?3\d{2}\s?\d{3}\s?\d{4}$/,
  landline: /^(\+57\s?)?[1-8]\d{6,7}$/,
  formatted: /^\+57\s\d{3}\s\d{3}\s\d{4}$/
} as const

export const formatColombianPhone = (phone: string): string => {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')
  
  // Handle different input formats
  if (digits.length === 10 && digits.startsWith('3')) {
    // Colombian mobile: 3001234567 → +57 300 123 4567
    return `+57 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }
  
  if (digits.length === 12 && digits.startsWith('57')) {
    // International format: 573001234567 → +57 300 123 4567
    const localNumber = digits.slice(2)
    return `+57 ${localNumber.slice(0, 3)} ${localNumber.slice(3, 6)} ${localNumber.slice(6)}`
  }
  
  return phone // Return as-is if not recognizable format
}

export const validateColombianPhone = (phone: string): {
  isValid: boolean
  type: 'mobile' | 'landline' | 'unknown'
  formatted?: string
} => {
  const cleanPhone = phone.replace(/\s/g, '')
  
  if (COLOMBIAN_PHONE_PATTERNS.mobile.test(cleanPhone)) {
    return {
      isValid: true,
      type: 'mobile',
      formatted: formatColombianPhone(phone)
    }
  }
  
  if (COLOMBIAN_PHONE_PATTERNS.landline.test(cleanPhone)) {
    return {
      isValid: true,
      type: 'landline',
      formatted: formatColombianPhone(phone)
    }
  }
  
  return { isValid: false, type: 'unknown' }
}

// WhatsApp integration for Colombian businesses
export const generateWhatsAppLink = (
  phone: string, 
  message: string,
  businessName: string
): string => {
  const formattedPhone = formatColombianPhone(phone).replace(/\s/g, '')
  const encodedMessage = encodeURIComponent(
    `Hola, soy ${businessName}. ${message}`
  )
  return `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodedMessage}`
}
```

**Database Integration:**
```sql
-- Phone validation at database level
ALTER TABLE businesses ADD CONSTRAINT valid_colombian_phone 
CHECK (phone ~ '^\+57 [0-9]{3} [0-9]{3} [0-9]{4}$');

ALTER TABLE clients ADD CONSTRAINT valid_colombian_phone 
CHECK (phone ~ '^\+57 [0-9]{3} [0-9]{3} [0-9]{4}$');
```

### 2. Colombian Peso (COP) Pricing System

**Currency Requirements:**
- Colombian peso is the only supported currency for MVP
- No decimal places (pesos don't use cents)
- Integer-based pricing prevents rounding errors
- Proper Colombian number formatting with periods as thousands separators

**Implementation:**

```typescript
// Colombian peso utilities
export const formatPesoCOP = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
  // Example output: "$25.000" (Colombian format)
}

export const parsePesoInput = (input: string): number | null => {
  // Handle Colombian peso input with periods and dollar signs
  const cleaned = input
    .replace(/[$\s]/g, '') // Remove $ and spaces
    .replace(/\./g, '') // Remove thousand separators
    .replace(/,/g, '') // Remove any commas
  
  const number = parseInt(cleaned, 10)
  return isNaN(number) ? null : number
}

export const validatePesoAmount = (amount: number): {
  isValid: boolean
  errors: string[]
} => {
  const errors: string[] = []
  
  if (!Number.isInteger(amount)) {
    errors.push('Los precios deben ser números enteros (sin centavos)')
  }
  
  if (amount < 1000) {
    errors.push('El precio mínimo es $1.000 COP')
  }
  
  if (amount > 10000000) {
    errors.push('El precio máximo es $10.000.000 COP')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Service pricing helpers for Colombian market
export const COLOMBIAN_PRICING_TIERS = {
  budget: { min: 10000, max: 50000, label: 'Económico' },
  standard: { min: 50001, max: 150000, label: 'Estándar' },
  premium: { min: 150001, max: 500000, label: 'Premium' },
  luxury: { min: 500001, max: 2000000, label: 'Lujo' }
} as const

export const getPricingTier = (price: number): keyof typeof COLOMBIAN_PRICING_TIERS | null => {
  for (const [tier, range] of Object.entries(COLOMBIAN_PRICING_TIERS)) {
    if (price >= range.min && price <= range.max) {
      return tier as keyof typeof COLOMBIAN_PRICING_TIERS
    }
  }
  return null
}
```

**Database Schema:**
```sql
-- Peso pricing validation
ALTER TABLE services ADD CONSTRAINT valid_peso_pricing 
CHECK (price_cop > 0 AND price_cop <= 10000000);

-- Index for pricing queries
CREATE INDEX idx_services_pricing_tier ON services(price_cop);
```

### 3. Colombian Address System

**Address Structure Requirements:**
- Colombian addresses follow: Street, City, Department structure
- 32 departments (not states/provinces like other countries)
- Optional postal codes (not widely used)
- City codes for holiday calendar integration

**Implementation:**

```typescript
// Colombian administrative divisions
export const COLOMBIAN_DEPARTMENTS = [
  { name: 'Amazonas', code: 'AMA', capital: 'Leticia' },
  { name: 'Antioquia', code: 'ANT', capital: 'Medellín' },
  { name: 'Arauca', code: 'ARA', capital: 'Arauca' },
  { name: 'Atlántico', code: 'ATL', capital: 'Barranquilla' },
  { name: 'Bolívar', code: 'BOL', capital: 'Cartagena' },
  { name: 'Boyacá', code: 'BOY', capital: 'Tunja' },
  { name: 'Caldas', code: 'CAL', capital: 'Manizales' },
  { name: 'Caquetá', code: 'CAQ', capital: 'Florencia' },
  { name: 'Casanare', code: 'CAS', capital: 'Yopal' },
  { name: 'Cauca', code: 'CAU', capital: 'Popayán' },
  { name: 'Cesar', code: 'CES', capital: 'Valledupar' },
  { name: 'Chocó', code: 'CHO', capital: 'Quibdó' },
  { name: 'Córdoba', code: 'COR', capital: 'Montería' },
  { name: 'Cundinamarca', code: 'CUN', capital: 'Bogotá' },
  { name: 'Guainía', code: 'GUA', capital: 'Inírida' },
  { name: 'Guaviare', code: 'GUV', capital: 'San José del Guaviare' },
  { name: 'Huila', code: 'HUI', capital: 'Neiva' },
  { name: 'La Guajira', code: 'LAG', capital: 'Riohacha' },
  { name: 'Magdalena', code: 'MAG', capital: 'Santa Marta' },
  { name: 'Meta', code: 'MET', capital: 'Villavicencio' },
  { name: 'Nariño', code: 'NAR', capital: 'Pasto' },
  { name: 'Norte de Santander', code: 'NSA', capital: 'Cúcuta' },
  { name: 'Putumayo', code: 'PUT', capital: 'Mocoa' },
  { name: 'Quindío', code: 'QUI', capital: 'Armenia' },
  { name: 'Risaralda', code: 'RIS', capital: 'Pereira' },
  { name: 'San Andrés y Providencia', code: 'SAP', capital: 'San Andrés' },
  { name: 'Santander', code: 'SAN', capital: 'Bucaramanga' },
  { name: 'Sucre', code: 'SUC', capital: 'Sincelejo' },
  { name: 'Tolima', code: 'TOL', capital: 'Ibagué' },
  { name: 'Valle del Cauca', code: 'VAC', capital: 'Cali' },
  { name: 'Vaupés', code: 'VAU', capital: 'Mitú' },
  { name: 'Vichada', code: 'VIC', capital: 'Puerto Carreño' }
] as const

export type ColombianDepartment = typeof COLOMBIAN_DEPARTMENTS[number]['name']

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

export const validateColombianAddress = (address: {
  street: string
  city: string  
  department: string
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (!address.street?.trim()) {
    errors.push('La dirección es requerida')
  }
  
  if (!address.city?.trim()) {
    errors.push('La ciudad es requerida')
  }
  
  const validDepartments = COLOMBIAN_DEPARTMENTS.map(d => d.name)
  if (!validDepartments.includes(address.department)) {
    errors.push('Departamento no válido')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}
```

### 4. Colombian Holiday Calendar Integration

**Holiday System Requirements:**
- Colombian national holidays (fixed and moveable)
- Regional holidays by department/city
- Catholic calendar integration (many Colombian holidays are religious)
- Business closure prevention on holidays
- Holiday notification system for users

**Implementation:**

```typescript
// Colombian holiday service
export interface ColombianHoliday {
  id: string
  date: Date
  name: string
  type: 'NATIONAL' | 'REGIONAL' | 'RELIGIOUS' | 'CIVIC'
  is_national: boolean
  applies_to_cities?: string[] // City codes where applicable
  description?: string
}

export class ColombianHolidayService {
  private static readonly HOLIDAY_API_URL = 'https://date.nager.at/api/v3/publicholidays'
  private cache = new Map<string, ColombianHoliday[]>()
  
  async getHolidays(year: number): Promise<ColombianHoliday[]> {
    const cacheKey = `holidays_${year}`
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }
    
    try {
      // Primary: External API
      const response = await fetch(`${this.HOLIDAY_API_URL}/${year}/CO`)
      const apiHolidays = await response.json()
      
      const holidays = apiHolidays.map(this.mapApiHoliday)
      
      // Fallback: Database-stored holidays
      const { data: dbHolidays } = await supabase
        .from('colombian_holidays')
        .select('*')
        .gte('date', `${year}-01-01`)
        .lt('date', `${year + 1}-01-01`)
      
      // Merge API and database holidays
      const allHolidays = [...holidays, ...(dbHolidays || [])]
      
      this.cache.set(cacheKey, allHolidays)
      return allHolidays
      
    } catch (error) {
      console.error('Holiday API error:', error)
      
      // Fallback to static holiday data
      return this.getStaticHolidays(year)
    }
  }
  
  async isHoliday(date: Date, cityCode?: string): Promise<boolean> {
    const year = date.getFullYear()
    const holidays = await this.getHolidays(year)
    const dateString = date.toISOString().split('T')[0]
    
    return holidays.some(holiday => {
      const holidayDate = holiday.date.toISOString().split('T')[0]
      
      if (holidayDate !== dateString) return false
      
      // National holidays apply everywhere
      if (holiday.is_national) return true
      
      // Regional holidays apply only to specific cities
      if (cityCode && holiday.applies_to_cities) {
        return holiday.applies_to_cities.includes(cityCode)
      }
      
      return false
    })
  }
  
  async getNextHoliday(fromDate: Date = new Date()): Promise<ColombianHoliday | null> {
    const year = fromDate.getFullYear()
    const holidays = await this.getHolidays(year)
    
    const futureHolidays = holidays.filter(holiday => holiday.date > fromDate)
    
    if (futureHolidays.length === 0) {
      // Check next year's holidays
      const nextYearHolidays = await this.getHolidays(year + 1)
      return nextYearHolidays[0] || null
    }
    
    return futureHolidays.sort((a, b) => a.date.getTime() - b.date.getTime())[0]
  }
  
  private mapApiHoliday(apiHoliday: any): ColombianHoliday {
    return {
      id: `api_${apiHoliday.date}`,
      date: new Date(apiHoliday.date),
      name: apiHoliday.localName || apiHoliday.name,
      type: apiHoliday.types?.includes('Public') ? 'NATIONAL' : 'RELIGIOUS',
      is_national: true,
      description: apiHoliday.name
    }
  }
  
  private getStaticHolidays(year: number): ColombianHoliday[] {
    // Static holiday data as fallback
    return [
      {
        id: `static_${year}_new_year`,
        date: new Date(year, 0, 1),
        name: 'Año Nuevo',
        type: 'NATIONAL',
        is_national: true
      },
      // ... other Colombian holidays
    ]
  }
}

export const colombianHolidayService = new ColombianHolidayService()
```

**Frontend Holiday Integration:**

```typescript
// Holiday banner component
export function ColombianHolidayBanner() {
  const [nextHoliday, setNextHoliday] = useState<ColombianHoliday | null>(null)
  const [isToday, setIsToday] = useState(false)
  
  useEffect(() => {
    const loadNextHoliday = async () => {
      const holiday = await colombianHolidayService.getNextHoliday()
      setNextHoliday(holiday)
      
      if (holiday) {
        const today = new Date().toDateString()
        const holidayDate = holiday.date.toDateString()
        setIsToday(today === holidayDate)
      }
    }
    
    loadNextHoliday()
  }, [])
  
  if (!nextHoliday) return null
  
  return (
    <Alert className={`border-0 ${isToday ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'}`}>
      <Calendar className="h-4 w-4" />
      <AlertDescription>
        {isToday ? (
          <span className="font-semibold">
            🇨🇴 Hoy es {nextHoliday.name} - Las citas están deshabilitadas
          </span>
        ) : (
          <span>
            📅 Próximo feriado colombiano: <strong>{nextHoliday.name}</strong> el{' '}
            {nextHoliday.date.toLocaleDateString('es-CO', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        )}
      </AlertDescription>
    </Alert>
  )
}
```

### 5. Colombian ID (Cédula) Validation

**ID System Requirements:**
- Colombian national ID (cédula de ciudadanía) for client identification
- Foreign ID (cédula de extranjería) for non-Colombian residents
- NIT (tax ID) for business identification
- Validation algorithms for each ID type

**Implementation:**

```typescript
// Colombian ID validation utilities
export type ColombianIDType = 'cedula' | 'cedula_extranjeria' | 'nit' | 'passport'

export interface ColombianIDValidation {
  isValid: boolean
  type: ColombianIDType
  formatted: string
  errors: string[]
}

export const validateColombianID = (
  idNumber: string,
  expectedType?: ColombianIDType
): ColombianIDValidation => {
  const cleaned = idNumber.replace(/[^\d]/g, '')
  
  // Validate cédula de ciudadanía (6-10 digits)
  if (cleaned.length >= 6 && cleaned.length <= 10) {
    const isValid = validateCedulaAlgorithm(cleaned)
    return {
      isValid,
      type: 'cedula',
      formatted: formatCedula(cleaned),
      errors: isValid ? [] : ['Número de cédula inválido']
    }
  }
  
  // Validate NIT (9-10 digits + verification digit)
  if (cleaned.length >= 9 && cleaned.length <= 11) {
    const isValid = validateNITAlgorithm(cleaned)
    return {
      isValid,
      type: 'nit',
      formatted: formatNIT(cleaned),
      errors: isValid ? [] : ['NIT inválido']
    }
  }
  
  return {
    isValid: false,
    type: 'cedula',
    formatted: cleaned,
    errors: ['Formato de documento inválido']
  }
}

const validateCedulaAlgorithm = (cedula: string): boolean => {
  // Simplified validation - in production, implement full algorithm
  return cedula.length >= 6 && cedula.length <= 10 && /^\d+$/.test(cedula)
}

const validateNITAlgorithm = (nit: string): boolean => {
  // Simplified NIT validation
  if (nit.length < 9) return false
  
  const digits = nit.slice(0, -1)
  const checkDigit = parseInt(nit.slice(-1), 10)
  
  // Calculate check digit using Colombian NIT algorithm
  const weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47]
  let sum = 0
  
  for (let i = 0; i < digits.length; i++) {
    sum += parseInt(digits[i], 10) * weights[weights.length - digits.length + i]
  }
  
  const calculatedCheckDigit = sum % 11
  const finalCheckDigit = calculatedCheckDigit < 2 ? calculatedCheckDigit : 11 - calculatedCheckDigit
  
  return checkDigit === finalCheckDigit
}

const formatCedula = (cedula: string): string => {
  // Format: XX.XXX.XXX
  return cedula.replace(/(\d{1,3})(\d{3})(\d{3})/, '$1.$2.$3')
}

const formatNIT = (nit: string): string => {
  // Format: XXX.XXX.XXX-X
  const digits = nit.slice(0, -1)
  const checkDigit = nit.slice(-1)
  return digits.replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3') + '-' + checkDigit
}
```

### 6. Colombian Business Hours and Timezone

**Business Hours Requirements:**
- Colombian timezone (America/Bogota) - no daylight saving time
- Typical business hours: 8:00 AM - 6:00 PM
- Lunch break culture: 12:00 PM - 2:00 PM (many businesses close)
- Catholic influence: Many businesses closed on Sundays

**Implementation:**

```typescript
// Colombian timezone and business hours
export const COLOMBIA_TIMEZONE = 'America/Bogota'

export const COLOMBIAN_BUSINESS_HOURS = {
  typical: {
    start: '08:00',
    end: '18:00',
    lunchStart: '12:00',
    lunchEnd: '14:00'
  },
  retail: {
    start: '10:00',
    end: '20:00',
    lunchStart: '12:30',
    lunchEnd: '13:30'
  },
  medical: {
    start: '07:00',
    end: '17:00',
    lunchStart: '12:00',
    lunchEnd: '13:00'
  },
  beauty: {
    start: '09:00',
    end: '19:00',
    lunchStart: null, // Often no lunch break
    lunchEnd: null
  }
} as const

export const getColombianTime = (): Date => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: COLOMBIA_TIMEZONE }))
}

export const formatColombianTime = (date: Date): string => {
  return date.toLocaleString('es-CO', {
    timeZone: COLOMBIA_TIMEZONE,
    hour12: true,
    hour: 'numeric',
    minute: '2-digit'
  })
}

export const formatColombianDate = (date: Date): string => {
  return date.toLocaleDateString('es-CO', {
    timeZone: COLOMBIA_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export const isColombianBusinessHour = (
  time: string, // "HH:MM" format
  businessType: keyof typeof COLOMBIAN_BUSINESS_HOURS = 'typical'
): boolean => {
  const hours = COLOMBIAN_BUSINESS_HOURS[businessType]
  const [hour, minute] = time.split(':').map(Number)
  const timeMinutes = hour * 60 + minute
  
  const [startHour, startMinute] = hours.start.split(':').map(Number)
  const startMinutes = startHour * 60 + startMinute
  
  const [endHour, endMinute] = hours.end.split(':').map(Number)
  const endMinutes = endHour * 60 + endMinute
  
  // Check if within business hours
  if (timeMinutes < startMinutes || timeMinutes >= endMinutes) {
    return false
  }
  
  // Check lunch break (if applicable)
  if (hours.lunchStart && hours.lunchEnd) {
    const [lunchStartHour, lunchStartMinute] = hours.lunchStart.split(':').map(Number)
    const lunchStartMinutes = lunchStartHour * 60 + lunchStartMinute
    
    const [lunchEndHour, lunchEndMinute] = hours.lunchEnd.split(':').map(Number)
    const lunchEndMinutes = lunchEndHour * 60 + lunchEndMinute
    
    if (timeMinutes >= lunchStartMinutes && timeMinutes < lunchEndMinutes) {
      return false
    }
  }
  
  return true
}
```

## Colombian Integration Rationale

### Why Colombian-First Architecture?

1. **Market Specialization** - Colombian businesses have unique requirements that generic international solutions can't address effectively
2. **Competitive Advantage** - Deep Colombian integration creates barriers for international competitors
3. **User Experience** - Native Colombian features feel natural to local users
4. **Compliance** - Built-in compliance with Colombian business practices and regulations
5. **Network Optimization** - Infrastructure choices optimized for Colombian internet conditions

### Implementation Benefits

1. **Zero Configuration** - Colombian businesses get proper phone formatting, peso pricing, and holiday integration out of the box
2. **Reduced Errors** - Colombian-specific validation prevents common data entry mistakes
3. **Cultural Alignment** - Business workflows match Colombian expectations and practices
4. **Localization** - All text, formats, and interactions use Colombian Spanish and conventions
5. **Performance** - Colombian-optimized caching and API strategies

### Future Colombian Enhancements

1. **Bank Integration** - PSE (Pagos Seguros en Línea) payment integration
2. **DIAN Integration** - Colombian tax authority API integration for invoicing
3. **DANE Integration** - National statistics department data for demographics
4. **Mobile Operators** - Direct SMS integration with Colombian carriers
5. **Government Services** - Integration with Colombian government digital services

---

*This Colombian integration strategy ensures the system serves as a truly Colombian-first appointment management platform with deep market specialization and cultural alignment.*