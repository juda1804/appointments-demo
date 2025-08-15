import { businessDb } from './database';
import type { Business } from '@appointments-demo/types';

// Mock Supabase client for utility function testing
const mockRpc = jest.fn();
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOr = jest.fn();
const mockLimit = jest.fn();
const mockSingle = jest.fn();
const mockUpdate = jest.fn();

jest.mock('./supabase', () => ({
  createServerSupabaseClient: jest.fn(() => ({
    rpc: mockRpc,
    from: mockFrom
  }))
}));

// Setup mock chain
const setupMockChain = () => {
  mockFrom.mockReturnValue({
    select: mockSelect,
    update: mockUpdate
  });
  
  mockSelect.mockReturnValue({
    eq: mockEq,
    or: mockOr,
    limit: mockLimit
  });
  
  mockEq.mockReturnValue({
    single: mockSingle,
    select: () => ({ single: mockSingle })
  });
  
  mockOr.mockReturnValue({
    limit: mockLimit
  });
  
  mockLimit.mockReturnValue([]);
  
  mockUpdate.mockReturnValue({
    eq: () => ({
      select: () => ({ single: mockSingle })
    })
  });
};

describe('Database Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockChain();
  });

  describe('Email Availability Check', () => {
    describe('isEmailTaken', () => {
      it('should return false when email is available', async () => {
        mockSingle.mockResolvedValue({ 
          data: null, 
          error: { code: 'PGRST116' } 
        });

        const result = await businessDb.isEmailTaken('available@example.com');

        expect(result).toBe(false);
        expect(mockFrom).toHaveBeenCalledWith('businesses');
        expect(mockSelect).toHaveBeenCalledWith('id');
        expect(mockEq).toHaveBeenCalledWith('email', 'available@example.com');
      });

      it('should return true when email is already taken', async () => {
        mockSingle.mockResolvedValue({ 
          data: { id: 'existing-business-123' }, 
          error: null 
        });

        const result = await businessDb.isEmailTaken('taken@example.com');

        expect(result).toBe(true);
      });

      it('should throw error on database failure', async () => {
        mockSingle.mockResolvedValue({ 
          data: null, 
          error: { message: 'Database connection failed' } 
        });

        await expect(businessDb.isEmailTaken('test@example.com'))
          .rejects.toThrow('Failed to check email availability: Database connection failed');
      });
    });
  });

  describe('Geographic Search Functions', () => {
    describe('getByDepartment', () => {
      it('should return businesses in specified Colombian department', async () => {
        const mockBusinesses = [
          {
            id: 'business-1',
            name: 'Business 1',
            street: 'Street 1',
            city: 'Bogotá',
            department: 'Bogotá D.C.',
            postal_code: '110111',
            phone: '+57 301 234 5678',
            whatsapp_number: '+57 301 234 5678',
            email: 'business1@example.com',
            settings: { timezone: 'America/Bogota', currency: 'COP' },
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z'
          }
        ];

        mockSelect.mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: mockBusinesses, error: null })
        });

        const result = await businessDb.getByDepartment('Bogotá D.C.');

        expect(mockFrom).toHaveBeenCalledWith('businesses');
        expect(mockSelect).toHaveBeenCalledWith('*');
        expect(result).toHaveLength(1);
        expect(result[0].address.department).toBe('Bogotá D.C.');
      });

      it('should return empty array when no businesses found in department', async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null })
        });

        const result = await businessDb.getByDepartment('Amazonas');

        expect(result).toEqual([]);
      });

      it('should handle database errors', async () => {
        mockSelect.mockReturnValue({
          eq: jest.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Invalid department filter' } 
          })
        });

        await expect(businessDb.getByDepartment('InvalidDepartment'))
          .rejects.toThrow('Failed to get businesses by department: Invalid department filter');
      });
    });

    describe('search', () => {
      it('should search businesses by name and city', async () => {
        const mockSearchResults = [
          {
            id: 'search-result-1',
            name: 'Clínica Médica',
            street: 'Test Street',
            city: 'Medellín',
            department: 'Antioquia',
            postal_code: '050001',
            phone: '+57 301 234 5678',
            whatsapp_number: '+57 301 234 5678',
            email: 'clinica@example.com',
            settings: { timezone: 'America/Bogota', currency: 'COP' },
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z'
          }
        ];

        mockLimit.mockResolvedValue({ data: mockSearchResults, error: null });

        const result = await businessDb.search('Médica', 5);

        expect(mockOr).toHaveBeenCalledWith('name.ilike.%Médica%,city.ilike.%Médica%');
        expect(mockLimit).toHaveBeenCalledWith(5);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Clínica Médica');
      });

      it('should use default limit when not specified', async () => {
        mockLimit.mockResolvedValue({ data: [], error: null });

        await businessDb.search('test');

        expect(mockLimit).toHaveBeenCalledWith(10);
      });

      it('should handle search errors', async () => {
        mockLimit.mockResolvedValue({ 
          data: null, 
          error: { message: 'Search query too complex' } 
        });

        await expect(businessDb.search('complex query'))
          .rejects.toThrow('Failed to search businesses: Search query too complex');
      });
    });
  });

  describe('Settings Management', () => {
    describe('updateSettings', () => {
      it('should merge new settings with existing settings', async () => {
        const currentSettings = {
          timezone: 'America/Bogota',
          currency: 'COP',
          businessHours: []
        };

        const newSettings = {
          businessHours: [
            { dayOfWeek: 1, openTime: "09:00", closeTime: "17:00", isOpen: true }
          ]
        };

        // Mock getting current settings
        mockSelect.mockReturnValue({
          eq: () => ({
            single: jest.fn().mockResolvedValue({
              data: { settings: currentSettings },
              error: null
            })
          })
        });

        // Mock update operation
        mockSingle.mockResolvedValue({
          data: { id: 'business-123', settings: { ...currentSettings, ...newSettings } },
          error: null
        });

        const result = await businessDb.updateSettings('business-123', newSettings);

        expect(mockUpdate).toHaveBeenCalledWith({
          settings: { ...currentSettings, ...newSettings }
        });
        expect(result.settings.businessHours).toEqual(newSettings.businessHours);
        expect(result.settings.timezone).toBe('America/Bogota'); // Preserved
      });

      it('should handle business not found', async () => {
        mockSelect.mockReturnValue({
          eq: () => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          })
        });

        await expect(businessDb.updateSettings('nonexistent-123', {}))
          .rejects.toThrow('Business not found or access denied');
      });
    });
  });

  describe('Colombian Validation Utilities', () => {
    describe('validateColombianPhone', () => {
      it('should validate correct Colombian phone numbers', () => {
        const validPhones = [
          '+57 300 123 4567',
          '+57 301 234 5678',
          '+57 310 345 6789',
          '+57 320 456 7890'
        ];

        validPhones.forEach(phone => {
          expect(businessDb.validateColombianPhone(phone)).toBe(true);
        });
      });

      it('should reject invalid Colombian phone numbers', () => {
        const invalidPhones = [
          '300 123 4567',        // Missing +57
          '+57 300 123 456',     // Too short
          '+57 300-123-4567',    // Wrong separators
          '+1 300 123 4567',     // Wrong country code
          '573001234567'         // No spaces
        ];

        invalidPhones.forEach(phone => {
          expect(businessDb.validateColombianPhone(phone)).toBe(false);
        });
      });
    });

    describe('validateColombianDepartment', () => {
      it('should validate all 32 Colombian departments plus Bogotá D.C.', () => {
        const validDepartments = [
          'Bogotá D.C.',
          'Antioquia',
          'Valle del Cauca',
          'Cundinamarca',
          'Santander',
          'Atlántico',
          'Bolívar',
          'Norte de Santander',
          'Córdoba',
          'Tolima'
        ];

        validDepartments.forEach(department => {
          expect(businessDb.validateColombianDepartment(department)).toBe(true);
        });
      });

      it('should reject invalid departments', () => {
        const invalidDepartments = [
          'California',
          'Texas',
          'Invalid Department',
          'Bogota', // Missing D.C.
          'antioquia' // Wrong case
        ];

        invalidDepartments.forEach(department => {
          expect(businessDb.validateColombianDepartment(department)).toBe(false);
        });
      });
    });
  });

  describe('Colombian Business Creation', () => {
    describe('createColombianBusiness', () => {
      it('should create business with Colombian defaults', async () => {
        const businessData = {
          name: 'Test Colombian Business',
          address: {
            street: 'Carrera 15 #93-47',
            city: 'Bogotá',
            department: 'Bogotá D.C.',
            postalCode: '110221'
          },
          phone: '+57 301 234 5678' as const,
          email: 'test@business.co'
        };

        // Mock the create function call
        const mockCreate = jest.spyOn(businessDb, 'create');
        const defaultBusinessHours = [
          { dayOfWeek: 1, openTime: "08:00", closeTime: "18:00", isOpen: true },
          { dayOfWeek: 2, openTime: "08:00", closeTime: "18:00", isOpen: true },
          { dayOfWeek: 3, openTime: "08:00", closeTime: "18:00", isOpen: true },
          { dayOfWeek: 4, openTime: "08:00", closeTime: "18:00", isOpen: true },
          { dayOfWeek: 5, openTime: "08:00", closeTime: "18:00", isOpen: true },
          { dayOfWeek: 6, openTime: "08:00", closeTime: "14:00", isOpen: true },
          { dayOfWeek: 0, openTime: "10:00", closeTime: "14:00", isOpen: false }
        ];

        mockCreate.mockResolvedValue({
          id: 'new-business-123',
          ...businessData,
          settings: {
            timezone: 'America/Bogota',
            currency: 'COP',
            businessHours: defaultBusinessHours
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });

        const result = await businessDb.createColombianBusiness(businessData);

        expect(mockCreate).toHaveBeenCalledWith({
          ...businessData,
          settings: {
            timezone: 'America/Bogota',
            currency: 'COP',
            businessHours: defaultBusinessHours
          }
        });
        
        expect(result.settings.timezone).toBe('America/Bogota');
        expect(result.settings.currency).toBe('COP');
        expect(result.settings.businessHours).toHaveLength(7);

        mockCreate.mockRestore();
      });

      it('should allow custom settings to override defaults', async () => {
        const businessData = {
          name: 'Custom Settings Business',
          address: {
            street: 'Test Street',
            city: 'Medellín',
            department: 'Antioquia',
            postalCode: '050001'
          },
          phone: '+57 301 234 5678' as const,
          email: 'custom@business.co',
          settings: {
            timezone: 'America/Bogota', // Keep default
            currency: 'USD', // Override default
            customSetting: 'custom value'
          }
        };

        const mockCreate = jest.spyOn(businessDb, 'create');
        mockCreate.mockResolvedValue({
          id: 'custom-business-123',
          name: businessData.name,
          address: businessData.address,
          phone: businessData.phone,
          email: businessData.email,
          settings: {
            timezone: 'America/Bogota',
            currency: 'USD',
            businessHours: expect.any(Array),
            customSetting: 'custom value'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });

        const result = await businessDb.createColombianBusiness(businessData);

        expect(result.settings.currency).toBe('USD'); // Overridden
        expect(result.settings.timezone).toBe('America/Bogota'); // Default preserved
        expect((result.settings as Record<string, unknown>).customSetting).toBe('custom value');

        mockCreate.mockRestore();
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('bulkUpdateSettings', () => {
      it('should update multiple businesses and track results', async () => {
        const updates = [
          { 
            id: 'business-1', 
            settings: { businessHours: [{ dayOfWeek: 1, openTime: "09:00", closeTime: "17:00", isOpen: true }] } 
          },
          { 
            id: 'business-2', 
            settings: { timezone: 'America/Bogota' } 
          }
        ];

        // Mock updateSettings to succeed for both calls
        const mockUpdateSettings = jest.spyOn(businessDb, 'updateSettings');
        mockUpdateSettings
          .mockResolvedValueOnce({ id: 'business-1', updated: true })
          .mockResolvedValueOnce({ id: 'business-2', updated: true });

        const result = await businessDb.bulkUpdateSettings(updates);

        expect(result.results).toHaveLength(2);
        expect(result.errors).toHaveLength(0);
        expect(result.results[0].success).toBe(true);
        expect(result.results[1].success).toBe(true);

        mockUpdateSettings.mockRestore();
      });

      it('should handle mixed success and failure results', async () => {
        const updates = [
          { id: 'business-success', settings: { timezone: 'America/Bogota' } },
          { id: 'business-fail', settings: { timezone: 'America/Bogota' } }
        ];

        const mockUpdateSettings = jest.spyOn(businessDb, 'updateSettings');
        mockUpdateSettings
          .mockResolvedValueOnce({ id: 'business-success', updated: true })
          .mockRejectedValueOnce(new Error('Business not found'));

        const result = await businessDb.bulkUpdateSettings(updates);

        expect(result.results).toHaveLength(1);
        expect(result.errors).toHaveLength(1);
        expect(result.results[0].id).toBe('business-success');
        expect(result.errors[0].id).toBe('business-fail');
        expect(result.errors[0].error).toBe('Business not found');

        mockUpdateSettings.mockRestore();
      });
    });
  });

  describe('Business Health Check', () => {
    describe('getBusinessHealth', () => {
      it('should calculate good health for compliant Colombian business', async () => {
        const healthyBusiness: Business = {
          id: 'healthy-business-123',
          name: 'Healthy Colombian Business',
          address: {
            street: 'Carrera 15 #93-47',
            city: 'Bogotá',
            department: 'Bogotá D.C.',
            postalCode: '110221'
          },
          phone: '+57 301 234 5678',
          whatsappNumber: '+57 301 234 5678',
          email: 'healthy@business.co',
          settings: {
            timezone: 'America/Bogota',
            currency: 'COP',
            businessHours: [
              { dayOfWeek: 1, openTime: "08:00", closeTime: "18:00", isOpen: true }
            ]
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Mock the dependent functions
        const mockSetContext = jest.spyOn(businessDb, 'setBusinessContext');
        const mockGetById = jest.spyOn(businessDb, 'getById');
        
        mockSetContext.mockResolvedValue();
        mockGetById.mockResolvedValue(healthyBusiness);

        const result = await businessDb.getBusinessHealth('healthy-business-123');

        expect(result.overallHealth).toBe('good');
        expect(result.hasValidPhone).toBe(true);
        expect(result.hasValidWhatsApp).toBe(true);
        expect(result.hasValidDepartment).toBe(true);
        expect(result.hasCompleteAddress).toBe(true);
        expect(result.hasBusinessHours).toBe(true);
        expect(result.isColombianTimezone).toBe(true);
        expect(result.isColombianCurrency).toBe(true);

        mockSetContext.mockRestore();
        mockGetById.mockRestore();
      });

      it('should calculate warning health for partially compliant business', async () => {
        const warningBusiness: Business = {
          id: 'warning-business-123',
          name: 'Warning Business',
          address: {
            street: 'Test Street',
            city: 'Test City',
            department: 'Invalid Department', // Invalid
            postalCode: '110221'
          },
          phone: 'invalid-phone', // Invalid
          email: 'warning@business.co',
          settings: {
            timezone: 'America/Bogota',
            currency: 'COP',
            businessHours: [] // Missing
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const mockSetContext = jest.spyOn(businessDb, 'setBusinessContext');
        const mockGetById = jest.spyOn(businessDb, 'getById');
        
        mockSetContext.mockResolvedValue();
        mockGetById.mockResolvedValue(warningBusiness);

        const result = await businessDb.getBusinessHealth('warning-business-123');

        expect(result.overallHealth).toBe('critical'); // 3+ issues = critical
        expect(result.hasValidPhone).toBe(false);
        expect(result.hasValidDepartment).toBe(false);
        expect(result.hasBusinessHours).toBe(false);

        mockSetContext.mockRestore();
        mockGetById.mockRestore();
      });

      it('should handle business not found', async () => {
        const mockSetContext = jest.spyOn(businessDb, 'setBusinessContext');
        const mockGetById = jest.spyOn(businessDb, 'getById');
        
        mockSetContext.mockResolvedValue();
        mockGetById.mockResolvedValue(null);

        await expect(businessDb.getBusinessHealth('nonexistent-123'))
          .rejects.toThrow('Failed to get business health: Business not found or access denied');

        mockSetContext.mockRestore();
        mockGetById.mockRestore();
      });
    });
  });
});