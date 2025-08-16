import { businessDb } from './database';

// Mock Supabase client for RLS policy testing
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

// Setup mock chains for different operations
const setupMockChains = () => {
  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete
  });

  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ single: mockSingle });
  
  mockInsert.mockReturnValue({
    select: () => ({ single: mockSingle })
  });
  
  mockUpdate.mockReturnValue({
    eq: () => ({
      select: () => ({ single: mockSingle })
    })
  });
  
  mockDelete.mockReturnValue({ eq: mockEq });
};

describe('Row Level Security (RLS) Policies Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockChains();
  });

  describe('Business Context Management for RLS', () => {
    describe('setBusinessContext', () => {
      it('should call RLS function to set business context', async () => {
        mockRpc.mockResolvedValue({ error: null });

        await businessDb.setBusinessContext('business-123');

        expect(mockRpc).toHaveBeenCalledWith('set_current_business_id', {
          business_uuid: 'business-123'
        });
        expect(mockRpc).toHaveBeenCalledTimes(1);
      });

      it('should handle invalid business UUID format', async () => {
        mockRpc.mockResolvedValue({ 
          error: { message: 'invalid input syntax for type uuid' } 
        });

        await expect(businessDb.setBusinessContext('invalid-uuid'))
          .rejects.toThrow('Failed to set business context: invalid input syntax for type uuid');
      });

      it('should handle RLS configuration errors', async () => {
        mockRpc.mockResolvedValue({ 
          error: { message: 'function set_current_business_id does not exist' } 
        });

        await expect(businessDb.setBusinessContext('business-123'))
          .rejects.toThrow('function set_current_business_id does not exist');
      });
    });

    describe('getCurrentBusiness', () => {
      it('should return null when no business context is set (RLS blocks access)', async () => {
        // Simulate RLS blocking access when no context is set
        mockRpc.mockResolvedValue({ data: null, error: null });

        const result = await businessDb.getCurrentBusiness();

        expect(result).toBeNull();
        expect(mockRpc).toHaveBeenCalledWith('get_current_business_id');
      });

      it('should return business when valid context is set (RLS allows access)', async () => {
        const businessId = 'accessible-business-123';
        const businessData = {
          id: businessId,
          name: 'Accessible Business',
          street: 'Test Street',
          city: 'Bogotá',
          department: 'Bogotá D.C.',
          phone: '+57 301 234 5678',
          email: 'accessible@business.com',
          settings: { timezone: 'America/Bogota', currency: 'COP' }
        };

        // Mock successful context retrieval
        mockRpc.mockResolvedValue({ data: businessId, error: null });
        mockSingle.mockResolvedValue({ data: businessData, error: null });

        const result = await businessDb.getCurrentBusiness();

        expect(mockRpc).toHaveBeenCalledWith('get_current_business_id');
        expect(mockFrom).toHaveBeenCalledWith('businesses');
        expect(mockEq).toHaveBeenCalledWith('id', businessId);
        expect(result).toEqual(businessData);
      });

      it('should handle RLS policy blocking business access', async () => {
        // Context is set but RLS policy blocks access to specific business
        mockRpc.mockResolvedValue({ data: 'blocked-business-123', error: null });
        mockSingle.mockResolvedValue({ 
          data: null, 
          error: { code: 'PGRST116', message: 'No rows found' } // No matching row due to RLS policy
        });

        await expect(businessDb.getCurrentBusiness())
          .rejects.toThrow('Failed to get current business: No rows found');
      });
    });
  });

  describe('CRUD Operations with RLS Enforcement', () => {
    describe('Business Creation (Insert Policy)', () => {
      it('should allow authenticated business creation', async () => {
        const newBusinessData = {
          name: 'New Business',
          description: 'Test business',
          address: {
            street: 'Test Street',
            city: 'Bogotá',
            department: 'Bogotá D.C.',
            postalCode: '110111'
          },
          phone: '+57 301 234 5678' as const,
          email: 'new@business.com',
          settings: { timezone: 'America/Bogota', currency: 'COP', businessHours: [] }
        };

        const mockCreatedBusiness = {
          id: 'new-business-123',
          ...newBusinessData
        };

        mockSingle.mockResolvedValue({ data: mockCreatedBusiness, error: null });

        const result = await businessDb.create(newBusinessData);

        expect(mockFrom).toHaveBeenCalledWith('businesses');
        expect(mockInsert).toHaveBeenCalled();
        expect(result).toEqual(mockCreatedBusiness);
      });

      it('should handle RLS insert policy blocking unauthorized creation', async () => {
        const unauthorizedBusiness = {
          name: 'Unauthorized Business',
          address: { street: 'Test', city: 'Test', department: 'Bogotá D.C.', postalCode: '110111' },
          phone: '+57 301 234 5678' as const,
          email: 'unauthorized@business.com',
          settings: { timezone: 'America/Bogota', currency: 'COP', businessHours: [] }
        };

        mockSingle.mockResolvedValue({ 
          data: null, 
          error: { 
            message: 'new row violates row-level security policy for table "businesses"',
            code: '42501'
          } 
        });

        await expect(businessDb.create(unauthorizedBusiness))
          .rejects.toThrow('new row violates row-level security policy');
      });
    });

    describe('Business Retrieval (Select Policy)', () => {
      it('should return business when RLS select policy allows access', async () => {
        const accessibleBusinessId = 'accessible-business-123';
        const businessData = {
          id: accessibleBusinessId,
          name: 'Accessible Business',
          street: 'Accessible Street',
          city: 'Bogotá',
          department: 'Bogotá D.C.',
          phone: '+57 301 234 5678',
          email: 'accessible@business.com',
          settings: { timezone: 'America/Bogota', currency: 'COP' }
        };

        mockSingle.mockResolvedValue({ data: businessData, error: null });

        const result = await businessDb.getById(accessibleBusinessId);

        expect(mockFrom).toHaveBeenCalledWith('businesses');
        expect(mockEq).toHaveBeenCalledWith('id', accessibleBusinessId);
        expect(result?.id).toBe(accessibleBusinessId);
      });

      it('should return null when RLS select policy blocks access', async () => {
        const blockedBusinessId = 'blocked-business-123';

        mockSingle.mockResolvedValue({ 
          data: null, 
          error: { code: 'PGRST116' } // No rows returned due to RLS filtering
        });

        const result = await businessDb.getById(blockedBusinessId);

        expect(result).toBeNull();
      });
    });

    describe('Business Updates (Update Policy)', () => {
      it('should allow updates when RLS update policy permits', async () => {
        const businessId = 'updatable-business-123';
        const updates = { name: 'Updated Business Name' };

        const mockUpdatedBusiness = {
          id: businessId,
          name: 'Updated Business Name',
          updated_at: '2025-01-02T00:00:00Z'
        };

        mockSingle.mockResolvedValue({ data: mockUpdatedBusiness, error: null });

        const result = await businessDb.update(businessId, updates);

        expect(mockFrom).toHaveBeenCalledWith('businesses');
        expect(mockUpdate).toHaveBeenCalledWith({ name: 'Updated Business Name' });
        expect(result.name).toBe('Updated Business Name');
      });

      it('should fail when RLS update policy blocks modification', async () => {
        const blockedBusinessId = 'blocked-business-123';
        const updates = { name: 'Blocked Update' };

        mockSingle.mockResolvedValue({ 
          data: null, 
          error: { 
            message: 'new row violates row-level security policy for table "businesses"',
            code: '42501'
          } 
        });

        await expect(businessDb.update(blockedBusinessId, updates))
          .rejects.toThrow('new row violates row-level security policy');
      });

      it('should silently fail when trying to update non-owned business', async () => {
        const nonOwnedBusinessId = 'non-owned-business-123';
        const updates = { name: 'Attempted Update' };

        // RLS policy prevents update, so no rows are affected (no error, but no data returned)
        mockSingle.mockResolvedValue({ 
          data: null, 
          error: { 
            message: 'No rows found',
            code: 'PGRST116'
          } 
        });

        await expect(businessDb.update(nonOwnedBusinessId, updates))
          .rejects.toThrow('Failed to update business: No rows found');
      });
    });

    describe('Business Deletion (Delete Policy)', () => {
      it('should allow deletion when RLS delete policy permits', async () => {
        const deletableBusinessId = 'deletable-business-123';

        mockEq.mockResolvedValue({ error: null });

        await businessDb.delete(deletableBusinessId);

        expect(mockFrom).toHaveBeenCalledWith('businesses');
        expect(mockDelete).toHaveBeenCalled();
        expect(mockEq).toHaveBeenCalledWith('id', deletableBusinessId);
      });

      it('should fail when RLS delete policy blocks deletion', async () => {
        const protectedBusinessId = 'protected-business-123';

        mockEq.mockResolvedValue({ 
          error: { 
            message: 'row-level security policy for table "businesses" prevents deletion',
            code: '42501'
          } 
        });

        await expect(businessDb.delete(protectedBusinessId))
          .rejects.toThrow('row-level security policy for table "businesses" prevents deletion');
      });
    });
  });

  describe('Multi-Tenant Isolation Testing', () => {
    describe('testMultiTenantIsolation', () => {
      it('should confirm RLS is properly isolating tenants', async () => {
        // When RLS is working correctly, querying without context should return empty
        mockSelect.mockResolvedValue({ data: [], error: null });

        const result = await businessDb.testMultiTenantIsolation();

        expect(mockFrom).toHaveBeenCalledWith('businesses');
        expect(mockSelect).toHaveBeenCalledWith('id, name');
        expect(result.businessesWithoutContext).toEqual([]);
        expect(result.message).toBe('RLS working correctly - no businesses returned without context');
      });

      it('should detect RLS configuration issues', async () => {
        // If RLS is not working, businesses would leak across tenants
        const leakedBusinesses = [
          { id: 'leaked-1', name: 'Business 1' },
          { id: 'leaked-2', name: 'Business 2' },
          { id: 'leaked-3', name: 'Business 3' }
        ];

        mockSelect.mockResolvedValue({ data: leakedBusinesses, error: null });

        const result = await businessDb.testMultiTenantIsolation();

        expect(result.businessesWithoutContext).toEqual(leakedBusinesses);
        expect(result.message).toBe('Warning: RLS may not be working - 3 businesses returned without context');
      });

      it('should handle database errors during isolation testing', async () => {
        mockSelect.mockResolvedValue({ 
          data: null, 
          error: { message: 'permission denied for table businesses' } 
        });

        await expect(businessDb.testMultiTenantIsolation())
          .rejects.toThrow('Failed to test isolation: permission denied for table businesses');
      });
    });

    describe('Cross-tenant access prevention', () => {
      it('should prevent cross-tenant business access', async () => {
        // Simulate setting context for Business A
        mockRpc.mockResolvedValue({ error: null });
        await businessDb.setBusinessContext('business-a-123');

        // Try to access Business B (should be blocked by RLS)
        mockSingle.mockResolvedValue({ 
          data: null, 
          error: { code: 'PGRST116' } 
        });

        const result = await businessDb.getById('business-b-456');

        expect(result).toBeNull(); // RLS should block access to Business B
      });

      it('should allow same-tenant business access', async () => {
        const businessId = 'business-a-123';
        const businessData = {
          id: businessId,
          name: 'Business A',
          street: 'Business A Street',
          city: 'Bogotá',
          department: 'Bogotá D.C.',
          postal_code: '110111',
          phone: '+57 301 234 5678',
          whatsapp_number: '+57 301 234 5678',
          email: 'businessa@example.com',
          settings: { timezone: 'America/Bogota', currency: 'COP' },
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        };

        // Set context for Business A
        mockRpc.mockResolvedValue({ error: null });
        await businessDb.setBusinessContext(businessId);

        // Access Business A (should be allowed by RLS)
        mockSingle.mockResolvedValue({ data: businessData, error: null });

        const result = await businessDb.getById(businessId);

        expect(result?.id).toBe(businessId);
        expect(result?.name).toBe('Business A');
        expect(result?.address?.street).toBe('Business A Street');
      });
    });
  });

  describe('RLS Function Security', () => {
    describe('set_current_business_id security', () => {
      it('should validate business UUID format', async () => {
        mockRpc.mockResolvedValue({ 
          error: { message: 'invalid input syntax for type uuid: "invalid-uuid"' } 
        });

        await expect(businessDb.setBusinessContext('invalid-uuid'))
          .rejects.toThrow('invalid input syntax for type uuid');
      });

      it('should handle null business ID', async () => {
        mockRpc.mockResolvedValue({ 
          error: { message: 'invalid input syntax for type uuid: ""' } 
        });

        // Should throw error when setting empty context 
        await expect(businessDb.setBusinessContext(''))
          .rejects.toThrow('Failed to set business context: invalid input syntax for type uuid: ""');
      });
    });

    describe('get_current_business_id security', () => {
      it('should return null when no context is set', async () => {
        mockRpc.mockResolvedValue({ data: null, error: null });

        const result = await businessDb.getCurrentBusiness();

        expect(result).toBeNull();
        expect(mockRpc).toHaveBeenCalledWith('get_current_business_id');
      });

      it('should handle function execution errors', async () => {
        mockRpc.mockResolvedValue({ 
          data: null, 
          error: { message: 'current_setting parameter does not exist' } 
        });

        const result = await businessDb.getCurrentBusiness();

        expect(result).toBeNull();
      });
    });
  });

  describe('RLS Policy Coverage', () => {
    it('should verify all business operations respect RLS policies', async () => {
      const businessOperations = [
        'create',
        'getById', 
        'update',
        'delete',
        'getCurrentBusiness'
      ];

      // Verify each operation interacts with the businesses table (and thus RLS)
      businessOperations.forEach(operation => {
        expect(typeof (businessDb as Record<string, unknown>)[operation]).toBe('function');
      });

      // Verify operations use the businesses table
      mockFrom.mockReturnValue({
        select: () => ({ eq: () => ({ single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }) }) }),
        insert: () => ({ select: () => ({ single: jest.fn().mockResolvedValue({ data: { id: 'test' }, error: null }) }) }),
        update: () => ({ eq: () => ({ select: () => ({ single: jest.fn().mockResolvedValue({ data: { id: 'test' }, error: null }) }) }) }),
        delete: () => ({ eq: jest.fn().mockResolvedValue({ error: null }) })
      });

      // Test that each operation calls the businesses table
      const result = await businessDb.getById('test-id');
      expect(mockFrom).toHaveBeenCalledWith('businesses');
      expect(result).toBeNull();

      mockFrom.mockClear();
      
      const testBusiness = {
        name: 'Test',
        address: { street: 'Test', city: 'Test', department: 'Bogotá D.C.', postalCode: '110111' },
        phone: '+57 301 234 5678' as const,
        email: 'test@test.com',
        settings: { timezone: 'America/Bogota', currency: 'COP', businessHours: [] }
      };
      
      await businessDb.create(testBusiness);
      expect(mockFrom).toHaveBeenCalledWith('businesses');
    });
  });
});