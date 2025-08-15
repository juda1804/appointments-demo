/**
 * Database Operations with Business Context Validation
 * Ensures all database operations are performed within the correct business context
 */

import { createClient } from '@supabase/supabase-js'
import { 
  getValidatedBusinessContext 
} from './rls-context-management'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Type definitions for database operations
export interface DatabaseOperationResult<T> {
  success: boolean
  data?: T
  error?: string
  businessId?: string
}

export interface QueryOptions {
  validateBusinessContext?: boolean // Default: true
  businessId?: string // Override current business context
}

/**
 * Base class for database operations with business context validation
 */
export class BusinessContextDatabase {
  /**
   * Execute a SELECT query with business context validation
   */
  static async select<T>(
    table: string,
    columns: string = '*',
    filters: Record<string, string | number | boolean> = {},
    options: QueryOptions = {}
  ): Promise<DatabaseOperationResult<T[]>> {
    try {
      const businessId = await this.validateAndGetBusinessContext(options)
      if (!businessId) {
        return {
          success: false,
          error: 'No valid business context available for database operation'
        }
      }

      // Build query with business context filter
      let query = supabase
        .from(table)
        .select(columns)

      // Add business_id filter if table has business_id column
      const hasBusinessId = await this.tableHasBusinessId(table)
      if (hasBusinessId) {
        query = query.eq('business_id', businessId)
      }

      // Apply additional filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })

      const { data, error } = await query

      if (error) {
        return {
          success: false,
          error: `Database select error: ${error.message}`,
          businessId
        }
      }

      return {
        success: true,
        data: (data as T[]) || [],
        businessId
      }
    } catch (error) {
      return {
        success: false,
        error: `Unexpected select error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Execute an INSERT operation with business context validation
   */
  static async insert<T>(
    table: string,
    data: Record<string, unknown>,
    options: QueryOptions = {}
  ): Promise<DatabaseOperationResult<T>> {
    try {
      const businessId = await this.validateAndGetBusinessContext(options)
      if (!businessId) {
        return {
          success: false,
          error: 'No valid business context available for database operation'
        }
      }

      // Automatically add business_id if table supports it
      const hasBusinessId = await this.tableHasBusinessId(table)
      if (hasBusinessId) {
        data.business_id = businessId
      }

      const { data: insertedData, error } = await supabase
        .from(table)
        .insert(data)
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: `Database insert error: ${error.message}`,
          businessId
        }
      }

      return {
        success: true,
        data: insertedData,
        businessId
      }
    } catch (error) {
      return {
        success: false,
        error: `Unexpected insert error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Execute an UPDATE operation with business context validation
   */
  static async update<T>(
    table: string,
    id: string,
    data: Record<string, unknown>,
    options: QueryOptions = {}
  ): Promise<DatabaseOperationResult<T>> {
    try {
      const businessId = await this.validateAndGetBusinessContext(options)
      if (!businessId) {
        return {
          success: false,
          error: 'No valid business context available for database operation'
        }
      }

      // Build update query with business context validation
      let query = supabase
        .from(table)
        .update(data)
        .eq('id', id)

      // Add business_id filter if table has business_id column
      const hasBusinessId = await this.tableHasBusinessId(table)
      if (hasBusinessId) {
        query = query.eq('business_id', businessId)
      }

      const { data: updatedData, error } = await query
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Record not found or user does not have access to this record',
            businessId
          }
        }
        return {
          success: false,
          error: `Database update error: ${error.message}`,
          businessId
        }
      }

      return {
        success: true,
        data: updatedData,
        businessId
      }
    } catch (error) {
      return {
        success: false,
        error: `Unexpected update error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Execute a DELETE operation with business context validation
   */
  static async delete(
    table: string,
    id: string,
    options: QueryOptions = {}
  ): Promise<DatabaseOperationResult<boolean>> {
    try {
      const businessId = await this.validateAndGetBusinessContext(options)
      if (!businessId) {
        return {
          success: false,
          error: 'No valid business context available for database operation'
        }
      }

      // Build delete query with business context validation
      let query = supabase
        .from(table)
        .delete()
        .eq('id', id)

      // Add business_id filter if table has business_id column
      const hasBusinessId = await this.tableHasBusinessId(table)
      if (hasBusinessId) {
        query = query.eq('business_id', businessId)
      }

      const { error } = await query

      if (error) {
        return {
          success: false,
          error: `Database delete error: ${error.message}`,
          businessId
        }
      }

      return {
        success: true,
        data: true,
        businessId
      }
    } catch (error) {
      return {
        success: false,
        error: `Unexpected delete error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Execute a custom RPC call with business context validation
   */
  static async rpc<T>(
    functionName: string,
    parameters: Record<string, unknown> = {},
    options: QueryOptions = {}
  ): Promise<DatabaseOperationResult<T>> {
    try {
      const businessId = await this.validateAndGetBusinessContext(options)
      if (!businessId) {
        return {
          success: false,
          error: 'No valid business context available for database operation'
        }
      }

      // Add business_id to RPC parameters
      parameters.business_id = businessId

      const { data, error } = await supabase.rpc(functionName, parameters)

      if (error) {
        return {
          success: false,
          error: `RPC error: ${error.message}`,
          businessId
        }
      }

      return {
        success: true,
        data,
        businessId
      }
    } catch (error) {
      return {
        success: false,
        error: `Unexpected RPC error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Validate business context and return business ID
   */
  private static async validateAndGetBusinessContext(
    options: QueryOptions
  ): Promise<string | null> {
    // Use provided business ID if available (for testing/admin operations)
    if (options.businessId) {
      return options.businessId
    }

    // Skip validation if explicitly disabled (use with caution)
    if (options.validateBusinessContext === false) {
      return 'bypass-validation'
    }

    // Get validated business context
    return await getValidatedBusinessContext()
  }

  /**
   * Check if a table has a business_id column
   */
  private static async tableHasBusinessId(tableName: string): Promise<boolean> {
    // Cache table schema information
    if (!this.schemaCache.has(tableName)) {
      try {
        // Query information_schema to check for business_id column
        const { data, error } = await supabase.rpc('check_table_has_business_id', {
          table_name: tableName
        })

        if (error) {
          console.warn(`Could not check schema for table ${tableName}:`, error.message)
          // Default to true for safety - most tables should have business_id
          this.schemaCache.set(tableName, true)
          return true
        }

        this.schemaCache.set(tableName, data === true)
        return data === true
      } catch (error) {
        console.warn(`Schema check failed for table ${tableName}:`, error)
        // Default to true for safety
        this.schemaCache.set(tableName, true)
        return true
      }
    }

    return this.schemaCache.get(tableName) || true
  }

  // Schema cache to avoid repeated database queries
  private static schemaCache = new Map<string, boolean>()
}

/**
 * Convenience functions for common database operations
 */

/**
 * Safe SELECT with business context validation
 */
export async function selectWithBusinessContext<T>(
  table: string,
  columns?: string,
  filters?: Record<string, string | number | boolean>,
  options?: QueryOptions
): Promise<DatabaseOperationResult<T[]>> {
  return await BusinessContextDatabase.select<T>(table, columns, filters, options)
}

/**
 * Safe INSERT with business context validation
 */
export async function insertWithBusinessContext<T>(
  table: string,
  data: Record<string, unknown>,
  options?: QueryOptions
): Promise<DatabaseOperationResult<T>> {
  return await BusinessContextDatabase.insert<T>(table, data, options)
}

/**
 * Safe UPDATE with business context validation
 */
export async function updateWithBusinessContext<T>(
  table: string,
  id: string,
  data: Record<string, unknown>,
  options?: QueryOptions
): Promise<DatabaseOperationResult<T>> {
  return await BusinessContextDatabase.update<T>(table, id, data, options)
}

/**
 * Safe DELETE with business context validation
 */
export async function deleteWithBusinessContext(
  table: string,
  id: string,
  options?: QueryOptions
): Promise<DatabaseOperationResult<boolean>> {
  return await BusinessContextDatabase.delete(table, id, options)
}

/**
 * Safe RPC call with business context validation
 */
export async function rpcWithBusinessContext<T>(
  functionName: string,
  parameters?: Record<string, unknown>,
  options?: QueryOptions
): Promise<DatabaseOperationResult<T>> {
  return await BusinessContextDatabase.rpc<T>(functionName, parameters, options)
}

/**
 * Business-aware query builder
 */
export class BusinessQueryBuilder {
  private table: string
  private businessId: string | null = null
  private selectColumns: string = '*'
  private filters: Record<string, string | number | boolean> = {}
  private orderBy?: { column: string, ascending: boolean }
  private limitCount?: number

  constructor(table: string) {
    this.table = table
  }

  /**
   * Override business context for this query
   */
  withBusinessContext(businessId: string): this {
    this.businessId = businessId
    return this
  }

  /**
   * Specify columns to select
   */
  select(columns: string): this {
    this.selectColumns = columns
    return this
  }

  /**
   * Add where clause
   */
  where(column: string, value: string | number | boolean): this {
    this.filters[column] = value
    return this
  }

  /**
   * Add order by clause
   */
  order(column: string, ascending: boolean = true): this {
    this.orderBy = { column, ascending }
    return this
  }

  /**
   * Add limit clause
   */
  limit(count: number): this {
    this.limitCount = count
    return this
  }

  /**
   * Execute the query
   */
  async execute<T>(): Promise<DatabaseOperationResult<T[]>> {
    const options: QueryOptions = {}
    if (this.businessId) {
      options.businessId = this.businessId
    }

    const result = await BusinessContextDatabase.select<T>(
      this.table,
      this.selectColumns,
      this.filters,
      options
    )

    // Apply ordering and limiting on the client side if needed
    // In production, these should be handled by the database
    if (result.success && result.data) {
      let data = result.data

      if (this.orderBy) {
        data = data.sort((a, b) => {
          const aVal = (a as Record<string, unknown>)[this.orderBy!.column] as string | number
          const bVal = (b as Record<string, unknown>)[this.orderBy!.column] as string | number
          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
          return this.orderBy!.ascending ? comparison : -comparison
        })
      }

      if (this.limitCount) {
        data = data.slice(0, this.limitCount)
      }

      result.data = data
    }

    return result
  }
}

/**
 * Create a business-aware query builder
 */
export function query(table: string): BusinessQueryBuilder {
  return new BusinessQueryBuilder(table)
}

/**
 * Database operation utilities for business context validation
 */
export const databaseUtils = {
  /**
   * Validate business context before multiple operations
   */
  validateBusinessContext: async (): Promise<string | null> => {
    return await getValidatedBusinessContext()
  },

  /**
   * Execute multiple operations within the same business context
   */
  transaction: async <T>(
    operations: Array<() => Promise<DatabaseOperationResult<unknown>>>,
    businessId?: string
  ): Promise<DatabaseOperationResult<T[]>> => {
    try {
      const contextId = businessId || await getValidatedBusinessContext()
      if (!contextId) {
        return {
          success: false,
          error: 'No valid business context for transaction'
        }
      }

      const results: unknown[] = []
      
      for (const operation of operations) {
        const result = await operation()
        if (!result.success) {
          return {
            success: false,
            error: `Transaction failed: ${result.error}`,
            businessId: contextId
          }
        }
        results.push(result.data)
      }

      return {
        success: true,
        data: results as T[],
        businessId: contextId
      }
    } catch (error) {
      return {
        success: false,
        error: `Transaction error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  },

  /**
   * Count records in a table with business context
   */
  count: async (
    table: string,
    filters: Record<string, string | number | boolean> = {},
    options: QueryOptions = {}
  ): Promise<DatabaseOperationResult<number>> => {
    const result = await BusinessContextDatabase.select<{ count: number }>(
      table,
      'count(*)',
      filters,
      options
    )

    if (!result.success) {
      return {
        success: false,
        error: result.error
      }
    }

    return {
      success: true,
      data: result.data?.[0]?.count || 0,
      businessId: result.businessId
    }
  }
}