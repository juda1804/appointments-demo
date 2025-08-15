import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  businessId?: string;
};

export type AuthError = {
  message: string;
  status?: number;
};

export type AuthResult<T> = {
  data: T;
  error: AuthError | null;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    user_metadata?: { name?: string; business_id?: string };
  };
};

// Business context management
const BUSINESS_ID_KEY = 'current_business_id';

export const businessContext = {
  // Get current business ID from localStorage
  getCurrentBusinessId: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(BUSINESS_ID_KEY);
  },

  // Set current business ID in localStorage
  setCurrentBusinessId: (businessId: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(BUSINESS_ID_KEY, businessId);
  },

  // Clear business context
  clearBusinessContext: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(BUSINESS_ID_KEY);
  },

  // Set database business context for RLS
  setDatabaseBusinessContext: async (businessId: string): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await supabase.rpc('set_current_business_id', {
        business_id: businessId
      });
      
      if (error) {
        return { error: { message: error.message, status: error.code ? parseInt(error.code) : 500 } };
      }
      
      return { error: null };
    } catch (err) {
      return { 
        error: { 
          message: err instanceof Error ? err.message : 'Failed to set business context',
          status: 500 
        } 
      };
    }
  },

  // Validate business context matches user
  validateBusinessContext: async (userId: string, businessId: string): Promise<{ valid: boolean; error: AuthError | null }> => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', businessId)
        .eq('owner_id', userId)
        .single();

      if (error) {
        return { 
          valid: false, 
          error: { message: 'Business context validation failed', status: 403 } 
        };
      }

      return { valid: !!data, error: null };
    } catch (err) {
      return { 
        valid: false, 
        error: { 
          message: err instanceof Error ? err.message : 'Business validation error',
          status: 500 
        } 
      };
    }
  }
};

