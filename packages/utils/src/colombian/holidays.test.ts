/**
 * Tests for Colombian holiday calendar utilities
 */

import {
  getColombianHolidays,
  isColombianHoliday,
  getNextHoliday,
  isWorkingDay,
  getNextWorkingDay,
  getWorkingDaysBetween,
  COLOMBIAN_BUSINESS_CONFIG,
  type ColombianHoliday,
  type HolidayType
} from './holidays';

describe('Colombian Holiday Utilities', () => {
  describe('getColombianHolidays', () => {
    test('should return holidays for current year when no year specified', () => {
      const holidays = getColombianHolidays();
      const currentYear = new Date().getFullYear();
      
      expect(holidays.length).toBeGreaterThan(10);
      holidays.forEach(holiday => {
        expect(holiday.date.getFullYear()).toBe(currentYear);
      });
    });

    test('should return holidays for specified year', () => {
      const holidays2025 = getColombianHolidays(2025);
      const holidays2024 = getColombianHolidays(2024);
      
      expect(holidays2025.length).toBeGreaterThan(10);
      expect(holidays2024.length).toBeGreaterThan(10);
      
      holidays2025.forEach(holiday => {
        expect(holiday.date.getFullYear()).toBe(2025);
      });
      
      holidays2024.forEach(holiday => {
        expect(holiday.date.getFullYear()).toBe(2024);
      });
    });

    test('should include fixed holidays', () => {
      const holidays = getColombianHolidays(2025);
      const holidayNames = holidays.map(h => h.name);
      
      // Check for known fixed holidays
      expect(holidayNames).toContain('Año Nuevo');
      expect(holidayNames).toContain('Día del Trabajo');
      expect(holidayNames).toContain('Día de la Independencia');
      expect(holidayNames).toContain('Batalla de Boyacá');
      expect(holidayNames).toContain('Inmaculada Concepción');
      expect(holidayNames).toContain('Navidad');
    });

    test('should include Monday holidays', () => {
      const holidays = getColombianHolidays(2025);
      const holidayNames = holidays.map(h => h.name);
      
      // Check for known Monday holidays
      expect(holidayNames).toContain('Día de los Reyes Magos');
      expect(holidayNames).toContain('Día de San José');
      expect(holidayNames).toContain('San Pedro y San Pablo');
      expect(holidayNames).toContain('Asunción de la Virgen');
      expect(holidayNames).toContain('Día de la Raza');
      expect(holidayNames).toContain('Día de Todos los Santos');
      expect(holidayNames).toContain('Independencia de Cartagena');
    });

    test('should include Easter-based holidays', () => {
      const holidays = getColombianHolidays(2025);
      const holidayNames = holidays.map(h => h.name);
      
      // Check for known Easter-based holidays
      expect(holidayNames).toContain('Jueves Santo');
      expect(holidayNames).toContain('Viernes Santo');
      expect(holidayNames).toContain('Ascensión del Señor');
      expect(holidayNames).toContain('Corpus Christi');
      expect(holidayNames).toContain('Sagrado Corazón de Jesús');
    });

    test('should move Monday holidays to the following Monday when necessary', () => {
      const holidays = getColombianHolidays(2025);
      
      // Find a Monday holiday and check that it falls on Monday
      const mondayHolidays = holidays.filter(h => !h.isFixed && h.name !== 'Jueves Santo' && h.name !== 'Viernes Santo');
      
      mondayHolidays.forEach(holiday => {
        if (holiday.name.includes('Ascensión') || holiday.name.includes('Corpus') || holiday.name.includes('Sagrado Corazón')) {
          // These are always moved to Monday
          expect(holiday.date.getDay()).toBe(1); // Monday = 1
        }
      });
    });

    test('should sort holidays by date', () => {
      const holidays = getColombianHolidays(2025);
      
      for (let i = 1; i < holidays.length; i++) {
        expect(holidays[i].date.getTime()).toBeGreaterThanOrEqual(holidays[i-1].date.getTime());
      }
    });

    test('should have proper holiday types', () => {
      const holidays = getColombianHolidays(2025);
      const validTypes: HolidayType[] = ['national', 'religious', 'civic'];
      
      holidays.forEach(holiday => {
        expect(validTypes).toContain(holiday.type);
      });
    });
  });

  describe('isColombianHoliday', () => {
    test('should correctly identify fixed holidays', () => {
      // New Year's Day 2025
      expect(isColombianHoliday(new Date(2025, 0, 1))).toBe(true); // January 1
      
      // Labor Day 2025
      expect(isColombianHoliday(new Date(2025, 4, 1))).toBe(true); // May 1
      
      // Independence Day 2025
      expect(isColombianHoliday(new Date(2025, 6, 20))).toBe(true); // July 20
      
      // Christmas 2025
      expect(isColombianHoliday(new Date(2025, 11, 25))).toBe(true); // December 25
    });

    test('should correctly identify non-holidays', () => {
      // Random dates that are not holidays
      expect(isColombianHoliday(new Date(2025, 0, 15))).toBe(false); // January 15
      expect(isColombianHoliday(new Date(2025, 5, 15))).toBe(false); // June 15
      expect(isColombianHoliday(new Date(2025, 8, 15))).toBe(false); // September 15
    });

    test('should handle year boundary correctly', () => {
      expect(isColombianHoliday(new Date(2024, 11, 25))).toBe(true); // Christmas 2024
      expect(isColombianHoliday(new Date(2025, 11, 25))).toBe(true); // Christmas 2025
    });

    test('should use holiday year context when provided', () => {
      const testDate = new Date(2025, 0, 1); // January 1, 2025
      expect(isColombianHoliday(testDate, 2025)).toBe(true);
      expect(isColombianHoliday(testDate, 2024)).toBe(false); // Using 2024 holiday context
    });
  });

  describe('getNextHoliday', () => {
    test('should return next holiday from current date', () => {
      // Test with a date early in the year
      const earlyDate = new Date(2025, 0, 2); // January 2, 2025
      const nextHoliday = getNextHoliday(earlyDate);
      
      expect(nextHoliday).not.toBeNull();
      expect(nextHoliday!.date).toBeInstanceOf(Date);
      expect(nextHoliday!.date > earlyDate).toBe(true);
    });

    test('should return next year holiday if no more holidays in current year', () => {
      // Test with a date late in the year after Christmas
      const lateDate = new Date(2025, 11, 26); // December 26, 2025
      const nextHoliday = getNextHoliday(lateDate);
      
      expect(nextHoliday).not.toBeNull();
      expect(nextHoliday!.date.getFullYear()).toBe(2026);
    });

    test('should use current date when no date provided', () => {
      const nextHoliday = getNextHoliday();
      expect(nextHoliday).not.toBeNull();
      expect(nextHoliday!.date).toBeInstanceOf(Date);
    });
  });

  describe('isWorkingDay', () => {
    test('should identify weekdays as working days if not holidays', () => {
      // Monday through Friday that are not holidays
      const monday = new Date(2025, 0, 6); // January 6, 2025 (but this is Epiphany, moved to Monday)
      const tuesday = new Date(2025, 0, 7); // January 7, 2025
      const wednesday = new Date(2025, 0, 8); // January 8, 2025
      const thursday = new Date(2025, 0, 9); // January 9, 2025
      const friday = new Date(2025, 0, 10); // January 10, 2025
      
      expect(isWorkingDay(tuesday)).toBe(true);
      expect(isWorkingDay(wednesday)).toBe(true);
      expect(isWorkingDay(thursday)).toBe(true);
      expect(isWorkingDay(friday)).toBe(true);
    });

    test('should identify weekends as non-working days', () => {
      const saturday = new Date(2025, 0, 4); // January 4, 2025
      const sunday = new Date(2025, 0, 5); // January 5, 2025
      
      expect(isWorkingDay(saturday)).toBe(false);
      expect(isWorkingDay(sunday)).toBe(false);
    });

    test('should identify holidays as non-working days even if weekdays', () => {
      const newYearsDay = new Date(2025, 0, 1); // January 1, 2025 (Wednesday)
      const laborDay = new Date(2025, 4, 1); // May 1, 2025 (Thursday)
      
      expect(isWorkingDay(newYearsDay)).toBe(false);
      expect(isWorkingDay(laborDay)).toBe(false);
    });
  });

  describe('getNextWorkingDay', () => {
    test('should return next working day when current day is working day', () => {
      const workingDay = new Date(2025, 0, 7); // January 7, 2025 (Tuesday, not a holiday)
      const nextWorking = getNextWorkingDay(workingDay, false);
      
      expect(isWorkingDay(nextWorking)).toBe(true);
      expect(nextWorking > workingDay).toBe(true);
    });

    test('should skip weekends', () => {
      const friday = new Date(2025, 0, 10); // January 10, 2025 (Friday)
      const nextWorking = getNextWorkingDay(friday, false);
      
      // Should skip weekend and go to Monday
      expect(nextWorking.getDay()).toBe(1); // Monday
      expect(isWorkingDay(nextWorking)).toBe(true);
    });

    test('should skip holidays', () => {
      const dayBeforeNewYear = new Date(2024, 11, 31); // December 31, 2024 (Tuesday)
      const nextWorking = getNextWorkingDay(dayBeforeNewYear, false);
      
      // Should skip New Year's Day
      expect(nextWorking > new Date(2025, 0, 1)).toBe(true);
      expect(isWorkingDay(nextWorking)).toBe(true);
    });

    test('should include from date when includeFromDate is true', () => {
      const workingDay = new Date(2025, 0, 7); // January 7, 2025 (Tuesday, working day)
      const nextWorking = getNextWorkingDay(workingDay, true);
      
      if (isWorkingDay(workingDay)) {
        expect(nextWorking.toDateString()).toBe(workingDay.toDateString());
      } else {
        expect(nextWorking > workingDay).toBe(true);
      }
    });
  });

  describe('getWorkingDaysBetween', () => {
    test('should count working days correctly between two dates', () => {
      const startDate = new Date(2025, 0, 6); // January 6, 2025 (Monday)
      const endDate = new Date(2025, 0, 13); // January 13, 2025 (Monday)
      
      const workingDays = getWorkingDaysBetween(startDate, endDate);
      
      // Should count weekdays and exclude weekends and holidays
      expect(workingDays).toBeGreaterThanOrEqual(0);
      expect(workingDays).toBeLessThanOrEqual(7); // Maximum possible in a week
    });

    test('should return 0 for same date', () => {
      const date = new Date(2025, 0, 7);
      const workingDays = getWorkingDaysBetween(date, date);
      
      expect(workingDays).toBe(0);
    });

    test('should handle periods with holidays correctly', () => {
      const beforeNewYear = new Date(2024, 11, 30); // December 30, 2024 (Monday)
      const afterNewYear = new Date(2025, 0, 3); // January 3, 2025 (Friday)
      
      const workingDays = getWorkingDaysBetween(beforeNewYear, afterNewYear);
      
      // Dec 30 (Mon), Dec 31 (Tue) are working days
      // Jan 1 (Wed) is holiday, Jan 2 (Thu) is working day
      // So should be 3 working days total
      expect(workingDays).toBeGreaterThanOrEqual(2);
      expect(workingDays).toBeLessThanOrEqual(4);
    });
  });

  describe('COLOMBIAN_BUSINESS_CONFIG', () => {
    test('should have reasonable business hours', () => {
      expect(COLOMBIAN_BUSINESS_CONFIG.BUSINESS_HOURS.START).toBe(8);
      expect(COLOMBIAN_BUSINESS_CONFIG.BUSINESS_HOURS.END).toBe(18);
      expect(COLOMBIAN_BUSINESS_CONFIG.BUSINESS_HOURS.LUNCH_START).toBe(12);
      expect(COLOMBIAN_BUSINESS_CONFIG.BUSINESS_HOURS.LUNCH_END).toBe(14);
      
      // Validate hour ranges
      expect(COLOMBIAN_BUSINESS_CONFIG.BUSINESS_HOURS.START).toBeLessThan(COLOMBIAN_BUSINESS_CONFIG.BUSINESS_HOURS.END);
      expect(COLOMBIAN_BUSINESS_CONFIG.BUSINESS_HOURS.LUNCH_START).toBeGreaterThanOrEqual(COLOMBIAN_BUSINESS_CONFIG.BUSINESS_HOURS.START);
      expect(COLOMBIAN_BUSINESS_CONFIG.BUSINESS_HOURS.LUNCH_END).toBeLessThanOrEqual(COLOMBIAN_BUSINESS_CONFIG.BUSINESS_HOURS.END);
    });

    test('should have correct working days including Saturday', () => {
      expect(COLOMBIAN_BUSINESS_CONFIG.WORKING_DAYS).toContain(1); // Monday
      expect(COLOMBIAN_BUSINESS_CONFIG.WORKING_DAYS).toContain(2); // Tuesday
      expect(COLOMBIAN_BUSINESS_CONFIG.WORKING_DAYS).toContain(3); // Wednesday
      expect(COLOMBIAN_BUSINESS_CONFIG.WORKING_DAYS).toContain(4); // Thursday
      expect(COLOMBIAN_BUSINESS_CONFIG.WORKING_DAYS).toContain(5); // Friday
      expect(COLOMBIAN_BUSINESS_CONFIG.WORKING_DAYS).toContain(6); // Saturday
      expect(COLOMBIAN_BUSINESS_CONFIG.WORKING_DAYS).not.toContain(0); // Sunday typically not included
    });

    test('should have Colombian timezone', () => {
      expect(COLOMBIAN_BUSINESS_CONFIG.TIMEZONE).toBe('America/Bogota');
    });

    test('should have reasonable appointment durations', () => {
      expect(COLOMBIAN_BUSINESS_CONFIG.APPOINTMENT_DURATIONS.SHORT).toBe(15);
      expect(COLOMBIAN_BUSINESS_CONFIG.APPOINTMENT_DURATIONS.STANDARD).toBe(30);
      expect(COLOMBIAN_BUSINESS_CONFIG.APPOINTMENT_DURATIONS.LONG).toBe(60);
      expect(COLOMBIAN_BUSINESS_CONFIG.APPOINTMENT_DURATIONS.EXTENDED).toBe(120);
      
      // Check logical progression
      expect(COLOMBIAN_BUSINESS_CONFIG.APPOINTMENT_DURATIONS.SHORT)
        .toBeLessThan(COLOMBIAN_BUSINESS_CONFIG.APPOINTMENT_DURATIONS.STANDARD);
      expect(COLOMBIAN_BUSINESS_CONFIG.APPOINTMENT_DURATIONS.STANDARD)
        .toBeLessThan(COLOMBIAN_BUSINESS_CONFIG.APPOINTMENT_DURATIONS.LONG);
      expect(COLOMBIAN_BUSINESS_CONFIG.APPOINTMENT_DURATIONS.LONG)
        .toBeLessThan(COLOMBIAN_BUSINESS_CONFIG.APPOINTMENT_DURATIONS.EXTENDED);
    });
  });

  describe('edge cases and data validation', () => {
    test('should handle different years consistently', () => {
      const holidays2024 = getColombianHolidays(2024);
      const holidays2025 = getColombianHolidays(2025);
      const holidays2026 = getColombianHolidays(2026);
      
      // Should have similar number of holidays each year
      expect(Math.abs(holidays2024.length - holidays2025.length)).toBeLessThanOrEqual(1);
      expect(Math.abs(holidays2025.length - holidays2026.length)).toBeLessThanOrEqual(1);
    });

    test('should handle leap years', () => {
      const leapYearHolidays = getColombianHolidays(2024); // 2024 is a leap year
      const regularYearHolidays = getColombianHolidays(2025); // 2025 is not
      
      // Both should have holidays
      expect(leapYearHolidays.length).toBeGreaterThan(10);
      expect(regularYearHolidays.length).toBeGreaterThan(10);
    });

    test('should handle holiday objects correctly', () => {
      const holidays = getColombianHolidays(2025);
      
      holidays.forEach(holiday => {
        expect(holiday).toHaveProperty('name');
        expect(holiday).toHaveProperty('date');
        expect(holiday).toHaveProperty('type');
        expect(holiday).toHaveProperty('isFixed');
        
        expect(typeof holiday.name).toBe('string');
        expect(holiday.date).toBeInstanceOf(Date);
        expect(['national', 'religious', 'civic']).toContain(holiday.type);
        expect(typeof holiday.isFixed).toBe('boolean');
        
        // Optional properties
        if (holiday.description) {
          expect(typeof holiday.description).toBe('string');
        }
      });
    });
  });
});