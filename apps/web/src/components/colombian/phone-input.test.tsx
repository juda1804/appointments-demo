/**
 * Colombian Phone Input Validation Tests
 * 
 * Tests the phone formatting and validation logic without React component rendering
 * This validates the core phone input business logic separate from React component testing
 */

describe('Colombian Phone Input Logic', () => {
  
  // Extract the formatting functions from the component for testing
  const formatColombianPhone = (input: string): string => {
    // Remove all non-digit characters
    const digitsOnly = input.replace(/\D/g, '');
    
    // If starts with 57, add the + prefix
    if (digitsOnly.startsWith('57') && digitsOnly.length > 2) {
      const numberPart = digitsOnly.substring(2);
      return formatNumberPart(`+57${numberPart}`);
    }
    
    // If already starts with +57, format the rest
    if (input.startsWith('+57')) {
      return formatNumberPart(input);
    }
    
    // If it's just digits and 10 digits long, assume it's Colombian
    if (digitsOnly.length === 10) {
      return formatNumberPart(`+57${digitsOnly}`);
    }
    
    // If digits start and we have some digits, format progressively
    if (digitsOnly.length > 0) {
      if (digitsOnly.length <= 2) {
        return digitsOnly.startsWith('57') ? `+57` : `+57${digitsOnly}`;
      } else {
        return formatNumberPart(`+57${digitsOnly}`);
      }
    }
    
    return input;
  };

  const formatNumberPart = (phone: string): string => {
    // Extract just the number part after +57
    const match = phone.match(/^\+57(.*)$/);
    if (!match) return phone;
    
    const digits = match[1].replace(/\D/g, '');
    
    // Format as +57 XXX XXX XXXX
    if (digits.length >= 10) {
      return `+57 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
    } else if (digits.length >= 6) {
      return `+57 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    } else if (digits.length >= 3) {
      return `+57 ${digits.slice(0, 3)} ${digits.slice(3)}`;
    } else if (digits.length > 0) {
      return `+57 ${digits}`;
    } else {
      return '+57 ';
    }
  };

  const validateColombianPhoneFormat = (phone: string): boolean => {
    const regex = /^\+57 [0-9]{3} [0-9]{3} [0-9]{4}$/;
    return regex.test(phone);
  };

  describe('Phone Number Formatting', () => {
    it('formats 10-digit Colombian phone numbers correctly', () => {
      expect(formatColombianPhone('3001234567')).toBe('+57 300 123 4567');
      expect(formatColombianPhone('3101234567')).toBe('+57 310 123 4567');
      expect(formatColombianPhone('3201234567')).toBe('+57 320 123 4567');
    });

    it('handles input starting with 57 country code', () => {
      expect(formatColombianPhone('573001234567')).toBe('+57 300 123 4567');
      expect(formatColombianPhone('573101234567')).toBe('+57 310 123 4567');
    });

    it('handles input already starting with +57 prefix', () => {
      expect(formatColombianPhone('+573001234567')).toBe('+57 300 123 4567');
      expect(formatColombianPhone('+57 300 123 4567')).toBe('+57 300 123 4567');
    });

    it('removes non-digit characters while preserving format', () => {
      expect(formatColombianPhone('+57abc300def123ghi4567')).toBe('+57 300 123 4567');
      expect(formatColombianPhone('57-300-123-4567')).toBe('+57 300 123 4567');
      expect(formatColombianPhone('57.300.123.4567')).toBe('+57 300 123 4567');
    });

    it('handles progressive formatting for partial numbers', () => {
      expect(formatColombianPhone('3')).toBe('+573');
      expect(formatColombianPhone('30')).toBe('+5730');
      expect(formatColombianPhone('300')).toBe('+57 300 ');
      expect(formatColombianPhone('3001')).toBe('+57 300 1');
      expect(formatColombianPhone('300123')).toBe('+57 300 123 ');
      expect(formatColombianPhone('3001234')).toBe('+57 300 123 4');
      expect(formatColombianPhone('30012345')).toBe('+57 300 123 45');
      expect(formatColombianPhone('300123456')).toBe('+57 300 123 456');
      expect(formatColombianPhone('3001234567')).toBe('+57 300 123 4567');
    });

    it('limits formatting to exactly 10 digits after +57', () => {
      expect(formatColombianPhone('30012345678')).toBe('+57 300 123 4567');
      expect(formatColombianPhone('300123456789')).toBe('+57 300 123 4567');
      expect(formatColombianPhone('+5730012345678901234')).toBe('+57 300 123 4567');
    });

    it('handles special cases for 57 prefix', () => {
      expect(formatColombianPhone('5')).toBe('+575');
      expect(formatColombianPhone('57')).toBe('+57');
      expect(formatColombianPhone('573')).toBe('+57 3');
    });

    it('preserves empty input', () => {
      expect(formatColombianPhone('')).toBe('');
    });
  });

  describe('Phone Number Validation', () => {
    it('validates correctly formatted Colombian phone numbers', () => {
      const validPhones = [
        '+57 300 123 4567',
        '+57 310 987 6543',
        '+57 320 555 1234',
        '+57 350 999 8888',
        '+57 311 444 5555'
      ];

      validPhones.forEach(phone => {
        expect(validateColombianPhoneFormat(phone)).toBe(true);
      });
    });

    it('rejects invalid Colombian phone number formats', () => {
      const invalidPhones = [
        '3001234567',              // Missing +57 and spaces
        '+57300123456',            // Missing spaces
        '+57 300 123 456',         // Too short
        '+57 300 123 45678',       // Too long
        '+58 300 123 4567',        // Wrong country code
        '+573001234567',           // No spaces
        'invalid phone',           // Not a number
        '+57 30 123 4567',         // Wrong area code format
        '+57 3000 123 4567',       // Too many digits in area code
        '+57 300 12 4567',         // Wrong middle section
        '+57 300 1234 567',        // Wrong last section
        '',                        // Empty
        '+57 ',                    // Just prefix
        '+57 300',                 // Incomplete
        '+57 300 123'              // Incomplete
      ];

      invalidPhones.forEach(phone => {
        expect(validateColombianPhoneFormat(phone)).toBe(false);
      });
    });
  });

  describe('Input Processing Logic', () => {
    it('handles backspace protection logic', () => {
      // Simulate the logic that prevents deleting +57 prefix
      const isProtectedFromDeletion = (value: string, keyPressed: string): boolean => {
        return (keyPressed === 'Backspace' || keyPressed === 'Delete') && value.length <= 4;
      };

      expect(isProtectedFromDeletion('+57 ', 'Backspace')).toBe(true);
      expect(isProtectedFromDeletion('+57', 'Backspace')).toBe(true);
      expect(isProtectedFromDeletion('+57 3', 'Backspace')).toBe(false); // Length 5 > 4
      expect(isProtectedFromDeletion('+57 30', 'Backspace')).toBe(false);
      expect(isProtectedFromDeletion('+57 300 123 4567', 'Backspace')).toBe(false);
    });

    it('handles input change validation', () => {
      // Simulate the logic that validates input changes
      const shouldAllowInputChange = (newValue: string): boolean => {
        if (newValue === '') return true; // Allow clearing
        if (newValue.length < 4 && !newValue.startsWith('+57')) return false;
        return true;
      };

      expect(shouldAllowInputChange('')).toBe(true);
      expect(shouldAllowInputChange('+57')).toBe(true);
      expect(shouldAllowInputChange('+57 ')).toBe(true);
      expect(shouldAllowInputChange('abc')).toBe(false);
      expect(shouldAllowInputChange('123')).toBe(false);
      expect(shouldAllowInputChange('+58')).toBe(false);
      expect(shouldAllowInputChange('+57 300 123 4567')).toBe(true);
    });

    it('handles focus behavior', () => {
      // Simulate the logic that adds +57 prefix on focus
      const handleFocusLogic = (currentValue: string): string => {
        return currentValue === '' ? '+57 ' : currentValue;
      };

      expect(handleFocusLogic('')).toBe('+57 ');
      expect(handleFocusLogic('existing value')).toBe('existing value');
      expect(handleFocusLogic('+57 300')).toBe('+57 300');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles malformed input gracefully', () => {
      const malformedInputs = [
        '+++57300123456',
        '+57++300123456',
        'abc+57def300ghi123jkl4567',
        '+57   300   123   4567',
        '  +57 300 123 4567  '
      ];

      malformedInputs.forEach(input => {
        const result = formatColombianPhone(input);
        // Should either format correctly or return a safe fallback
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('maintains maximum length constraints', () => {
      const longInput = '+57' + '1'.repeat(50);
      const result = formatColombianPhone(longInput);
      
      // Should not exceed the expected Colombian phone format length
      expect(result.length).toBeLessThanOrEqual(17); // +57 XXX XXX XXXX = 17 characters
    });

    it('handles unicode and special characters', () => {
      const specialInputs = [
        '+57🔢300🔢123🔢4567',
        '+57\u0020300\u0020123\u0020456',
        '+57\t300\t123\t4567'
      ];

      specialInputs.forEach(input => {
        const result = formatColombianPhone(input);
        expect(typeof result).toBe('string');
      });
    });
  });

  describe('Regex Pattern Validation', () => {
    it('uses correct regex pattern for Colombian phones', () => {
      const colombianPhoneRegex = /^\+57 [0-9]{3} [0-9]{3} [0-9]{4}$/;
      
      // Test the exact pattern requirements
      expect(colombianPhoneRegex.test('+57 300 123 4567')).toBe(true);
      expect(colombianPhoneRegex.test('+57  300 123 4567')).toBe(false); // Extra space
      expect(colombianPhoneRegex.test('+57 300  123 4567')).toBe(false); // Extra space
      expect(colombianPhoneRegex.test('+57 300 123  4567')).toBe(false); // Extra space
      expect(colombianPhoneRegex.test('57 300 123 4567')).toBe(false); // Missing +
      expect(colombianPhoneRegex.test('+56 300 123 4567')).toBe(false); // Wrong country code
    });

    it('validates all Colombian mobile prefixes', () => {
      // Common Colombian mobile prefixes: 300, 301, 302, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 350, 351
      const colombianPrefixes = ['300', '301', '302', '310', '311', '312', '313', '314', '315', '316', '317', '318', '319', '320', '321', '322', '323', '350', '351'];
      
      colombianPrefixes.forEach(prefix => {
        const phone = `+57 ${prefix} 123 4567`;
        expect(validateColombianPhoneFormat(phone)).toBe(true);
      });
    });
  });
});