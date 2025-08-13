/**
 * Colombian holiday calendar utilities
 * Placeholder implementation for Epic 3 integration
 * Handles Colombian national holidays and working day calculations
 */

/**
 * Types of Colombian holidays
 */
export type HolidayType = 'national' | 'religious' | 'civic';

/**
 * Colombian holiday definition
 */
export interface ColombianHoliday {
  name: string;
  date: Date;
  type: HolidayType;
  isFixed: boolean; // Whether the date is fixed each year
  description?: string;
}

/**
 * Fixed Colombian holidays (same date every year)
 * These dates never change and are always observed
 */
const FIXED_HOLIDAYS = [
  { month: 1, day: 1, name: 'Año Nuevo', type: 'civic' as const },
  { month: 5, day: 1, name: 'Día del Trabajo', type: 'civic' as const },
  { month: 7, day: 20, name: 'Día de la Independencia', type: 'national' as const },
  { month: 8, day: 7, name: 'Batalla de Boyacá', type: 'national' as const },
  { month: 12, day: 8, name: 'Inmaculada Concepción', type: 'religious' as const },
  { month: 12, day: 25, name: 'Navidad', type: 'religious' as const }
];

/**
 * Monday holidays - these are moved to the following Monday if they don't fall on Monday
 * This is a unique characteristic of the Colombian holiday system
 */
const MONDAY_HOLIDAYS = [
  { month: 1, day: 6, name: 'Día de los Reyes Magos', type: 'religious' as const },
  { month: 3, day: 19, name: 'Día de San José', type: 'religious' as const },
  { month: 6, day: 29, name: 'San Pedro y San Pablo', type: 'religious' as const },
  { month: 8, day: 15, name: 'Asunción de la Virgen', type: 'religious' as const },
  { month: 10, day: 12, name: 'Día de la Raza', type: 'civic' as const },
  { month: 11, day: 1, name: 'Día de Todos los Santos', type: 'religious' as const },
  { month: 11, day: 11, name: 'Independencia de Cartagena', type: 'national' as const }
];

/**
 * Gets all Colombian holidays for a given year
 * @param year - Year to get holidays for (defaults to current year)
 * @returns Array of Colombian holidays for the year
 */
