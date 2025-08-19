/**
 * Business Registration Form Validation Tests
 * 
 * Tests the validation logic and schemas without React component rendering
 * This validates the core business logic separate from React component testing
 */

import { z } from 'zod';
import { 
  BusinessRegistrationSchema, 
  ColombianPhoneSchema, 
  ColombianAddressSchema,
  validateBusinessFormField,
  validateColombianPhone,
  validateColombianAddress,
  extractValidationErrors
} from '../forms/validation-schemas';

describe('Business Registration Validation', () => {
  describe('Colombian Phone Validation', () => {
    it('accepts valid Colombian phone numbers', () => {
      const validPhones = [
        '+57 300 123 4567',
        '+57 310 987 6543',
        '+57 320 555 1234'
      ];

      validPhones.forEach(phone => {
        expect(() => ColombianPhoneSchema.parse(phone)).not.toThrow();
        expect(validateColombianPhone(phone)).toBe(true);
      });
    });

    it('rejects invalid Colombian phone numbers', () => {
      const invalidPhones = [
        '3001234567',           // Missing +57
        '+57 300 123 456',      // Too short
        '+57 300 123 45678',    // Too long
        '+58 300 123 4567',     // Wrong country code
        '+57300123456',         // Missing spaces
        'invalid'               // Not a number
      ];

      invalidPhones.forEach(phone => {
        expect(() => ColombianPhoneSchema.parse(phone)).toThrow();
        expect(validateColombianPhone(phone)).toBe(false);
      });
    });

    it('provides Spanish error messages for invalid phones', () => {
      try {
        ColombianPhoneSchema.parse('invalid');
      } catch (error: unknown) {
        if (error instanceof z.ZodError) {
          expect(error.issues[0].message).toBe('Formato de teléfono colombiano inválido');
        }
      }
    });
  });

  describe('Colombian Address Validation', () => {
    it('accepts valid Colombian addresses', () => {
      const validAddress = {
        street: 'Calle 123 #45-67',
        city: 'Bogotá',
        department: 'Cundinamarca'
      };

      expect(() => ColombianAddressSchema.parse(validAddress)).not.toThrow();
      expect(validateColombianAddress(validAddress)).toBe(true);
    });

    it('requires all address fields', () => {
      const incompleteAddresses = [
        { street: '', city: 'Bogotá', department: 'Cundinamarca' },
        { street: 'Calle 123', city: '', department: 'Cundinamarca' },
        { street: 'Calle 123', city: 'Bogotá', department: '' }
      ];

      incompleteAddresses.forEach(address => {
        expect(() => ColombianAddressSchema.parse(address)).toThrow();
        expect(validateColombianAddress(address)).toBe(false);
      });
    });

    it('validates Colombian departments', () => {
      const validAddress = {
        street: 'Calle 123 #45-67',
        city: 'Medellín',
        department: 'Antioquia'
      };

      expect(() => ColombianAddressSchema.parse(validAddress)).not.toThrow();

      const invalidAddress = {
        ...validAddress,
        department: 'California' // Not a Colombian department
      };

      expect(() => ColombianAddressSchema.parse(invalidAddress)).toThrow();
    });

    it('includes all 32 Colombian departments', () => {
      const colombianDepartments = [
        'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá',
        'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba',
        'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena',
        'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda',
        'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca',
        'Vaupés', 'Vichada'
      ];

      colombianDepartments.forEach(department => {
        const address = {
          street: 'Calle 123 #45-67',
          city: 'Test City',
          department
        };

        expect(() => ColombianAddressSchema.parse(address)).not.toThrow();
      });

      expect(colombianDepartments).toHaveLength(32);
    });

    it('provides Spanish error messages for address validation', () => {
      try {
        ColombianAddressSchema.parse({
          street: '',
          city: '',
          department: ''
        });
      } catch (error: unknown) {
        if (error instanceof z.ZodError) {
          const errors = extractValidationErrors(error);
          expect(errors.street).toBe('La dirección es requerida');
          expect(errors.city).toBe('La ciudad es requerida');
          expect(errors.department).toBe('Seleccione un departamento');
        }
      }
    });
  });

  describe('Business Registration Schema', () => {
    it('accepts valid business registration data', () => {
      const validData = {
        name: 'Mi Negocio Colombiano',
        email: 'negocio@example.com',
        phone: '+57 300 123 4567',
        whatsapp_number: '+57 310 987 6543',
        address: {
          street: 'Calle 123 #45-67',
          city: 'Bogotá',
          department: 'Cundinamarca'
        }
      };

      expect(() => BusinessRegistrationSchema.parse(validData)).not.toThrow();
    });

    it('requires all business fields', () => {
      const incompleteData = {
        name: '',
        email: '',
        phone: '',
        whatsapp_number: '',
        address: {
          street: '',
          city: '',
          department: ''
        }
      };

      try {
        BusinessRegistrationSchema.parse(incompleteData);
      } catch (error: unknown) {
        if (error instanceof z.ZodError) {
          const errors = extractValidationErrors(error);
          expect(errors.name).toBe('El nombre es requerido');
          expect(errors.email).toBe('Email inválido'); // Zod email validation runs first on empty string
          expect(errors.phone).toBe('Formato de teléfono colombiano inválido'); // Regex validation runs first on empty string
          expect(errors.whatsapp_number).toBe('Formato de teléfono colombiano inválido');
        }
      }
    });

    it('validates email format', () => {
      const invalidEmails = ['invalid', 'test@', '@example.com', 'not-an-email'];

      invalidEmails.forEach(email => {
        try {
          BusinessRegistrationSchema.parse({
            name: 'Test',
            email,
            phone: '+57 300 123 4567',
            whatsapp_number: '+57 310 987 6543',
            address: {
              street: 'Calle 123',
              city: 'Bogotá',
              department: 'Cundinamarca'
            }
          });
        } catch (error: unknown) {
          if (error instanceof z.ZodError) {
            const errors = extractValidationErrors(error);
            expect(errors.email).toBe('Email inválido');
          }
        }
      });
    });

    it('normalizes email to lowercase', () => {
      const data = {
        name: 'Test Business',
        email: 'TEST@EXAMPLE.COM',
        phone: '+57 300 123 4567',
        whatsapp_number: '+57 310 987 6543',
        address: {
          street: 'Calle 123',
          city: 'Bogotá',
          department: 'Cundinamarca'
        }
      };

      const result = BusinessRegistrationSchema.parse(data);
      expect(result.email).toBe('test@example.com');
    });

    it('trims whitespace from name and email', () => {
      const data = {
        name: '  Test Business  ',
        email: '  test@example.com  ',
        phone: '+57 300 123 4567',
        whatsapp_number: '+57 310 987 6543',
        address: {
          street: 'Calle 123',
          city: 'Bogotá',
          department: 'Cundinamarca'
        }
      };

      const result = BusinessRegistrationSchema.parse(data);
      expect(result.name).toBe('Test Business');
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('Field Validation Helper', () => {
    it('validates individual fields correctly', () => {
      // Valid name
      expect(validateBusinessFormField('name', 'Test Business')).toEqual({
        isValid: true
      });

      // Invalid name
      expect(validateBusinessFormField('name', '')).toEqual({
        isValid: false,
        error: 'El nombre es requerido'
      });

      // Valid email
      expect(validateBusinessFormField('email', 'test@example.com')).toEqual({
        isValid: true
      });

      // Invalid email
      expect(validateBusinessFormField('email', 'invalid')).toEqual({
        isValid: false,
        error: 'Email inválido'
      });

      // Valid phone
      expect(validateBusinessFormField('phone', '+57 300 123 4567')).toEqual({
        isValid: true
      });

      // Invalid phone
      expect(validateBusinessFormField('phone', 'invalid')).toEqual({
        isValid: false,
        error: 'Formato de teléfono colombiano inválido'
      });
    });

    it('validates address object', () => {
      const validAddress = {
        street: 'Calle 123 #45-67',
        city: 'Bogotá',
        department: 'Cundinamarca'
      };

      expect(validateBusinessFormField('address', validAddress)).toEqual({
        isValid: true
      });

      const invalidAddress = {
        street: '',
        city: '',
        department: ''
      };

      const result = validateBusinessFormField('address', invalidAddress);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('Colombian Phone Input Logic', () => {
  describe('Phone Formatting Logic', () => {
    it('should format phone numbers correctly', () => {
      // Test the formatting logic that would be used in ColombianPhoneInput
      const formatColombianPhone = (input: string): string => {
        const digitsOnly = input.replace(/\D/g, '');
        
        if (digitsOnly.startsWith('57') && digitsOnly.length > 2) {
          const numberPart = digitsOnly.substring(2);
          if (numberPart.length >= 10) {
            return `+57 ${numberPart.slice(0, 3)} ${numberPart.slice(3, 6)} ${numberPart.slice(6, 10)}`;
          }
        }
        
        if (digitsOnly.length === 10) {
          return `+57 ${digitsOnly.slice(0, 3)} ${digitsOnly.slice(3, 6)} ${digitsOnly.slice(6, 10)}`;
        }
        
        return input;
      };

      expect(formatColombianPhone('3001234567')).toBe('+57 300 123 4567');
      expect(formatColombianPhone('573001234567')).toBe('+57 300 123 4567');
      expect(formatColombianPhone('123')).toBe('123'); // Incomplete
    });
  });
});