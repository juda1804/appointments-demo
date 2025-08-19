/**
 * RLS Context Management Tests
 * Tests for Row Level Security context setting and business isolation verification
 */

// Mock the Supabase client creation first
jest.mock('@supabase/supabase-js', () => {
  const mockSupabase = {
    auth: {
      getSession: jest.fn(),
    },
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  }
  
  return {
    createClient: jest.fn(() => mockSupabase)
  }
})

import { createClient } from '@supabase/supabase-js'
import {
  setBusinessContext,
  getBusinessContext,
  validateBusinessContext,
  clearBusinessContext,
  verifyBusinessIsolation,
  switchBusinessContext,
  isBusinessContextSet
} from './rls-context-management'

// Access mocked supabase instance
const mockSupabase = (createClient as jest.Mock)()

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
})

describe('RLS Context Management', () => {
  const testBusinessId = '123e4567-e89b-12d3-a456-426614174000'
  const testUserId = '987fcdeb-51a2-43d1-9f12-345678901234'
  const anotherBusinessId = '456e7890-e89b-12d3-a456-426614174111'

  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  describe('setBusinessContext', () => {
    test('should set business context in database session', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null })
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })

      const result = await setBusinessContext(testBusinessId)

      expect(result.success).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('set_business_context', {
        business_id: testBusinessId
      })
      expect(localStorageMock.setItem).toHaveBeenCalledWith('current_business_id', testBusinessId)
    })

    test('should handle database RPC errors', async () => {
      mockSupabase.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'Failed to set business context' }
      })
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })

      const result = await setBusinessContext(testBusinessId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to set business context in database')
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })

    test('should require valid business ID format', async () => {
      const invalidBusinessId = 'invalid-uuid'

      const result = await setBusinessContext(invalidBusinessId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid business ID format')
      expect(mockSupabase.rpc).not.toHaveBeenCalled()
    })

    test('should require authenticated user session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      const result = await setBusinessContext(testBusinessId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('No authenticated user session')
      expect(mockSupabase.rpc).not.toHaveBeenCalled()
    })

    test('should validate business ownership before setting context', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })
      
      // Mock business ownership validation
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' } // No rows returned
            })
          })
        })
      })

      const result = await setBusinessContext(testBusinessId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User does not own this business')
    })
  })

  describe('getBusinessContext', () => {
    test('should retrieve business context from localStorage', () => {
      localStorageMock.getItem.mockReturnValue(testBusinessId)

      const businessId = getBusinessContext()

      expect(businessId).toBe(testBusinessId)
      expect(localStorageMock.getItem).toHaveBeenCalledWith('current_business_id')
    })

    test('should return null when no context is set', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const businessId = getBusinessContext()

      expect(businessId).toBeNull()
    })

    test('should validate UUID format of stored context', () => {
      localStorageMock.getItem.mockReturnValue('invalid-uuid')

      const businessId = getBusinessContext()

      expect(businessId).toBeNull()
    })
  })

  describe('validateBusinessContext', () => {
    test('should validate that user owns the specified business', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: testBusinessId, owner_id: testUserId },
              error: null
            })
          })
        })
      })

      const result = await validateBusinessContext(testBusinessId)

      expect(result.isValid).toBe(true)
      expect(result.businessData).toEqual({ id: testBusinessId, owner_id: testUserId })
    })

    test('should reject context for business user does not own', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          })
        })
      })

      const result = await validateBusinessContext(testBusinessId)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Business not found or user does not own this business')
    })

    test('should handle database validation errors', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' }
            })
          })
        })
      })

      const result = await validateBusinessContext(testBusinessId)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Database validation failed: Database connection failed')
    })
  })

  describe('clearBusinessContext', () => {
    test('should clear business context from database and localStorage', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null })
      localStorageMock.getItem.mockReturnValue(testBusinessId)

      const result = await clearBusinessContext()

      expect(result.success).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('clear_business_context')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('current_business_id')
    })

    test('should handle RPC errors when clearing context', async () => {
      mockSupabase.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'RPC failed' }
      })

      const result = await clearBusinessContext()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to clear business context: RPC failed')
    })

    test('should succeed even when no context is currently set', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null })
      localStorageMock.getItem.mockReturnValue(null)

      const result = await clearBusinessContext()

      expect(result.success).toBe(true)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('current_business_id')
    })
  })

  describe('verifyBusinessIsolation', () => {
    test('should confirm businesses cannot access each other\'s data', async () => {
      // Set context for first business
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: true, error: null }) // setBusinessContext
        .mockResolvedValueOnce({ data: [{ id: 'data-1' }], error: null }) // query business 1 data
        .mockResolvedValueOnce({ data: true, error: null }) // setBusinessContext for business 2
        .mockResolvedValueOnce({ data: [{ id: 'data-2' }], error: null }) // query business 2 data

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })

      const result = await verifyBusinessIsolation(testBusinessId, anotherBusinessId, 'appointments')

      expect(result.isIsolated).toBe(true)
      expect(result.business1Data).toHaveLength(1)
      expect(result.business2Data).toHaveLength(1)
      expect(result.business1Data![0].id).toBe('data-1')
      expect(result.business2Data![0].id).toBe('data-2')
    })

    test('should detect isolation failures', async () => {
      // Simulate case where business 2 can see business 1's data
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: true, error: null }) // setBusinessContext
        .mockResolvedValueOnce({ data: [{ id: 'data-1' }], error: null }) // query business 1 data
        .mockResolvedValueOnce({ data: true, error: null }) // setBusinessContext for business 2
        .mockResolvedValueOnce({ data: [{ id: 'data-1' }, { id: 'data-2' }], error: null }) // business 2 sees business 1 data

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })

      const result = await verifyBusinessIsolation(testBusinessId, anotherBusinessId, 'appointments')

      expect(result.isIsolated).toBe(false)
      expect(result.error).toContain('Business isolation failed')
    })

    test('should handle RPC errors during isolation testing', async () => {
      mockSupabase.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'RPC error' }
      })
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })

      const result = await verifyBusinessIsolation(testBusinessId, anotherBusinessId, 'appointments')

      expect(result.isIsolated).toBe(false)
      expect(result.error).toBe('Failed to set business context during isolation test: RPC error')
    })
  })

  describe('switchBusinessContext', () => {
    test('should switch from one business context to another', async () => {
      localStorageMock.getItem.mockReturnValue(testBusinessId)
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null })
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })
      
      // Mock business ownership validation for new business
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: anotherBusinessId, owner_id: testUserId },
              error: null
            })
          })
        })
      })

      const result = await switchBusinessContext(anotherBusinessId)

      expect(result.success).toBe(true)
      expect(result.previousBusinessId).toBe(testBusinessId)
      expect(result.newBusinessId).toBe(anotherBusinessId)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('set_business_context', {
        business_id: anotherBusinessId
      })
    })

    test('should handle switching when no previous context exists', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null })
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: testBusinessId, owner_id: testUserId },
              error: null
            })
          })
        })
      })

      const result = await switchBusinessContext(testBusinessId)

      expect(result.success).toBe(true)
      expect(result.previousBusinessId).toBeNull()
      expect(result.newBusinessId).toBe(testBusinessId)
    })

    test('should prevent switching to same business context', async () => {
      localStorageMock.getItem.mockReturnValue(testBusinessId)

      const result = await switchBusinessContext(testBusinessId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Already in the specified business context')
      expect(mockSupabase.rpc).not.toHaveBeenCalled()
    })
  })

  describe('isBusinessContextSet', () => {
    test('should return true when valid business context is set', () => {
      localStorageMock.getItem.mockReturnValue(testBusinessId)

      const isSet = isBusinessContextSet()

      expect(isSet).toBe(true)
    })

    test('should return false when no business context is set', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const isSet = isBusinessContextSet()

      expect(isSet).toBe(false)
    })

    test('should return false when invalid business context is set', () => {
      localStorageMock.getItem.mockReturnValue('invalid-uuid')

      const isSet = isBusinessContextSet()

      expect(isSet).toBe(false)
    })
  })

  describe('Business Context Edge Cases', () => {
    test('should handle concurrent business context operations', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null })
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: testBusinessId, owner_id: testUserId },
              error: null
            })
          })
        })
      })

      // Simulate concurrent context setting
      const promises = [
        setBusinessContext(testBusinessId),
        setBusinessContext(anotherBusinessId),
        clearBusinessContext()
      ]

      const results = await Promise.allSettled(promises)

      // At least one operation should succeed
      const successfulOperations = results.filter(
        result => result.status === 'fulfilled' && result.value.success
      )
      expect(successfulOperations.length).toBeGreaterThan(0)
    })

    test('should validate business context after browser session restoration', async () => {
      // Simulate restored session with stored business context
      localStorageMock.getItem.mockReturnValue(testBusinessId)
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: testBusinessId, owner_id: testUserId },
              error: null
            })
          })
        })
      })

      const storedContext = getBusinessContext()
      expect(storedContext).toBe(testBusinessId)

      const validation = await validateBusinessContext(storedContext!)
      expect(validation.isValid).toBe(true)
    })

    test('should clear invalid business context from localStorage', async () => {
      localStorageMock.getItem.mockReturnValue('corrupted-data')

      const context = getBusinessContext()

      expect(context).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('current_business_id')
    })
  })
})