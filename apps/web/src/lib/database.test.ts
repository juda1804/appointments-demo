import { businessDb } from './database';

// Mock Supabase client
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

// Setup default mock chain
mockFrom.mockReturnValue({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete
});

mockSelect.mockReturnValue({
  eq: mockEq
});

mockEq.mockReturnValue({
  single: mockSingle
});

mockInsert.mockReturnValue({
  select: () => ({
    single: mockSingle
  })
});

mockUpdate.mockReturnValue({
  eq: () => ({
    select: () => ({
      single: mockSingle
    })
  })
});

mockDelete.mockReturnValue({
  eq: mockEq
});

describe('Business Database Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setBusinessContext', () => {
    it('should call set_current_business_id RPC function', async () => {
      mockRpc.mockResolvedValue({ error: null });

      await businessDb.setBusinessContext('test-business-id');

      expect(mockRpc).toHaveBeenCalledWith('set_current_business_id', {
        business_uuid: 'test-business-id'
      });
    });

    it('should throw error when RPC fails', async () => {
      mockRpc.mockResolvedValue({ error: { message: 'RPC failed' } });

      await expect(businessDb.setBusinessContext('test-business-id'))
        .rejects.toThrow('Failed to set business context: RPC failed');
    });
  });

  describe('getCurrentBusiness', () => {
    it('should return null when no business context is set', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const result = await businessDb.getCurrentBusiness();

      expect(result).toBeNull();
    });

    it('should return business when context is set', async () => {
      const mockBusinessData = {
        id: 'test-id',
        name: 'Test Business',
        description: 'Test Description',
        street: 'Test Street',
        city: 'Test City',
        department: 'Test Department',
        postal_code: '12345',
        phone: '+57 301 234 5678',
        whatsapp_number: '+57 301 234 5678',
        email: 'test@business.com',
        settings: { timezone: 'America/Bogota', currency: 'COP' },
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      mockRpc.mockResolvedValue({ data: 'test-id', error: null });
      mockSingle.mockResolvedValue({ data: mockBusinessData, error: null });

      const result = await businessDb.getCurrentBusiness();

      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-id');
      expect(result?.name).toBe('Test Business');
    });
  });

  describe('getById', () => {
    it('should return null when business not found', async () => {
      mockSingle.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116' } 
      });

      const result = await businessDb.getById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should return formatted business data when found', async () => {
      const mockBusinessData = {
        id: 'test-id',
        name: 'Test Business',
        description: 'Test Description',
        street: 'Test Street',
        city: 'Test City',
        department: 'Test Department',
        postal_code: '12345',
        phone: '+57 301 234 5678',
        whatsapp_number: '+57 301 234 5678',
        email: 'test@business.com',
        settings: { timezone: 'America/Bogota', currency: 'COP', businessHours: [] },
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      mockSingle.mockResolvedValue({ data: mockBusinessData, error: null });

      const result = await businessDb.getById('test-id');

      expect(result).not.toBeNull();
      expect(result?.address.street).toBe('Test Street');
      expect(result?.address.city).toBe('Test City');
      expect(result?.settings.timezone).toBe('America/Bogota');
    });
  });

  describe('testMultiTenantIsolation', () => {
    it('should confirm RLS is working when no businesses returned without context', async () => {
      mockSelect.mockResolvedValue({ data: [], error: null });

      const result = await businessDb.testMultiTenantIsolation();

      expect(result.businessesWithoutContext).toEqual([]);
      expect(result.message).toContain('RLS working correctly');
    });

    it('should warn when businesses are returned without context', async () => {
      const mockBusinesses = [{ id: '1', name: 'Business 1' }];
      
      mockSelect.mockResolvedValue({ data: mockBusinesses, error: null });

      const result = await businessDb.testMultiTenantIsolation();

      expect(result.businessesWithoutContext).toEqual(mockBusinesses);
      expect(result.message).toContain('Warning: RLS may not be working');
    });
  });
});