// Enhanced authentication service wrapper
export const auth = {
  // Sign up with email and password
  signUp: async (email: string, password: string): Promise<AuthResult<{ user: User | null; session: Session | null }>> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        return { 
          data: { user: null, session: null }, 
          error: { message: error.message, status: error.status } 
        };
      }
      
      return { data, error: null };
    } catch (err) {
      return { 
        data: { user: null, session: null }, 
        error: { 
          message: err instanceof Error ? err.message : 'Registration failed',
          status: 500 
        } 
      };
    }
  },

  // Sign in with email and password
  signIn: async (email: string, password: string): Promise<AuthResult<{ user: User | null; session: Session | null }>> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { 
          data: { user: null, session: null }, 
          error: { message: error.message, status: error.status } 
        };
      }

      // If user has business_id in metadata, set business context
      if (data.session?.user?.user_metadata?.business_id) {
        const businessId = data.session.user.user_metadata.business_id;
        businessContext.setCurrentBusinessId(businessId);
        
        // Set database context for RLS
        const contextResult = await businessContext.setDatabaseBusinessContext(businessId);
        if (contextResult.error) {
          // Log warning but don't fail authentication
          console.warn('Failed to set database business context:', contextResult.error);
        }
      }
      
      return { data, error: null };
    } catch (err) {
      return { 
        data: { user: null, session: null }, 
        error: { 
          message: err instanceof Error ? err.message : 'Login failed',
          status: 500 
        } 
      };
    }
  },

  // Sign out with complete cleanup
  signOut: async (): Promise<{ error: AuthError | null }> => {
    try {
      // Clear business context first
      businessContext.clearBusinessContext();
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { error: { message: error.message, status: error.status } };
      }
      
      return { error: null };
    } catch (err) {
      return { 
        error: { 
          message: err instanceof Error ? err.message : 'Logout failed',
          status: 500 
        } 
      };
    }
  },

  // Enhanced logout with comprehensive cleanup
  enhancedSignOut: async (config?: {
    clearBusinessContext?: boolean;
    clearLocalStorage?: boolean;
    redirectToLogin?: boolean;
    redirectUrl?: string;
  }): Promise<{ error: AuthError | null; cleanupResults?: Record<string, boolean> }> => {
    try {
      // Import here to avoid circular dependencies
      const { enhancedLogout } = await import('./logout-session-management');
      
      const result = await enhancedLogout(config);
      
      return {
        error: result.success ? null : result.error || { message: 'Enhanced logout failed', status: 500 },
        cleanupResults: result.cleanupResults,
      };
    } catch (err) {
      return { 
        error: { 
          message: err instanceof Error ? err.message : 'Enhanced logout failed',
          status: 500 
        } 
      };
    }
  },

  // Get current user session
  getSession: async (): Promise<AuthResult<{ session: Session | null }>> => {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        return { 
          data: { session: null }, 
          error: { message: error.message, status: error.status } 
        };
      }
      
      return { data, error: null };
    } catch (err) {
      return { 
        data: { session: null }, 
        error: { 
          message: err instanceof Error ? err.message : 'Session retrieval failed',
          status: 500 
        } 
      };
    }
  },

  // Get current user
  getUser: async (): Promise<AuthResult<{ user: User | null }>> => {
    try {
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        return { 
          data: { user: null }, 
          error: { message: error.message, status: error.status } 
        };
      }
      
      return { data, error: null };
    } catch (err) {
      return { 
        data: { user: null }, 
        error: { 
          message: err instanceof Error ? err.message : 'User retrieval failed',
          status: 500 
        } 
      };
    }
  },

  // Listen to auth changes with business context handling
  onAuthStateChange: (callback: (user: AuthUser | null) => void) => {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const businessId = session.user.user_metadata?.business_id || businessContext.getCurrentBusinessId();
        
        // Set business context if available
        if (businessId) {
          businessContext.setCurrentBusinessId(businessId);
          await businessContext.setDatabaseBusinessContext(businessId);
        }
        
        const user: AuthUser = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name,
          businessId: businessId || undefined,
        };
        callback(user);
      } else {
        // Clear business context on sign out
        businessContext.clearBusinessContext();
        callback(null);
      }
    });
  },

  // Reset password
  resetPassword: async (email: string): Promise<AuthResult<{ message?: string } | null>> => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) {
        return { 
          data: null, 
          error: { message: error.message, status: error.status } 
        };
      }
      
      return { data, error: null };
    } catch (err) {
      return { 
        data: null, 
        error: { 
          message: err instanceof Error ? err.message : 'Password reset failed',
          status: 500 
        } 
      };
    }
  },

  // Update password
  updatePassword: async (password: string): Promise<AuthResult<{ user: User } | null>> => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password,
      });
      
      if (error) {
        return { 
          data: null, 
          error: { message: error.message, status: error.status } 
        };
      }
      
      return { data, error: null };
    } catch (err) {
      return { 
        data: null, 
        error: { 
          message: err instanceof Error ? err.message : 'Password update failed',
          status: 500 
        } 
      };
    }
  },

  // Set business context after registration
  setBusinessContext: async (businessId: string): Promise<{ error: AuthError | null }> => {
    try {
      // Update user metadata with business_id
      const { error: updateError } = await supabase.auth.updateUser({
        data: { business_id: businessId }
      });

      if (updateError) {
        return { error: { message: updateError.message, status: updateError.status } };
      }

      // Set local business context
      businessContext.setCurrentBusinessId(businessId);
      
      // Set database context for RLS
      const contextResult = await businessContext.setDatabaseBusinessContext(businessId);
      return contextResult;
    } catch (err) {
      return { 
        error: { 
          message: err instanceof Error ? err.message : 'Failed to set business context',
          status: 500 
        } 
      };
    }
  },

  // Get current business context
  getCurrentBusinessId: (): string | null => {
    return businessContext.getCurrentBusinessId();
  },

  // Validate user has access to business
  validateBusinessAccess: async (businessId: string): Promise<{ valid: boolean; error: AuthError | null }> => {
    const { data: userData } = await auth.getUser();
    
    if (!userData.user) {
      return { valid: false, error: { message: 'User not authenticated', status: 401 } };
    }

    return businessContext.validateBusinessContext(userData.user.id, businessId);
  }
};