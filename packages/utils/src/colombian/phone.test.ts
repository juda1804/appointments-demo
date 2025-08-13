/**
 * Tests for Colombian phone number utilities
 */

import {
  formatColombianPhone,
  validateColombianPhone,
  getColombianMobileNumber,
  formatPhoneForDisplay
} from './phone';

describe('Colombian Phone Utilities', () => {
  describe('formatColombianPhone', () => {
    test('should format 10-digit local number correctly', () => {
      expect(formatColombianPhone('3012345678')).toBe('+57 301 234 5678');
      expect(formatColombianPhone('3201234567')).toBe('+57 320 123 4567');
      expect(formatColombianPhone('3501234567')).toBe('+57 350 123 4567');
    });

    test('should format 12-digit international number without plus', () => {
      expect(formatColombianPhone('573012345678')).toBe('+57 301 234 5678');
      expect(formatColombianPhone('573201234567')).toBe('+57 320 123 4567');
    });

    test('should format 13-digit international number with leading zero', () => {
      expect(formatColombianPhone('05573012345678')).toBe('+57 301 234 5678');
    });

    test('should handle numbers with spaces and separators', () => {
      expect(formatColombianPhone('301 234 5678')).toBe('+57 301 234 5678');
      expect(formatColombianPhone('301-234-5678')).toBe('+57 301 234 5678');
      expect(formatColombianPhone('(301) 234-5678')).toBe('+57 301 234 5678');
    });

    test('should return null for invalid lengths', () => {
      expect(formatColombianPhone('123456789')).toBeNull(); // 9 digits
      expect(formatColombianPhone('12345678901')).toBeNull(); // 11 digits
      expect(formatColombianPhone('')).toBeNull(); // empty
    });

    test('should return null for invalid Colombian prefixes', () => {
      expect(formatColombianPhone('2012345678')).toBeNull(); // Invalid prefix
      expect(formatColombianPhone('4001234567')).toBeNull(); // Invalid prefix
      expect(formatColombianPhone('1234567890')).toBeNull(); // Invalid prefix
    });

    test('should handle valid Colombian prefixes', () => {
      // 301-305 range (Comcel/Tigo)
      expect(formatColombianPhone('3012345678')).toBe('+57 301 234 5678');
      expect(formatColombianPhone('3052345678')).toBe('+57 305 234 5678');
      
      // 310-321 range (Movistar/Claro)
      expect(formatColombianPhone('3102345678')).toBe('+57 310 234 5678');
      expect(formatColombianPhone('3212345678')).toBe('+57 321 234 5678');
      
      // 350-353 range (Avantel)
      expect(formatColombianPhone('3502345678')).toBe('+57 350 234 5678');
      expect(formatColombianPhone('3532345678')).toBe('+57 353 234 5678');
    });
  });

  describe('validateColombianPhone', () => {
    test('should validate correct format with valid prefixes', () => {
      expect(validateColombianPhone('+57 301 234 5678')).toBe(true);
      expect(validateColombianPhone('+57 310 123 4567')).toBe(true);
      expect(validateColombianPhone('+57 350 987 6543')).toBe(true);
    });

    test('should reject incorrect format', () => {
      expect(validateColombianPhone('301 234 5678')).toBe(false); // Missing +57
      expect(validateColombianPhone('+57-301-234-5678')).toBe(false); // Wrong separators
      expect(validateColombianPhone('+573012345678')).toBe(false); // No spaces
      expect(validateColombianPhone('+57 3012345678')).toBe(false); // Wrong spacing
    });

    test('should reject invalid prefixes even with correct format', () => {
      expect(validateColombianPhone('+57 200 234 5678')).toBe(false);
      expect(validateColombianPhone('+57 400 234 5678')).toBe(false);
      expect(validateColombianPhone('+57 309 234 5678')).toBe(false); // 309 not in valid range
      expect(validateColombianPhone('+57 322 234 5678')).toBe(false); // 322 not in valid range
    });

    test('should handle empty or null input', () => {
      expect(validateColombianPhone('')).toBe(false);
      expect(validateColombianPhone(' ')).toBe(false);
    });
  });

  describe('getColombianMobileNumber', () => {
    test('should extract mobile number from valid formatted phone', () => {
      expect(getColombianMobileNumber('+57 301 234 5678')).toBe('3012345678');
      expect(getColombianMobileNumber('+57 320 123 4567')).toBe('3201234567');
    });

    test('should return null for invalid phone numbers', () => {
      expect(getColombianMobileNumber('301 234 5678')).toBeNull(); // Invalid format
      expect(getColombianMobileNumber('+57 200 234 5678')).toBeNull(); // Invalid prefix
      expect(getColombianMobileNumber('')).toBeNull(); // Empty
    });
  });

  describe('formatPhoneForDisplay', () => {
    test('should format with country code by default', () => {
      expect(formatPhoneForDisplay('3012345678')).toBe('+57 301 234 5678');
      expect(formatPhoneForDisplay('3012345678', true)).toBe('+57 301 234 5678');
    });

    test('should format without country code when requested', () => {
      expect(formatPhoneForDisplay('3012345678', false)).toBe('301 234 5678');
      expect(formatPhoneForDisplay('3201234567', false)).toBe('320 123 4567');
    });

    test('should return null for invalid numbers', () => {
      expect(formatPhoneForDisplay('1234567890')).toBeNull(); // Invalid prefix
      expect(formatPhoneForDisplay('12345')).toBeNull(); // Too short
      expect(formatPhoneForDisplay('')).toBeNull(); // Empty
    });

    test('should handle various input formats', () => {
      expect(formatPhoneForDisplay('573012345678')).toBe('+57 301 234 5678');
      expect(formatPhoneForDisplay('301-234-5678', false)).toBe('301 234 5678');
      expect(formatPhoneForDisplay('(301) 234-5678')).toBe('+57 301 234 5678');
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle whitespace and special characters', () => {
      expect(formatColombianPhone(' 301 234 5678 ')).toBe('+57 301 234 5678');
      expect(formatColombianPhone('301.234.5678')).toBe('+57 301 234 5678');
      expect(formatColombianPhone('301_234_5678')).toBe('+57 301 234 5678');
    });

    test('should handle very long or very short inputs gracefully', () => {
      expect(formatColombianPhone('1')).toBeNull();
      expect(formatColombianPhone('12345678901234567890')).toBeNull();
    });

    test('should handle non-numeric input', () => {
      expect(formatColombianPhone('abcdefghij')).toBeNull();
      expect(formatColombianPhone('301abc5678')).toBeNull();
    });
  });
});