export function getColombianHolidays(year?: number): ColombianHoliday[] {
  const targetYear = year || new Date().getFullYear();
  const holidays: ColombianHoliday[] = [];

  // Add fixed holidays
  FIXED_HOLIDAYS.forEach(holiday => {
    holidays.push({
      name: holiday.name,
      date: new Date(targetYear, holiday.month - 1, holiday.day),
      type: holiday.type,
      isFixed: true
    });
  });

  // Add Monday holidays (moved to following Monday if not on Monday)
  MONDAY_HOLIDAYS.forEach(holiday => {
    const originalDate = new Date(targetYear, holiday.month - 1, holiday.day);
    const dayOfWeek = originalDate.getDay();
    
    // If not Monday (1), move to the following Monday
    let adjustedDate = originalDate;
    if (dayOfWeek !== 1) {
      const daysToAdd = dayOfWeek === 0 ? 1 : (8 - dayOfWeek); // Sunday = 0, Monday = 1
      adjustedDate = new Date(originalDate);
      adjustedDate.setDate(originalDate.getDate() + daysToAdd);
    }

    holidays.push({
      name: holiday.name,
      date: adjustedDate,
      type: holiday.type,
      isFixed: false,
      description: dayOfWeek !== 1 ? `Moved from ${originalDate.toDateString()}` : undefined
    });
  });

  // Add Easter-based holidays (placeholder - would need proper Easter calculation)
  const easterHolidays = getEasterBasedHolidays(targetYear);
  holidays.push(...easterHolidays);

  // Sort by date
  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Calculates Easter-based holidays for Colombia
 * @param year - Year to calculate for
 * @returns Array of Easter-based holidays
 */
function getEasterBasedHolidays(year: number): ColombianHoliday[] {
  // Placeholder implementation - in a real system, this would calculate Easter
  // and then derive other holidays like Holy Week, Ascension Day, etc.
  // For now, we'll use approximate dates
  
  // This is a simplified placeholder - real implementation would use Easter algorithm
  const approximateEaster = new Date(year, 3, 15); // April 15 as placeholder
  
  const holidays: ColombianHoliday[] = [];
  
  // Holy Thursday (Jueves Santo) - day before Good Friday
  const holyThursday = new Date(approximateEaster);
  holyThursday.setDate(approximateEaster.getDate() - 3);
  holidays.push({
    name: 'Jueves Santo',
    date: holyThursday,
    type: 'religious',
    isFixed: false,
    description: 'Easter-based holiday'
  });

  // Good Friday (Viernes Santo) - Friday before Easter
  const goodFriday = new Date(approximateEaster);
  goodFriday.setDate(approximateEaster.getDate() - 2);
  holidays.push({
    name: 'Viernes Santo',
    date: goodFriday,
    type: 'religious',
    isFixed: false,
    description: 'Easter-based holiday'
  });

  // Ascension Day (moved to Monday)
  const ascensionDay = new Date(approximateEaster);
  ascensionDay.setDate(approximateEaster.getDate() + 39);
  // Move to following Monday
  const ascensionDayOfWeek = ascensionDay.getDay();
  if (ascensionDayOfWeek !== 1) {
    const daysToAdd = ascensionDayOfWeek === 0 ? 1 : (8 - ascensionDayOfWeek);
    ascensionDay.setDate(ascensionDay.getDate() + daysToAdd);
  }
  holidays.push({
    name: 'Ascensión del Señor',
    date: ascensionDay,
    type: 'religious',
    isFixed: false,
    description: 'Easter-based holiday (moved to Monday)'
  });

  // Corpus Christi (moved to Monday)
  const corpusChristi = new Date(approximateEaster);
  corpusChristi.setDate(approximateEaster.getDate() + 60);
  // Move to following Monday
  const corpusChristiDayOfWeek = corpusChristi.getDay();
  if (corpusChristiDayOfWeek !== 1) {
    const daysToAdd = corpusChristiDayOfWeek === 0 ? 1 : (8 - corpusChristiDayOfWeek);
    corpusChristi.setDate(corpusChristi.getDate() + daysToAdd);
  }
  holidays.push({
    name: 'Corpus Christi',
    date: corpusChristi,
    type: 'religious',
    isFixed: false,
    description: 'Easter-based holiday (moved to Monday)'
  });

  // Sacred Heart (moved to Monday)
  const sacredHeart = new Date(approximateEaster);
  sacredHeart.setDate(approximateEaster.getDate() + 68);
  // Move to following Monday
  const sacredHeartDayOfWeek = sacredHeart.getDay();
  if (sacredHeartDayOfWeek !== 1) {
    const daysToAdd = sacredHeartDayOfWeek === 0 ? 1 : (8 - sacredHeartDayOfWeek);
    sacredHeart.setDate(sacredHeart.getDate() + daysToAdd);
  }
  holidays.push({
    name: 'Sagrado Corazón de Jesús',
    date: sacredHeart,
    type: 'religious',
    isFixed: false,
    description: 'Easter-based holiday (moved to Monday)'
  });

  return holidays;
}

/**
 * Checks if a given date is a Colombian holiday
 * @param date - Date to check
 * @param year - Year context (defaults to the year of the provided date)
 * @returns true if the date is a Colombian holiday
 */
export function isColombianHoliday(date: Date, year?: number): boolean {
  const targetYear = year || date.getFullYear();
  const holidays = getColombianHolidays(targetYear);
  
  const dateString = date.toDateString();
  return holidays.some(holiday => holiday.date.toDateString() === dateString);
}

/**
 * Gets the next Colombian holiday from a given date
 * @param fromDate - Starting date (defaults to today)
 * @returns Next holiday or null if no upcoming holiday in the year
 */
export function getNextHoliday(fromDate?: Date): ColombianHoliday | null {
  const startDate = fromDate || new Date();
  const year = startDate.getFullYear();
  const holidays = getColombianHolidays(year);

  // Find the next holiday
  const nextHoliday = holidays.find(holiday => holiday.date > startDate);
  
  // If no holiday found in current year, check next year
  if (!nextHoliday) {
    const nextYearHolidays = getColombianHolidays(year + 1);
    return nextYearHolidays.length > 0 ? nextYearHolidays[0] : null;
  }

  return nextHoliday;
}

/**
 * Checks if a date is a working day (Monday-Friday and not a holiday)
 * @param date - Date to check
 * @returns true if it's a working day
 */
export function isWorkingDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  
  // Check if it's a weekend (Sunday = 0, Saturday = 6)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // Check if it's a holiday
  return !isColombianHoliday(date);
}

/**
 * Gets the next working day from a given date
 * @param fromDate - Starting date (defaults to today)
 * @param includeFromDate - Whether to include the from date in consideration
 * @returns Next working day
 */
export function getNextWorkingDay(fromDate?: Date, includeFromDate: boolean = false): Date {
  const startDate = fromDate ? new Date(fromDate) : new Date();
  
  if (!includeFromDate) {
    startDate.setDate(startDate.getDate() + 1);
  }

  while (!isWorkingDay(startDate)) {
    startDate.setDate(startDate.getDate() + 1);
  }

  return startDate;
}

/**
 * Calculates working days between two dates (exclusive of end date)
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of working days between the dates
 */
export function getWorkingDaysBetween(startDate: Date, endDate: Date): number {
  let count = 0;
  const currentDate = new Date(startDate);
  
  while (currentDate < endDate) {
    if (isWorkingDay(currentDate)) {
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return count;
}

/**
 * Common Colombian business hours and day configurations
 */
export const COLOMBIAN_BUSINESS_CONFIG = {
  // Standard business hours in Colombia
  BUSINESS_HOURS: {
    START: 8, // 8 AM
    END: 18,  // 6 PM
    LUNCH_START: 12, // 12 PM
    LUNCH_END: 14    // 2 PM
  },
  
  // Working days of the week (Monday = 1, Sunday = 0)
  WORKING_DAYS: [1, 2, 3, 4, 5, 6], // Monday through Saturday (many businesses open Saturday)
  
  // Colombian timezone
  TIMEZONE: 'America/Bogota',
  
  // Standard appointment durations in minutes
  APPOINTMENT_DURATIONS: {
    SHORT: 15,
    STANDARD: 30,
    LONG: 60,
    EXTENDED: 120
  }
} as const;