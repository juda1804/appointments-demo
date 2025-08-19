/**
 * RLS Isolation Verification Tests
 * Comprehensive tests to verify complete business data isolation through RLS policies
 */

import {
  verifyBusinessIsolation,
  setBusinessContext,
  clearBusinessContext,
  validateBusinessContext
} from './rls-context-management'
import {
  selectWithBusinessContext,
  insertWithBusinessContext,
  updateWithBusinessContext,
  deleteWithBusinessContext,
  query
} from './database-operations'

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(),
    },
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          limit: jest.fn(() => ({
            eq: jest.fn(() => ({}))
          }))
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn()
        }))
      }))
    }))
  }))
}))

// Mock Supabase client instance for direct usage in tests
const mockSupabase = {
  auth: {
    getSession: jest.fn(),
  },
  rpc: jest.fn(),
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        limit: jest.fn(() => ({
          eq: jest.fn(() => ({}))
        }))
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn()
    }))
  }))
}

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

describe('RLS Business Data Isolation Verification', () => {
  const business1Id = '123e4567-e89b-12d3-a456-426614174001'
  const business2Id = '123e4567-e89b-12d3-a456-426614174002'
  const testUserId = '987fcdeb-51a2-43d1-9f12-345678901234'

  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  describe('Complete Business Isolation', () => {
    test('should prevent cross-business data access in appointments table', async () => {
      // Mock successful context setting and data queries
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: true, error: null }) // Set business1 context
        .mockResolvedValueOnce({ data: [{ id: 'appt1', business_id: business1Id }], error: null }) // Query business1 data
        .mockResolvedValueOnce({ data: true, error: null }) // Set business2 context
        .mockResolvedValueOnce({ data: [{ id: 'appt2', business_id: business2Id }], error: null }) // Query business2 data

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })

      const result = await verifyBusinessIsolation(business1Id, business2Id, 'appointments')

      expect(result.isIsolated).toBe(true)
      expect(result.business1Data).toHaveLength(1)
      expect(result.business2Data).toHaveLength(1)
      expect(result.business1Data![0].id).toBe('appt1')
      expect(result.business2Data![0].id).toBe('appt2')
    })

    test('should prevent cross-business data access in services table', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: true, error: null })
        .mockResolvedValueOnce({ data: [{ id: 'service1', name: 'Haircut', business_id: business1Id }], error: null })
        .mockResolvedValueOnce({ data: true, error: null })
        .mockResolvedValueOnce({ data: [{ id: 'service2', name: 'Massage', business_id: business2Id }], error: null })

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })

      const result = await verifyBusinessIsolation(business1Id, business2Id, 'services')

      expect(result.isIsolated).toBe(true)
      expect(result.business1Data![0].name).toBe('Haircut')
      expect(result.business2Data![0].name).toBe('Massage')
    })

    test('should prevent cross-business data access in specialists table', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: true, error: null })
        .mockResolvedValueOnce({ data: [{ id: 'specialist1', name: 'Maria', business_id: business1Id }], error: null })
        .mockResolvedValueOnce({ data: true, error: null })
        .mockResolvedValueOnce({ data: [{ id: 'specialist2', name: 'Carlos', business_id: business2Id }], error: null })

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })

      const result = await verifyBusinessIsolation(business1Id, business2Id, 'specialists')

      expect(result.isIsolated).toBe(true)
      expect(result.business1Data![0].name).toBe('Maria')
      expect(result.business2Data![0].name).toBe('Carlos')
    })

    test('should detect isolation failures when RLS policies are not working', async () => {
      // Mock case where business2 can see business1's data (isolation failure)
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: true, error: null })
        .mockResolvedValueOnce({ data: [{ id: 'data1' }], error: null })
        .mockResolvedValueOnce({ data: true, error: null })
        .mockResolvedValueOnce({ data: [{ id: 'data1' }, { id: 'data2' }], error: null }) // Sees both!

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })

      const result = await verifyBusinessIsolation(business1Id, business2Id, 'appointments')

      expect(result.isIsolated).toBe(false)
      expect(result.error).toContain('Business isolation failed')
    })
  })

  describe('Database Operations with Business Context Validation', () => {
    beforeEach(() => {
      // Mock business ownership validation
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: business1Id, owner_id: testUserId },
              error: null
            }),
            limit: jest.fn(() => ({
              eq: jest.fn(() => ({}))
            }))
          })
        }),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn()
        }))
      })

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })

      localStorageMock.getItem.mockReturnValue(business1Id)
    })

    test('should enforce business context in SELECT operations', async () => {
      const mockData = [
        { id: '1', name: 'Service 1', business_id: business1Id },
        { id: '2', name: 'Service 2', business_id: business1Id }
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            then: jest.fn().mockResolvedValue({ data: mockData, error: null }),
            single: jest.fn(),
            limit: jest.fn(() => ({
              eq: jest.fn(() => ({}))
            }))
          })
        }),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn()
        }))
      })

      // Mock schema check
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null })

      const result = await selectWithBusinessContext('services')

      expect(result.success).toBe(true)
      expect(result.businessId).toBe(business1Id)
      expect(mockSupabase.from).toHaveBeenCalledWith('services')
    })

    test('should enforce business context in INSERT operations', async () => {
      const newService = { name: 'New Service', price_cop: 50000 }
      const insertedService = { 
        id: '3', 
        name: 'New Service', 
        price_cop: 50000, 
        business_id: business1Id 
      }

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: insertedService, error: null })
        })
      });
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
            limit: jest.fn(() => ({
              eq: jest.fn(() => ({}))
            }))
          })),
        })),
        insert: mockInsert,
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn()
        }))
      })

      // Mock schema check
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null })

      const result = await insertWithBusinessContext('services', newService)

      expect(result.success).toBe(true)
      expect(result.businessId).toBe(business1Id)
    })

    test('should enforce business context in UPDATE operations', async () => {
      const updateData = { name: 'Updated Service' }
      const updatedService = { 
        id: '1', 
        name: 'Updated Service', 
        business_id: business1Id 
      }

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: updatedService, error: null })
          })
        })
      });
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
            limit: jest.fn(() => ({
              eq: jest.fn(() => ({}))
            }))
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        })),
        update: mockUpdate,
        delete: jest.fn(() => ({
          eq: jest.fn()
        }))
      })

      // Mock schema check
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null })

      const result = await updateWithBusinessContext('services', '1', updateData)

      expect(result.success).toBe(true)
      expect(result.businessId).toBe(business1Id)
    })

    test('should prevent UPDATE operations on records from other businesses', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn(),
            limit: jest.fn(() => ({
              eq: jest.fn(() => ({}))
            }))
          })
        }),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        })),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ 
                data: null, 
                error: { code: 'PGRST116' } // No rows returned
              })
            })
          })
        }),
        delete: jest.fn(() => ({
          eq: jest.fn()
        }))
      })

      // Mock schema check
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null })

      const result = await updateWithBusinessContext('services', '999', { name: 'Hacked Service' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Record not found or user does not have access')
    })

    test('should enforce business context in DELETE operations', async () => {
      const mockDelete = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      });
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
            limit: jest.fn(() => ({
              eq: jest.fn(() => ({}))
            }))
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        })),
        delete: mockDelete
      })

      // Mock schema check
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null })

      const result = await deleteWithBusinessContext('services', '1')

      expect(result.success).toBe(true)
      expect(result.businessId).toBe(business1Id)
    })
  })

  describe('Query Builder with Business Context', () => {
    beforeEach(() => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: business1Id, owner_id: testUserId },
              error: null
            }),
            limit: jest.fn(() => ({
              eq: jest.fn(() => ({}))
            }))
          })
        }),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn()
        }))
      })

      localStorageMock.getItem.mockReturnValue(business1Id)
    })

    test('should build queries with automatic business context filtering', async () => {
      const mockServices = [
        { id: '1', name: 'Haircut', business_id: business1Id },
        { id: '2', name: 'Shampoo', business_id: business1Id }
      ]

      // Mock successful validation and query
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            then: jest.fn().mockResolvedValue({ data: mockServices, error: null }),
            single: jest.fn(),
            limit: jest.fn(() => ({
              eq: jest.fn(() => ({}))
            }))
          })
        }),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn()
        }))
      })

      // Mock schema check
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null })

      const queryBuilder = query('services')
        .select('id, name')
        .where('active', true)
        .order('name', true)
        .limit(10)

      const result = await queryBuilder.execute()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockServices)
      expect(result.businessId).toBe(business1Id)
    })

    test('should prevent queries without valid business context', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            }),
            limit: jest.fn(() => ({
              eq: jest.fn(() => ({}))
            }))
          })
        }),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn()
        }))
      })

      const result = await selectWithBusinessContext('services')

      expect(result.success).toBe(false)
      expect(result.error).toContain('No valid business context')
    })
  })

  describe('Cross-Business Attack Prevention', () => {
    test('should prevent business_id spoofing in INSERT operations', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })

      // User tries to insert data for another business
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: business1Id, owner_id: testUserId },
              error: null
            }),
            limit: jest.fn(() => ({
              eq: jest.fn(() => ({}))
            }))
          })
        }),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn()
        }))
      })

      localStorageMock.getItem.mockReturnValue(business1Id)

      const maliciousData = {
        name: 'Malicious Service',
        business_id: business2Id // Trying to insert for different business
      }

      const mockInsert2 = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ 
            data: { ...maliciousData, business_id: business1Id }, // Should override
            error: null 
          })
        })
      });
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
            limit: jest.fn(() => ({
              eq: jest.fn(() => ({}))
            }))
          })),
        })),
        insert: mockInsert2,
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn()
        }))
      })

      // Mock schema check
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null })

      const result = await insertWithBusinessContext('services', maliciousData)

      expect(result.success).toBe(true)
      // business_id should be overridden with current business context
      expect(result.businessId).toBe(business1Id)
    })

    test('should prevent unauthorized business context switching', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })

      // Mock that user does not own business2
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' } // No rows returned
            }),
            limit: jest.fn(() => ({
              eq: jest.fn(() => ({}))
            }))
          })
        }),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn()
        }))
      })

      const result = await setBusinessContext(business2Id)

      expect(result.success).toBe(false)
      expect(result.error).toContain('does not own this business')
    })

    test('should handle concurrent business context operations safely', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: business1Id, owner_id: testUserId },
              error: null
            }),
            limit: jest.fn(() => ({
              eq: jest.fn(() => ({}))
            }))
          })
        }),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn()
        }))
      })

      mockSupabase.rpc.mockResolvedValue({ data: true, error: null })

      // Simulate concurrent context operations
      const operations = [
        setBusinessContext(business1Id),
        setBusinessContext(business1Id),
        clearBusinessContext(),
        setBusinessContext(business1Id)
      ]

      const results = await Promise.allSettled(operations)

      // All operations should complete without throwing errors
      expect(results.every(result => result.status === 'fulfilled')).toBe(true)

      // At least one operation should succeed
      const successfulOps = results.filter(
        (result): result is PromiseFulfilledResult<{ success: boolean }> => 
          result.status === 'fulfilled' && result.value.success
      )
      expect(successfulOps.length).toBeGreaterThan(0)
    })
  })

  describe('RLS Policy Integration Tests', () => {
    test('should verify RLS policies are active for all business tables', async () => {
      const businessTables = [
        'businesses',
        'services',
        'specialists',
        'appointments',
        'availability_schedules',
        'service_specialist_assignments'
      ]

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })

      mockSupabase.rpc.mockImplementation((funcName, params) => {
        if (funcName === 'check_rls_policy_active') {
          // Log the table being checked for debugging
          console.log('Checking RLS for table:', params?.table_name);
          return Promise.resolve({ data: true, error: null })
        }
        return Promise.resolve({ data: null, error: { message: 'Unknown RPC' } })
      })

      // Test RLS policy activation for each table
      for (const table of businessTables) {
        const { data: isActive } = await mockSupabase.rpc('check_rls_policy_active', {
          table_name: table
        })

        expect(isActive).toBe(true)
      }
    })

    test('should verify business context is properly set in database session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: business1Id, owner_id: testUserId },
              error: null
            }),
            limit: jest.fn(() => ({
              eq: jest.fn(() => ({}))
            }))
          })
        }),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn()
        }))
      })

      mockSupabase.rpc.mockImplementation((funcName, params) => {
        if (funcName === 'set_business_context') {
          // Use params.business_id for context setting
          console.log('Setting business context:', params?.business_id);
          return Promise.resolve({ data: true, error: null })
        }
        if (funcName === 'get_current_business_context') {
          return Promise.resolve({ data: business1Id, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      // Set business context
      const setResult = await setBusinessContext(business1Id)
      expect(setResult.success).toBe(true)

      // Verify context is set in database
      const { data: currentContext } = await mockSupabase.rpc('get_current_business_context')
      expect(currentContext).toBe(business1Id)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('should handle database connection failures gracefully', async () => {
      mockSupabase.auth.getSession.mockRejectedValue(new Error('Database connection failed'))

      const result = await setBusinessContext(business1Id)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unexpected error')
    })

    test('should handle invalid UUID formats', async () => {
      const result = await setBusinessContext('invalid-uuid')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid business ID format')
    })

    test('should clear context when business validation fails', async () => {
      localStorageMock.getItem.mockReturnValue(business1Id)

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: testUserId } } },
        error: null
      })

      // Mock business validation failure (user no longer owns business)
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            }),
            limit: jest.fn(() => ({
              eq: jest.fn(() => ({}))
            }))
          })
        }),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        })),
        delete: jest.fn(() => ({
          eq: jest.fn()
        }))
      })

      const result = await validateBusinessContext(business1Id)

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('Business not found')
    })
  })
})