import { businessDb } from './database';

// Mock Supabase client with comprehensive functionality
const mockRpc = jest.fn();
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

jest.mock('./supabase', () => ({
  createServerSupabaseClient: jest.fn(() => ({
    rpc: mockRpc,
    from: mockFrom
  }))
}));

// Setup default mock chain for different operations
const mockChainBuilder = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete
};

mockFrom.mockReturnValue(mockChainBuilder);
mockSelect.mockReturnValue({ eq: mockEq });
mockEq.mockReturnValue({ single: mockSingle });

// Helper to setup insert chain
const setupInsertChain = () => {
  mockInsert.mockReturnValue({
    select: () => ({ single: mockSingle })
  });
};

// Helper to setup update chain
const setupUpdateChain = () => {
  mockUpdate.mockReturnValue({
    eq: () => ({
      select: () => ({ single: mockSingle })
    })
  });
};

// Helper to setup delete chain
const setupDeleteChain = () => {
  mockDelete.mockReturnValue({ eq: mockEq });
};

describe('Business Database Integration & RLS Tests', () => {
  const mockBusinessInput = {
    name: 'Centro Médico Bogotá',
    description: 'Especialistas en medicina general',
    address: {
      street: 'Calle 127 #15-32',
      city: 'Bogotá',
      department: 'Bogotá D.C.',
      postalCode: '110111'
    },
    phone: '+57 301 555 1234' as const,
    whatsappNumber: '+57 301 555 1234' as const,
    email: 'info@centromedico.com',
    settings: {
      timezone: 'America/Bogota',
      currency: 'COP',
      businessHours: [
        { dayOfWeek: 1, openTime: "09:00", closeTime: "17:00", isOpen: true },
        { dayOfWeek: 2, openTime: "09:00", closeTime: "17:00", isOpen: true }
      ]
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setupInsertChain();
    setupUpdateChain();
    setupDeleteChain();
  });

  describe('Multi-Tenant Context Management', () => {
    describe('setBusinessContext', () => {
      it('should successfully set business context for RLS', async () => {
        mockRpc.mockResolvedValue({ error: null });

        await businessDb.setBusinessContext('business-123');

        expect(mockRpc).toHaveBeenCalledWith('set_current_business_id', {
          business_uuid: 'business-123'
        });
      });

      it('should throw descriptive error when RLS context setting fails', async () => {
        mockRpc.mockResolvedValue({ 
          error: { message: 'Invalid business UUID format' } 
        });

        await expect(businessDb.setBusinessContext('invalid-id'))
          .rejects.toThrow('Failed to set business context: Invalid business UUID format');
      });

      it('should handle network errors when setting context', async () => {
        mockRpc.mockRejectedValue(new Error('Network timeout'));

        await expect(businessDb.setBusinessContext('business-123'))
          .rejects.toThrow('Network timeout');
      });
    });

    describe('getCurrentBusiness', () => {
      it('should return null when no business context is set', async () => {
        mockRpc.mockResolvedValue({ data: null, error: null });

        const result = await businessDb.getCurrentBusiness();

        expect(result).toBeNull();
        expect(mockRpc).toHaveBeenCalledWith('get_current_business_id');
      });

      it('should return null when context RPC fails', async () => {
        mockRpc.mockResolvedValue({ 
          data: null, 
          error: { message: 'No context set' } 
        });

        const result = await businessDb.getCurrentBusiness();

        expect(result).toBeNull();
      });

      it('should retrieve business when valid context is set', async () => {
        const mockBusinessData = {
          id: 'business-123',
          name: 'Clínica Salud Total',
          description: 'Centro médico especializado',
          street: 'Carrera 15 #93-47',
          city: 'Bogotá',
          department: 'Bogotá D.C.',
          postal_code: '110221',
          phone: '+57 301 234 5678',
          whatsapp_number: '+57 301 234 5678',
          email: 'contacto@clinicasalud.com',
          settings: { 
            timezone: 'America/Bogota', 
            currency: 'COP',
            businessHours: [
              { dayOfWeek: 1, openTime: "08:00", closeTime: "18:00", isOpen: true }
            ]
          },
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        };

        mockRpc.mockResolvedValue({ data: 'business-123', error: null });
        mockSingle.mockResolvedValue({ data: mockBusinessData, error: null });

        const result = await businessDb.getCurrentBusiness();

        expect(result).not.toBeNull();
        expect(result?.id).toBe('business-123');
        expect(result?.name).toBe('Clínica Salud Total');
        expect(result && 'street' in result ? result.street : undefined).toBe('Carrera 15 #93-47');
        expect(result && 'department' in result ? result.department : undefined).toBe('Bogotá D.C.');
        expect(result?.settings?.timezone).toBe('America/Bogota');
        expect(result?.settings?.currency).toBe('COP');
      });

      it('should throw error when business query fails', async () => {
        mockRpc.mockResolvedValue({ data: 'business-123', error: null });
        mockSingle.mockResolvedValue({ 
          data: null, 
          error: { message: 'Database connection failed' } 
        });

        await expect(businessDb.getCurrentBusiness())
          .rejects.toThrow('Failed to get current business: Database connection failed');
      });
    });
  });

  describe('Business CRUD Operations with RLS', () => {

    describe('create', () => {
      it('should create business with Colombian address structure', async () => {
        const mockCreatedBusiness = {
          id: 'new-business-123',
          name: mockBusinessInput.name,
          description: mockBusinessInput.description,
          street: mockBusinessInput.address.street,
          city: mockBusinessInput.address.city,
          department: mockBusinessInput.address.department,
          postal_code: mockBusinessInput.address.postalCode,
          phone: mockBusinessInput.phone,
          whatsapp_number: mockBusinessInput.whatsappNumber,
          email: mockBusinessInput.email,
          settings: mockBusinessInput.settings,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        };

        mockSingle.mockResolvedValue({ data: mockCreatedBusiness, error: null });

        const result = await businessDb.create(mockBusinessInput);

        expect(mockFrom).toHaveBeenCalledWith('businesses');
        expect(mockInsert).toHaveBeenCalledWith([{
          name: mockBusinessInput.name,
          description: mockBusinessInput.description,
          street: mockBusinessInput.address.street,
          city: mockBusinessInput.address.city,
          department: mockBusinessInput.address.department,
          postal_code: mockBusinessInput.address.postalCode,
          phone: mockBusinessInput.phone,
          whatsapp_number: mockBusinessInput.whatsappNumber,
          email: mockBusinessInput.email,
          settings: mockBusinessInput.settings
        }]);
        expect(result.id).toBe('new-business-123');
      });

      it('should throw error when business creation fails due to constraints', async () => {
        mockSingle.mockResolvedValue({ 
          data: null, 
          error: { 
            message: 'duplicate key value violates unique constraint "businesses_email_key"',
            code: '23505'
          } 
        });

        await expect(businessDb.create(mockBusinessInput))
          .rejects.toThrow('duplicate key value violates unique constraint');
      });
    });

    describe('getById with RLS enforcement', () => {
      it('should return business when RLS allows access', async () => {
        const mockBusinessData = {
          id: 'accessible-business',
          name: 'Accessible Business',
          description: 'Test business',
          street: 'Test Street',
          city: 'Bogotá',
          department: 'Bogotá D.C.',
          postal_code: '110111',
          phone: '+57 301 234 5678',
          whatsapp_number: '+57 301 234 5678',
          email: 'test@business.com',
          settings: { timezone: 'America/Bogota', currency: 'COP', businessHours: [] },
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        };

        mockSingle.mockResolvedValue({ data: mockBusinessData, error: null });

        const result = await businessDb.getById('accessible-business');

        expect(result).not.toBeNull();
        expect(result?.id).toBe('accessible-business');
        expect(mockFrom).toHaveBeenCalledWith('businesses');
        expect(mockEq).toHaveBeenCalledWith('id', 'accessible-business');
      });

      it('should return null when RLS blocks access (no matching row)', async () => {
        mockSingle.mockResolvedValue({ 
          data: null, 
          error: { code: 'PGRST116' } // PostgREST "no rows returned" code
        });

        const result = await businessDb.getById('inaccessible-business');

        expect(result).toBeNull();
      });

      it('should throw error on database failure', async () => {
        mockSingle.mockResolvedValue({ 
          data: null, 
          error: { 
            message: 'Connection lost',
            code: 'CONNECTION_ERROR'
          } 
        });

        await expect(businessDb.getById('some-business'))
          .rejects.toThrow('Failed to get business: Connection lost');
      });
    });

    describe('update with RLS enforcement', () => {
      it('should update business when RLS allows access', async () => {
        const updateData = {
          name: 'Updated Business Name',
          phone: '+57 301 999 8888' as const
        };

        const mockUpdatedBusiness = {
          id: 'business-to-update',
          name: 'Updated Business Name',
          phone: '+57 301 999 8888',
          updated_at: '2025-01-02T00:00:00Z'
        };

        mockSingle.mockResolvedValue({ data: mockUpdatedBusiness, error: null });

        const result = await businessDb.update('business-to-update', updateData);

        expect(mockUpdate).toHaveBeenCalledWith({
          name: 'Updated Business Name',
          phone: '+57 301 999 8888'
        });
        expect(result.name).toBe('Updated Business Name');
      });

      it('should update address fields correctly', async () => {
        const updateData = {
          address: {
            street: 'Nueva Calle 456',
            city: 'Medellín',
            department: 'Antioquia',
            postalCode: '050001'
          }
        };

        mockSingle.mockResolvedValue({ 
          data: { id: 'test', updated_at: '2025-01-02T00:00:00Z' }, 
          error: null 
        });

        await businessDb.update('business-id', updateData);

        expect(mockUpdate).toHaveBeenCalledWith({
          street: 'Nueva Calle 456',
          city: 'Medellín',
          department: 'Antioquia',
          postal_code: '050001'
        });
      });

      it('should fail silently when RLS blocks update', async () => {
        mockSingle.mockResolvedValue({ 
          data: null, 
          error: { message: 'No rows updated due to RLS policy' } 
        });

        await expect(businessDb.update('blocked-business', { name: 'New Name' }))
          .rejects.toThrow('Failed to update business: No rows updated due to RLS policy');
      });
    });

    describe('delete with RLS enforcement', () => {
      it('should delete business when RLS allows access', async () => {
        mockEq.mockResolvedValue({ error: null });

        await businessDb.delete('deletable-business');

        expect(mockFrom).toHaveBeenCalledWith('businesses');
        expect(mockDelete).toHaveBeenCalled();
        expect(mockEq).toHaveBeenCalledWith('id', 'deletable-business');
      });

      it('should fail when RLS blocks deletion', async () => {
        mockEq.mockResolvedValue({ 
          error: { message: 'RLS policy violation on delete' } 
        });

        await expect(businessDb.delete('protected-business'))
          .rejects.toThrow('Failed to delete business: RLS policy violation on delete');
      });
    });
  });

  describe('Row Level Security Testing', () => {
    describe('testMultiTenantIsolation', () => {
      it('should confirm RLS is working when no businesses returned without context', async () => {
        // Setup successful query that returns empty array (good RLS)
        mockSelect.mockResolvedValue({ data: [], error: null });

        const result = await businessDb.testMultiTenantIsolation();

        expect(mockFrom).toHaveBeenCalledWith('businesses');
        expect(mockSelect).toHaveBeenCalledWith('id, name');
        expect(result.businessesWithoutContext).toEqual([]);
        expect(result.message).toBe('RLS working correctly - no businesses returned without context');
      });

      it('should warn when RLS is not properly configured', async () => {
        // RLS not working - businesses returned without proper context
        const leakedBusinesses = [
          { id: 'business-1', name: 'Leaked Business 1' },
          { id: 'business-2', name: 'Leaked Business 2' }
        ];
        
        mockSelect.mockResolvedValue({ data: leakedBusinesses, error: null });

        const result = await businessDb.testMultiTenantIsolation();

        expect(result.businessesWithoutContext).toEqual(leakedBusinesses);
        expect(result.message).toBe('Warning: RLS may not be working - 2 businesses returned without context');
      });

      it('should throw error when isolation test query fails', async () => {
        mockSelect.mockResolvedValue({ 
          data: null, 
          error: { message: 'Database connection failed' } 
        });

        await expect(businessDb.testMultiTenantIsolation())
          .rejects.toThrow('Failed to test isolation: Database connection failed');
      });
    });
  });

  describe('Colombian Business Schema Validation', () => {
    it('should handle Colombian phone format validation errors', async () => {
      const invalidBusinessData = {
        ...mockBusinessInput,
        phone: 'invalid-phone' as string
      };

      mockSingle.mockResolvedValue({ 
        data: null, 
        error: { 
          message: 'new row for relation "businesses" violates check constraint "check_phone_format"',
          code: '23514' 
        } 
      });

      await expect(businessDb.create(invalidBusinessData))
        .rejects.toThrow('violates check constraint "check_phone_format"');
    });

    it('should handle Colombian department validation errors', async () => {
      const invalidDepartmentData = {
        ...mockBusinessInput,
        address: {
          ...mockBusinessInput.address,
          department: 'Invalid Department'
        }
      };

      mockSingle.mockResolvedValue({ 
        data: null, 
        error: { 
          message: 'new row for relation "businesses" violates check constraint "check_department_valid"',
          code: '23514' 
        } 
      });

      await expect(businessDb.create(invalidDepartmentData))
        .rejects.toThrow('violates check constraint "check_department_valid"');
    });

    it('should handle email uniqueness constraint violations', async () => {
      mockSingle.mockResolvedValue({ 
        data: null, 
        error: { 
          message: 'duplicate key value violates unique constraint "businesses_email_key"',
          code: '23505',
          details: 'Key (email)=(existing@email.com) already exists.'
        } 
      });

      await expect(businessDb.create(mockBusinessInput))
        .rejects.toThrow('duplicate key value violates unique constraint "businesses_email_key"');
    });
  });

  describe('Colombian Settings Validation', () => {
    it('should properly handle Colombian business settings', async () => {
      const colombianSettings = {
        timezone: 'America/Bogota',
        currency: 'COP',
        businessHours: [
          { dayOfWeek: 1, openTime: "08:00", closeTime: "18:00", isOpen: true },
          { dayOfWeek: 2, openTime: "08:00", closeTime: "18:00", isOpen: true },
          { dayOfWeek: 3, openTime: "08:00", closeTime: "18:00", isOpen: true },
          { dayOfWeek: 4, openTime: "08:00", closeTime: "18:00", isOpen: true },
          { dayOfWeek: 5, openTime: "08:00", closeTime: "18:00", isOpen: true },
          { dayOfWeek: 6, openTime: "09:00", closeTime: "14:00", isOpen: true },
          { dayOfWeek: 0, openTime: "10:00", closeTime: "14:00", isOpen: false }
        ]
      };

      const businessWithSettings = {
        ...mockBusinessInput,
        settings: colombianSettings
      };

      mockSingle.mockResolvedValue({ 
        data: { 
          id: 'new-business', 
          settings: colombianSettings,
          created_at: '2025-01-01T00:00:00Z' 
        }, 
        error: null 
      });

      const result = await businessDb.create(businessWithSettings);

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          settings: colombianSettings
        })
      ]);
      expect(result.settings).toEqual(colombianSettings);
    });
  });
});