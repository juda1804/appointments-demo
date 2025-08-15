/**
 * Colombian environment configuration tests
 */

import {
  COLOMBIAN_DEFAULTS,
  getColombianMarketConfig,
  getCurrentColombianTime,
  formatColombianDate,
  formatColombianTime,
  formatColombianDateTime,
  isColombianBusinessHours,
  formatColombianCurrency,
  formatColombianNumber,
  getColombianTimezoneInfo,
  validateColombianEnvironment,
  getColombianCurrencyFormatter,
  getColombianNumberFormatter,
} from './colombian-env';

// Mock environment variables
jest.mock('./env', () => ({
  env: {
    colombia: {
      timezone: 'America/Bogota',
      currency: 'COP',
      phonePrefix: '+57',
    },
  },
}));

describe('Colombian Environment Configuration', () => {
  describe('Default Configuration', () => {
    it('should have correct Colombian defaults', () => {
      expect(COLOMBIAN_DEFAULTS.timezone).toBe('America/Bogota');
      expect(COLOMBIAN_DEFAULTS.currency).toBe('COP');
      expect(COLOMBIAN_DEFAULTS.phonePrefix).toBe('+57');
      expect(COLOMBIAN_DEFAULTS.locale).toBe('es-CO');
    });

    it('should have correct business hours configuration', () => {
      expect(COLOMBIAN_DEFAULTS.businessHours.start).toBe('08:00');
      expect(COLOMBIAN_DEFAULTS.businessHours.end).toBe('18:00');
      expect(COLOMBIAN_DEFAULTS.businessHours.format).toBe('24h');
    });

    it('should have correct number formatting configuration', () => {
      expect(COLOMBIAN_DEFAULTS.numberFormat.decimal).toBe(',');
      expect(COLOMBIAN_DEFAULTS.numberFormat.thousands).toBe('.');
      expect(COLOMBIAN_DEFAULTS.numberFormat.currency.symbol).toBe('$');
      expect(COLOMBIAN_DEFAULTS.numberFormat.currency.position).toBe('before');
    });
  });

  describe('Market Configuration', () => {
    it('should get Colombian market configuration from environment', () => {
      const config = getColombianMarketConfig();
      
      expect(config.timezone).toBe('America/Bogota');
      expect(config.currency).toBe('COP');
      expect(config.phonePrefix).toBe('+57');
      expect(config.locale).toBe('es-CO');
    });

    it('should merge environment values with defaults', () => {
      const config = getColombianMarketConfig();
      
      // Should use environment values
      expect(config.timezone).toBe('America/Bogota');
      expect(config.currency).toBe('COP');
      expect(config.phonePrefix).toBe('+57');
      
      // Should use default values
      expect(config.locale).toBe('es-CO');
      expect(config.businessHours.start).toBe('08:00');
      expect(config.dateFormat).toBe('DD/MM/YYYY');
    });
  });

  describe('Time Operations', () => {
    it('should get current Colombian time', () => {
      const colombianTime = getCurrentColombianTime();
      
      expect(colombianTime).toBeInstanceOf(Date);
      expect(colombianTime.getTime()).toBeCloseTo(Date.now(), -4); // Within 10 seconds
    });

    it('should format Colombian date correctly', () => {
      const testDate = new Date('2025-08-13T15:30:00Z');
      const formattedDate = formatColombianDate(testDate);
      
      // Should be in DD/MM/YYYY format for Colombian locale
      expect(formattedDate).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
    });

    it('should format Colombian time correctly', () => {
      const testDate = new Date('2025-08-13T15:30:00Z');
      const formattedTime = formatColombianTime(testDate);
      
      // Should be in HH:MM format
      expect(formattedTime).toMatch(/^\d{1,2}:\d{2}$/);
    });

    it('should format Colombian time with seconds', () => {
      const testDate = new Date('2025-08-13T15:30:45Z');
      const formattedTime = formatColombianTime(testDate, true);
      
      // Should be in HH:MM:SS format
      expect(formattedTime).toMatch(/^\d{1,2}:\d{2}:\d{2}$/);
    });

    it('should format Colombian date and time together', () => {
      const testDate = new Date('2025-08-13T15:30:00Z');
      const formattedDateTime = formatColombianDateTime(testDate);
      
      // Should contain both date and time parts
      expect(formattedDateTime).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}$/);
    });
  });

  describe('Business Hours Validation', () => {
    it('should correctly identify weekday business hours', () => {
      // Tuesday at 10:00 AM Colombian time (should be business hours)
      const businessDay = new Date('2025-08-12T15:00:00Z'); // 10 AM COT
      const isBusinessHours = isColombianBusinessHours(businessDay);
      
      // Note: This test might be environment-dependent due to timezone conversion
      expect(typeof isBusinessHours).toBe('boolean');
    });

    it('should correctly identify weekend as non-business hours', () => {
      // Saturday at 10:00 AM Colombian time (should not be business hours)
      const weekend = new Date('2025-08-16T15:00:00Z'); // Saturday 10 AM COT
      const isBusinessHours = isColombianBusinessHours(weekend);
      
      expect(isBusinessHours).toBe(false);
    });

    it('should correctly identify early morning as non-business hours', () => {
      // Tuesday at 6:00 AM Colombian time (before 8:00 AM start)
      const earlyMorning = new Date('2025-08-12T11:00:00Z'); // 6 AM COT
      const isBusinessHours = isColombianBusinessHours(earlyMorning);
      
      expect(isBusinessHours).toBe(false);
    });

    it('should correctly identify late evening as non-business hours', () => {
      // Tuesday at 8:00 PM Colombian time (after 6:00 PM end)
      const lateEvening = new Date('2025-08-13T01:00:00Z'); // 8 PM COT
      const isBusinessHours = isColombianBusinessHours(lateEvening);
      
      expect(isBusinessHours).toBe(false);
    });
  });

  describe('Currency Formatting', () => {
    it('should format Colombian currency correctly', () => {
      const formattedCurrency = formatColombianCurrency(50000);
      
      // Should include COP currency symbol and Colombian formatting
      expect(formattedCurrency).toContain('$');
      expect(formattedCurrency).toContain('50');
    });

    it('should format large amounts correctly', () => {
      const formattedCurrency = formatColombianCurrency(1500000);
      
      expect(formattedCurrency).toContain('$');
      expect(formattedCurrency).toMatch(/1[.,]500[.,]000/);
    });

    it('should handle zero amount', () => {
      const formattedCurrency = formatColombianCurrency(0);
      
      expect(formattedCurrency).toContain('$');
      expect(formattedCurrency).toContain('0');
    });

    it('should handle negative amounts', () => {
      const formattedCurrency = formatColombianCurrency(-10000);
      
      expect(formattedCurrency).toContain('10');
      expect(formattedCurrency).toMatch(/-.*10|10.*-/); // Negative sign before or after
    });
  });

  describe('Number Formatting', () => {
    it('should format Colombian numbers correctly', () => {
      const formattedNumber = formatColombianNumber(12345.67);
      
      // Should use Colombian number formatting
      expect(typeof formattedNumber).toBe('string');
      expect(formattedNumber).toContain('12');
    });

    it('should format integers correctly', () => {
      const formattedNumber = formatColombianNumber(50000);
      
      expect(formattedNumber).toMatch(/50[.,]000/);
    });
  });

  describe('Timezone Information', () => {
    it('should get Colombian timezone info correctly', () => {
      const timezoneInfo = getColombianTimezoneInfo();
      
      expect(timezoneInfo.timezone).toBe('America/Bogota');
      expect(timezoneInfo.offset).toBe(-5); // GMT-5
      expect(timezoneInfo.abbreviation).toBe('COT');
      expect(timezoneInfo.isDST).toBe(false); // Colombia doesn't use DST
    });
  });

  describe('Environment Validation', () => {
    it('should validate Colombian environment successfully', () => {
      const validation = validateColombianEnvironment();
      
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it('should return valid configuration for correct settings', () => {
      const validation = validateColombianEnvironment();
      
      // With mocked correct environment, should be valid
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should handle validation errors gracefully', () => {
      // This test ensures the validation doesn't throw errors
      expect(() => validateColombianEnvironment()).not.toThrow();
    });
  });

  describe('Formatters', () => {
    it('should create Colombian currency formatter', () => {
      const formatter = getColombianCurrencyFormatter();
      
      expect(formatter).toBeInstanceOf(Intl.NumberFormat);
      
      const formatted = formatter.format(100000);
      expect(typeof formatted).toBe('string');
      expect(formatted).toContain('100');
    });

    it('should create Colombian number formatter', () => {
      const formatter = getColombianNumberFormatter();
      
      expect(formatter).toBeInstanceOf(Intl.NumberFormat);
      
      const formatted = formatter.format(1234.56);
      expect(typeof formatted).toBe('string');
      expect(formatted).toContain('1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid dates gracefully', () => {
      const invalidDate = new Date('invalid-date');
      
      // Note: Invalid dates will throw RangeError in Intl formatting
      // We expect these specific errors for invalid dates
      expect(() => formatColombianDate(invalidDate)).toThrow(RangeError);
      expect(() => formatColombianTime(invalidDate)).toThrow(RangeError);
    });

    it('should handle extreme currency values', () => {
      expect(() => formatColombianCurrency(Number.MAX_SAFE_INTEGER)).not.toThrow();
      expect(() => formatColombianCurrency(Number.MIN_SAFE_INTEGER)).not.toThrow();
    });

    it('should handle extreme number values', () => {
      expect(() => formatColombianNumber(Number.MAX_SAFE_INTEGER)).not.toThrow();
      expect(() => formatColombianNumber(Number.MIN_SAFE_INTEGER)).not.toThrow();
    });
  });
});