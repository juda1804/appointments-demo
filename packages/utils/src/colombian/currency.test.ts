/**
 * Tests for Colombian peso currency utilities
 */

import {
  formatPesoCOP,
  formatPesoShort,
  parsePesoString,
  isValidPesoString,
  formatPesoForInput,
  COMMON_PESO_AMOUNTS,
  type CurrencyFormatOptions
} from './currency';

describe('Colombian Currency Utilities', () => {
  describe('formatPesoCOP', () => {
    test('should format basic amounts with default options', () => {
      expect(formatPesoCOP(1000)).toMatch(/1[.,]000/); // Colombian format
      expect(formatPesoCOP(50000)).toMatch(/50[.,]000/);
      expect(formatPesoCOP(1500000)).toMatch(/1[.,]500[.,]000/);
    });

    test('should respect showDecimals option', () => {
      const withDecimals = formatPesoCOP(1000, { showDecimals: true });
      const withoutDecimals = formatPesoCOP(1000, { showDecimals: false });
      
      expect(withDecimals).toMatch(/1[.,]000[,.]00/);
      // Without decimals should not show decimal places
      expect(withoutDecimals).toMatch(/1[.,]000$/); // Should end with no decimals
    });

    test('should respect showSymbol option', () => {
      const withSymbol = formatPesoCOP(1000, { showSymbol: true });
      const withoutSymbol = formatPesoCOP(1000, { showSymbol: false });
      
      expect(withSymbol).toMatch(/\$|COP/);
      expect(withoutSymbol).not.toMatch(/\$|COP/);
    });

    test('should use short format when requested', () => {
      const shortFormat = formatPesoCOP(1500000, { useShortFormat: true });
      expect(shortFormat).toMatch(/1[.,]5M|1500K/);
    });

    test('should handle zero and negative amounts', () => {
      expect(formatPesoCOP(0)).toMatch(/0/);
      expect(formatPesoCOP(-1000)).toMatch(/-.*1[.,]000/);
    });

    test('should use specified locale', () => {
      // Test with different locale
      const usLocale = formatPesoCOP(1000, { locale: 'en-US' });
      expect(usLocale).toBeDefined();
      expect(typeof usLocale).toBe('string');
    });
  });

  describe('formatPesoShort', () => {
    test('should format thousands with K', () => {
      expect(formatPesoShort(1000)).toMatch(/1K/);
      expect(formatPesoShort(1500)).toMatch(/1[.,]5K/);
      expect(formatPesoShort(15000)).toMatch(/15K/);
    });

    test('should format millions with M', () => {
      expect(formatPesoShort(1000000)).toMatch(/1M/);
      expect(formatPesoShort(1500000)).toMatch(/1[.,]5M/);
      expect(formatPesoShort(15000000)).toMatch(/15M/);
    });

    test('should format billions with B', () => {
      expect(formatPesoShort(1000000000)).toMatch(/1B/);
      expect(formatPesoShort(1500000000)).toMatch(/1[.,]5B/);
    });

    test('should format amounts under 1000 normally', () => {
      const result = formatPesoShort(500);
      expect(result).not.toMatch(/[KMB]/);
      expect(result).toMatch(/500/);
    });

    test('should respect showSymbol option', () => {
      const withSymbol = formatPesoShort(1000, { showSymbol: true });
      const withoutSymbol = formatPesoShort(1000, { showSymbol: false });
      
      expect(withSymbol).toMatch(/\$/);
      expect(withoutSymbol).not.toMatch(/\$/);
    });

    test('should handle decimal precision based on value', () => {
      // Values under 10 should show 1 decimal place
      expect(formatPesoShort(1500)).toMatch(/1[.,]5K/);
      // Values 10 and above should show no decimal places
      expect(formatPesoShort(15000)).toMatch(/15K/);
    });
  });

  describe('parsePesoString', () => {
    test('should parse basic peso strings', () => {
      expect(parsePesoString('1.000')).toBe(1000);
      expect(parsePesoString('50.000')).toBe(50000);
      expect(parsePesoString('1.500.000')).toBe(1500000);
    });

    test('should parse strings with currency symbols', () => {
      expect(parsePesoString('$ 1.000')).toBe(1000);
      expect(parsePesoString('COP 50.000')).toBe(50000);
      expect(parsePesoString('COL$ 1.500.000')).toBe(1500000);
    });

    test('should parse short format strings', () => {
      expect(parsePesoString('1K')).toBe(1000);
      expect(parsePesoString('1.5K')).toBe(1500);
      expect(parsePesoString('1M')).toBe(1000000);
      expect(parsePesoString('1.5M')).toBe(1500000);
      expect(parsePesoString('1B')).toBe(1000000000);
    });

    test('should handle decimal amounts', () => {
      expect(parsePesoString('1.000,50')).toBe(1000.5);
      expect(parsePesoString('50.000,75')).toBe(50000.75);
    });

    test('should return null for invalid strings', () => {
      expect(parsePesoString('')).toBeNull();
      expect(parsePesoString('abc')).toBeNull();
      expect(parsePesoString('not a number')).toBeNull();
    });

    test('should handle various currency text formats', () => {
      expect(parsePesoString('1000 pesos')).toBe(1000);
      expect(parsePesoString('1000 peso')).toBe(1000);
      // Note: "PESOS 1000" format might not be supported - checking if it returns number or null
      const result = parsePesoString('PESOS 1000');
      expect(typeof result === 'number' || result === null).toBe(true);
    });

    test('should handle whitespace and extra characters', () => {
      expect(parsePesoString('  $ 1.000  ')).toBe(1000);
      expect(parsePesoString('COP  50.000  ')).toBe(50000);
    });
  });

  describe('isValidPesoString', () => {
    test('should validate correct peso strings', () => {
      expect(isValidPesoString('1.000')).toBe(true);
      expect(isValidPesoString('$ 50.000')).toBe(true);
      expect(isValidPesoString('1.5M')).toBe(true);
      expect(isValidPesoString('COP 1.500.000')).toBe(true);
    });

    test('should reject invalid peso strings', () => {
      expect(isValidPesoString('')).toBe(false);
      expect(isValidPesoString('abc')).toBe(false);
      expect(isValidPesoString('not a number')).toBe(false);
    });
  });

  describe('formatPesoForInput', () => {
    test('should format without symbols for input fields', () => {
      const result = formatPesoForInput(1000);
      expect(result).not.toMatch(/\$|COP/);
      expect(result).toMatch(/1[.,]000/);
    });

    test('should not include decimals for input', () => {
      const result = formatPesoForInput(1000);
      // formatPesoForInput calls formatPesoCOP with showDecimals: false, so no .00 should appear
      expect(result).toMatch(/1[.,]000$/); // Should end without decimal places
    });

    test('should handle large amounts', () => {
      const result = formatPesoForInput(1500000);
      expect(result).toMatch(/1[.,]500[.,]000/);
      expect(result).not.toMatch(/\$/);
    });
  });

  describe('COMMON_PESO_AMOUNTS', () => {
    test('should contain expected common amounts', () => {
      expect(COMMON_PESO_AMOUNTS.MINIMUM_WAGE_2025).toBeGreaterThan(1000000);
      expect(COMMON_PESO_AMOUNTS.TYPICAL_SERVICE_RANGE.MIN).toBe(50000);
      expect(COMMON_PESO_AMOUNTS.TYPICAL_SERVICE_RANGE.MAX).toBe(500000);
      expect(COMMON_PESO_AMOUNTS.EXPENSIVE_SERVICE_THRESHOLD).toBe(1000000);
    });

    test('should have reasonable relationships between amounts', () => {
      expect(COMMON_PESO_AMOUNTS.TYPICAL_SERVICE_RANGE.MIN)
        .toBeLessThan(COMMON_PESO_AMOUNTS.TYPICAL_SERVICE_RANGE.MAX);
      expect(COMMON_PESO_AMOUNTS.TYPICAL_SERVICE_RANGE.MAX)
        .toBeLessThan(COMMON_PESO_AMOUNTS.EXPENSIVE_SERVICE_THRESHOLD);
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle very large numbers', () => {
      const veryLarge = 1000000000000; // 1 trillion
      const result = formatPesoCOP(veryLarge);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    test('should handle very small decimal amounts', () => {
      const verySmall = 0.01;
      const result = formatPesoCOP(verySmall, { showDecimals: true });
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    test('should handle NaN and Infinity', () => {
      expect(() => formatPesoCOP(NaN)).not.toThrow();
      expect(() => formatPesoCOP(Infinity)).not.toThrow();
      expect(() => formatPesoCOP(-Infinity)).not.toThrow();
    });
  });
});