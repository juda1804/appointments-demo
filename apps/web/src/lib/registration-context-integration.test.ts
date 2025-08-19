import { businessDb } from './database';

// Mock the business registration API endpoint functionality
const mockApiEndpoint = jest.fn();

// Define to prevent unused variable warning  
beforeAll(() => {
  mockApiEndpoint.mockImplementation(() => Promise.resolve({ success: true }));
});

// Mock Supabase and localStorage for context testing
const mockRpc = jest.fn();
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockSingle = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

jest.mock('./supabase', () => ({
  createServerSupabaseClient: jest.fn(() => ({
    rpc: mockRpc,
    from: mockFrom
  }))
}));

// Setup mock chains
const setupMocks = () => {
  mockFrom.mockReturnValue({
    insert: mockInsert,
    select: mockSelect
  });

  mockInsert.mockReturnValue({
    select: () => ({ single: mockSingle })
  });

  mockSelect.mockReturnValue({
    eq: () => ({ single: mockSingle })
  });
};

describe('Registration Multi-Tenant Context Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    setupMocks();
  });

  describe('Business Registration Flow', () => {
    it('should set multi-tenant context immediately after successful business creation', async () => {
      const registrationData = {
        name: 'Clínica Dental Bogotá',
        description: 'Centro especializado en odontología',
        address: {
          street: 'Carrera 15 #93-47',
          city: 'Bogotá',
          department: 'Bogotá D.C.',
          postalCode: '110221'
        },
        phone: '+57 301 234 5678' as const,
        whatsappNumber: '+57 301 234 5678' as const,
        email: 'contacto@clinicadental.com',
        settings: {
          timezone: 'America/Bogota',
          currency: 'COP',
          businessHours: [
            { dayOfWeek: 1, openTime: "08:00", closeTime: "18:00", isOpen: true },
            { dayOfWeek: 2, openTime: "08:00", closeTime: "18:00", isOpen: true },
            { dayOfWeek: 3, openTime: "08:00", closeTime: "18:00", isOpen: true },
            { dayOfWeek: 4, openTime: "08:00", closeTime: "18:00", isOpen: true },
            { dayOfWeek: 5, openTime: "08:00", closeTime: "18:00", isOpen: true }
          ]
        }
      };

      const createdBusinessId = 'clinic-dental-bogota-123';
      const createdBusiness = {
        id: createdBusinessId,
        ...registrationData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock successful business creation
      mockSingle.mockResolvedValue({ data: createdBusiness, error: null });

      // Mock successful RLS context setting
      mockRpc.mockResolvedValue({ error: null });

      // Step 1: Create the business
      const business = await businessDb.create(registrationData);
      expect(business.id).toBe(createdBusinessId);

      // Step 2: Set business context for multi-tenant isolation
      await businessDb.setBusinessContext(business.id);

      // Verify RLS context was set with correct business ID
      expect(mockRpc).toHaveBeenCalledWith('set_current_business_id', {
        business_uuid: createdBusinessId
      });
    });

    it('should verify business context allows access to own business data', async () => {
      const businessId = 'context-test-business-123';
      const businessData = {
        id: businessId,
        name: 'Context Test Business',
        street: 'Test Street',
        city: 'Bogotá',
        department: 'Bogotá D.C.',
        postal_code: '110111',
        phone: '+57 301 234 5678',
        whatsapp_number: '+57 301 234 5678',
        email: 'context@test.com',
        settings: { timezone: 'America/Bogota', currency: 'COP' },
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      // Step 1: Set business context
      mockRpc.mockResolvedValue({ error: null });
      await businessDb.setBusinessContext(businessId);

      // Step 2: Try to access the business (should succeed with context set)
      mockSingle.mockResolvedValue({ data: businessData, error: null });
      const retrievedBusiness = await businessDb.getById(businessId);

      // Verify business was retrieved successfully
      expect(retrievedBusiness).not.toBeNull();
      expect(retrievedBusiness?.id).toBe(businessId);
      expect(retrievedBusiness?.name).toBe('Context Test Business');
    });

    it('should prevent access to other businesses without proper context', async () => {
      const ownBusinessId = 'own-business-123';
      const otherBusinessId = 'other-business-456';

      // Set context for own business
      mockRpc.mockResolvedValue({ error: null });
      await businessDb.setBusinessContext(ownBusinessId);

      // Try to access other business (should be blocked by RLS)
      mockSingle.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116' } // No matching row due to RLS
      });

      const otherBusiness = await businessDb.getById(otherBusinessId);

      // Should return null due to RLS blocking access
      expect(otherBusiness).toBeNull();
    });
  });

  describe('Registration API Integration Context', () => {
    it('should simulate complete registration flow with context setup', async () => {
      // Simulate the registration API endpoint flow
      const registrationRequest = {
        name: 'Centro Médico Los Andes',
        description: 'Atención médica integral',
        street: 'Avenida 19 #123-45',
        city: 'Bogotá',
        department: 'Bogotá D.C.',
        postalCode: '110911',
        phone: '+57 301 555 1234',
        whatsappNumber: '+57 301 555 1234',
        email: 'contacto@centromedico.com',
        settings: {
          timezone: 'America/Bogota',
          currency: 'COP',
          businessHours: []
        }
      };

      const newBusinessId = 'centro-medico-andes-789';

      // Simulate successful API response with business creation and context setup
      const apiResponse = {
        success: true,
        business: {
          id: newBusinessId,
          name: registrationRequest.name,
          email: registrationRequest.email,
          address: {
            street: registrationRequest.street,
            city: registrationRequest.city,
            department: registrationRequest.department,
            postalCode: registrationRequest.postalCode
          },
          phone: registrationRequest.phone,
          whatsappNumber: registrationRequest.whatsappNumber,
          settings: registrationRequest.settings,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        businessContext: {
          businessId: newBusinessId,
          contextSet: true
        }
      };

      // Mock the database operations that would happen in the API
      mockSingle.mockResolvedValue({ data: apiResponse.business, error: null });
      mockRpc.mockResolvedValue({ error: null });

      // Simulate business creation
      const createdBusiness = await businessDb.create({
        name: registrationRequest.name,
        description: registrationRequest.description,
        address: {
          street: registrationRequest.street,
          city: registrationRequest.city,
          department: registrationRequest.department,
          postalCode: registrationRequest.postalCode
        },
        phone: registrationRequest.phone as string,
        whatsappNumber: registrationRequest.whatsappNumber as string,
        email: registrationRequest.email,
        settings: registrationRequest.settings
      });

      // Simulate context setup
      await businessDb.setBusinessContext(createdBusiness.id);

      // Verify the complete flow
      expect(createdBusiness.id).toBe(newBusinessId);
      expect(mockRpc).toHaveBeenCalledWith('set_current_business_id', {
        business_uuid: newBusinessId
      });

      // Simulate frontend context storage (localStorage)
      const frontendContext = {
        currentBusinessId: newBusinessId,
        businessName: registrationRequest.name,
        setupComplete: true,
        timestamp: new Date().toISOString()
      };

      // Mock storing context in localStorage
      localStorageMock.setItem.mockImplementation((key, value) => {
        expect(key).toBe('current_business_context');
        expect(JSON.parse(value)).toEqual(frontendContext);
      });

      localStorage.setItem('current_business_context', JSON.stringify(frontendContext));

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'current_business_context',
        JSON.stringify(frontendContext)
      );
    });
  });

  describe('Multi-Tenant Isolation Verification', () => {
    it('should verify RLS isolation is working after registration', async () => {
      const businessId = 'isolation-test-business-123';

      // Set business context
      mockRpc.mockResolvedValue({ error: null });
      await businessDb.setBusinessContext(businessId);

      // Test isolation by checking if other businesses are hidden
      mockSelect.mockResolvedValue({ data: [], error: null });
      const isolationTest = await businessDb.testMultiTenantIsolation();

      expect(isolationTest.businessesWithoutContext).toEqual([]);
      expect(isolationTest.message).toContain('RLS working correctly');
    });

    it('should detect potential RLS configuration issues', async () => {
      // Simulate RLS not working properly (businesses leak across tenants)
      const leakedBusinesses = [
        { id: 'leaked-1', name: 'Leaked Business 1' },
        { id: 'leaked-2', name: 'Leaked Business 2' }
      ];

      mockSelect.mockResolvedValue({ data: leakedBusinesses, error: null });
      const isolationTest = await businessDb.testMultiTenantIsolation();

      expect(isolationTest.businessesWithoutContext).toEqual(leakedBusinesses);
      expect(isolationTest.message).toContain('Warning: RLS may not be working');
    });
  });

  describe('Context Persistence and Recovery', () => {
    it('should handle context loss and recovery scenarios', async () => {
      const businessId = 'context-recovery-business-123';
      const businessData = {
        id: businessId,
        name: 'Context Recovery Business',
        street: 'Recovery Street',
        city: 'Bogotá',
        department: 'Bogotá D.C.',
        postal_code: '110111',
        phone: '+57 301 234 5678',
        email: 'recovery@business.com',
        settings: { timezone: 'America/Bogota', currency: 'COP' },
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      // Scenario 1: Context is lost (no RLS context set)
      mockRpc.mockResolvedValue({ data: null, error: null });
      const businessWithoutContext = await businessDb.getCurrentBusiness();
      expect(businessWithoutContext).toBeNull();

      // Scenario 2: Restore context and verify access
      mockRpc.mockResolvedValue({ error: null });
      await businessDb.setBusinessContext(businessId);

      // Scenario 3: Verify context restoration worked
      mockRpc.mockResolvedValue({ data: businessId, error: null });
      mockSingle.mockResolvedValue({ data: businessData, error: null });
      
      const businessWithContext = await businessDb.getCurrentBusiness();
      expect(businessWithContext).not.toBeNull();
      expect(businessWithContext && 'id' in businessWithContext ? businessWithContext.id : undefined).toBe(businessId);
    });

    it('should handle invalid context attempts gracefully', async () => {
      const invalidBusinessId = 'invalid-uuid-format';

      // Attempt to set invalid context
      mockRpc.mockResolvedValue({ 
        error: { message: 'invalid input syntax for type uuid' } 
      });

      await expect(businessDb.setBusinessContext(invalidBusinessId))
        .rejects.toThrow('invalid input syntax for type uuid');
    });
  });

  describe('Registration Error Scenarios', () => {
    it('should handle registration failure without setting context', async () => {
      const invalidRegistrationData = {
        name: 'Invalid Business',
        address: {
          street: 'Test Street',
          city: 'Test City',
          department: 'Invalid Department', // Invalid department
          postalCode: '110111'
        },
        phone: 'invalid-phone' as string, // Invalid phone format
        email: 'invalid@email.com',
        settings: { timezone: 'America/Bogota', currency: 'COP', businessHours: [] }
      };

      // Mock database constraint violation
      mockSingle.mockResolvedValue({
        data: null,
        error: { 
          message: 'violates check constraint "check_department_valid"',
          code: '23514'
        }
      });

      // Attempt to create business should fail
      await expect(businessDb.create(invalidRegistrationData))
        .rejects.toThrow('violates check constraint');

      // Verify no context was set (RLS function shouldn't be called)
      expect(mockRpc).not.toHaveBeenCalledWith('set_current_business_id', expect.anything());
    });

    it('should handle context setting failure after successful business creation', async () => {
      const businessData = {
        name: 'Context Failure Test',
        address: {
          street: 'Test Street',
          city: 'Bogotá',
          department: 'Bogotá D.C.',
          postalCode: '110111'
        },
        phone: '+57 301 234 5678' as const,
        email: 'contextfail@test.com',
        settings: { timezone: 'America/Bogota', currency: 'COP', businessHours: [] }
      };

      const createdBusinessId = 'context-fail-business-123';

      // Business creation succeeds
      mockSingle.mockResolvedValue({
        data: { id: createdBusinessId, ...businessData },
        error: null
      });

      const business = await businessDb.create(businessData);
      expect(business.id).toBe(createdBusinessId);

      // Context setting fails
      mockRpc.mockResolvedValue({
        error: { message: 'RLS function not available' }
      });

      await expect(businessDb.setBusinessContext(business.id))
        .rejects.toThrow('Failed to set business context: RLS function not available');
    });
  });

  describe('End-to-End Registration Workflow', () => {
    it('should complete full registration workflow with all validations', async () => {
      const completeRegistrationFlow = async () => {
        // Step 1: Validate input data
        const registrationData = {
          name: 'Clínica Integral de Salud',
          description: 'Centro médico con servicios integrales',
          address: {
            street: 'Calle 127 #15-32',
            city: 'Bogotá',
            department: 'Bogotá D.C.',
            postalCode: '110111'
          },
          phone: '+57 301 555 9876' as const,
          whatsappNumber: '+57 301 555 9876' as const,
          email: 'info@clinicaintegral.com',
          settings: {
            timezone: 'America/Bogota',
            currency: 'COP',
            businessHours: [
              { dayOfWeek: 1, openTime: "07:00", closeTime: "19:00", isOpen: true },
              { dayOfWeek: 2, openTime: "07:00", closeTime: "19:00", isOpen: true },
              { dayOfWeek: 3, openTime: "07:00", closeTime: "19:00", isOpen: true },
              { dayOfWeek: 4, openTime: "07:00", closeTime: "19:00", isOpen: true },
              { dayOfWeek: 5, openTime: "07:00", closeTime: "19:00", isOpen: true },
              { dayOfWeek: 6, openTime: "08:00", closeTime: "16:00", isOpen: true },
              { dayOfWeek: 0, openTime: "08:00", closeTime: "14:00", isOpen: false }
            ]
          }
        };

        // Step 2: Validate Colombian-specific requirements
        expect(businessDb.validateColombianPhone(registrationData.phone)).toBe(true);
        expect(businessDb.validateColombianPhone(registrationData.whatsappNumber!)).toBe(true);
        expect(businessDb.validateColombianDepartment(registrationData.address.department)).toBe(true);

        // Step 3: Check email availability
        mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
        const emailAvailable = await businessDb.isEmailTaken(registrationData.email);
        expect(emailAvailable).toBe(false); // Email is available

        // Step 4: Create business
        const businessId = 'clinica-integral-salud-456';
        mockSingle.mockResolvedValueOnce({
          data: { id: businessId, ...registrationData },
          error: null
        });

        const createdBusiness = await businessDb.create(registrationData);
        expect(createdBusiness.id).toBe(businessId);

        // Step 5: Set multi-tenant context
        mockRpc.mockResolvedValue({ error: null });
        await businessDb.setBusinessContext(businessId);

        // Step 6: Verify context is working
        mockRpc.mockResolvedValue({ data: businessId, error: null });
        mockSingle.mockResolvedValueOnce({
          data: { id: businessId, ...registrationData },
          error: null
        });

        const currentBusiness = await businessDb.getCurrentBusiness();
        expect(currentBusiness && 'id' in currentBusiness ? currentBusiness.id : undefined).toBe(businessId);

        // Step 7: Verify multi-tenant isolation
        mockSelect.mockResolvedValue({ data: [], error: null });
        const isolationCheck = await businessDb.testMultiTenantIsolation();
        expect(isolationCheck.message).toContain('RLS working correctly');

        return {
          businessId,
          registrationSuccessful: true,
          contextSet: true,
          isolationVerified: true
        };
      };

      const result = await completeRegistrationFlow();

      expect(result.registrationSuccessful).toBe(true);
      expect(result.contextSet).toBe(true);
      expect(result.isolationVerified).toBe(true);
    });
  });
});