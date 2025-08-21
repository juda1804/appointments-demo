/**
 * Unified Business Context Management
 * Single source of truth for all business context operations
 * Consolidates localStorage, RLS context, and validation logic
 */

import { createClient } from '@supabase/supabase-js';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Constants
const STORAGE_KEY = 'current_business_id';

// Initialize Supabase client for RLS operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type BusinessContextError = {
  message: string;
  code?: string;
};

export type BusinessContextResult = {
  success: boolean;
  error?: BusinessContextError;
  businessId?: string;
};

/**
 * Unified Business Context Manager
 * Single source of truth for all business context operations
 */
export const businessContext = {
  /**
   * Get current business ID - THE authoritative method
   * All other getCurrentBusinessId calls should use this
   */
  getCurrentBusinessId(): string | null {
    // Server-side: no localStorage access
    if (typeof window === 'undefined') {
      return null;
    }

    const businessId = localStorage.getItem(STORAGE_KEY);
    
    // Validate stored business ID format
    if (businessId && UUID_REGEX.test(businessId)) {
      return businessId;
    }

    // Clear invalid business context
    if (businessId) {
      console.warn('Invalid business ID found in storage, clearing:', businessId);
      localStorage.removeItem(STORAGE_KEY);
    }
    
    return null;
  },

  /**
   * Set business context with full synchronization
   * Updates localStorage AND database RLS context
   */
  async setBusinessContext(businessId: string): Promise<BusinessContextResult> {
    try {
      // Validate business ID format
      if (!businessId || !UUID_REGEX.test(businessId)) {
        return {
          success: false,
          error: { message: 'Invalid business ID format', code: 'INVALID_FORMAT' }
        };
      }

      // 1. Set localStorage (client-side state)
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, businessId);
      }

      // 2. Set database RLS context
      const { error: rlsError } = await supabase.rpc('set_current_business_id', {
        business_uuid: businessId
      });

      if (rlsError) {
        // Rollback localStorage on RLS failure
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY);
        }
        
        return {
          success: false,
          error: { 
            message: `Failed to set database context: ${rlsError.message}`,
            code: rlsError.code || 'RLS_ERROR'
          }
        };
      }

      console.log('✅ Business context set successfully:', businessId);
      return { success: true, businessId };

    } catch (error) {
      // Rollback localStorage on any failure
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }

      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error setting business context',
          code: 'UNEXPECTED_ERROR'
        }
      };
    }
  },

  /**
   * Clear business context completely
   * Removes from localStorage AND clears RLS context
   */
  async clearBusinessContext(): Promise<BusinessContextResult> {
    try {
      // 1. Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }

      // 2. Clear database RLS context
      const { error: rlsError } = await supabase.rpc('set_current_business_id', {
        business_uuid: null
      });

      if (rlsError) {
        console.warn('Failed to clear database context:', rlsError.message);
        // Don't fail the operation - localStorage is already cleared
      }

      console.log('✅ Business context cleared successfully');
      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error clearing business context',
          code: 'CLEAR_ERROR'
        }
      };
    }
  },

  /**
   * Validate that user has access to the specified business
   */
  async validateBusinessAccess(userId: string, businessId: string): Promise<BusinessContextResult> {
    try {
      if (!UUID_REGEX.test(businessId)) {
        return {
          success: false,
          error: { message: 'Invalid business ID format', code: 'INVALID_FORMAT' }
        };
      }

      const { data, error } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', businessId)
        .eq('owner_id', userId)
        .single();

      if (error) {
        return {
          success: false,
          error: { 
            message: 'Business access validation failed', 
            code: error.code || 'ACCESS_DENIED' 
          }
        };
      }

      return { success: !!data, businessId };

    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Business validation error',
          code: 'VALIDATION_ERROR'
        }
      };
    }
  },

  /**
   * Check if business context is currently set
   */
  hasBusinessContext(): boolean {
    return this.getCurrentBusinessId() !== null;
  },

  /**
   * Get business context with additional metadata
   */
  getBusinessContextInfo(): {
    businessId: string | null;
    isSet: boolean;
    isValid: boolean;
    source: 'localStorage' | 'none';
  } {
    const businessId = this.getCurrentBusinessId();
    
    return {
      businessId,
      isSet: businessId !== null,
      isValid: businessId !== null && UUID_REGEX.test(businessId),
      source: businessId !== null ? 'localStorage' : 'none'
    };
  },

  /**
   * Test RLS isolation - useful for debugging
   */
  async testRLSIsolation(): Promise<{
    isWorking: boolean;
    businessesWithoutContext: number;
    error?: string;
  }> {
    try {
      // First clear any existing context
      await supabase.rpc('set_current_business_id', { business_uuid: null });

      // Try to access all businesses without setting context
      const { data: allBusinesses, error } = await supabase
        .from('businesses')
        .select('id, name');

      if (error) {
        return {
          isWorking: false,
          businessesWithoutContext: 0,
          error: error.message
        };
      }

      const count = allBusinesses?.length || 0;
      
      return {
        isWorking: count === 0,
        businessesWithoutContext: count,
        error: count > 0 ? `RLS may not be working - ${count} businesses returned without context` : undefined
      };

    } catch (error) {
      return {
        isWorking: false,
        businessesWithoutContext: 0,
        error: error instanceof Error ? error.message : 'Unknown test error'
      };
    }
  }
};

// Legacy compatibility exports - gradually remove these
export const {
  getCurrentBusinessId,
  setBusinessContext,
  clearBusinessContext,
  validateBusinessAccess,
  hasBusinessContext
} = businessContext;

// For gradual migration - alias the main functions
export const getBusinessContext = getCurrentBusinessId;
export const setCurrentBusinessId = setBusinessContext;