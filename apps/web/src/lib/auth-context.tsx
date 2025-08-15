'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, type AuthUser, type AuthError } from './auth';
import { 
  setBusinessContext as setRLSBusinessContext,
  getBusinessContext,
  clearBusinessContext,
  getValidatedBusinessContext 
} from './rls-context-management';
import type { SessionTimeoutConfig } from './logout-session-management';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  enhancedSignOut: (config?: {
    clearBusinessContext?: boolean;
    clearLocalStorage?: boolean;
    redirectToLogin?: boolean;
    redirectUrl?: string;
  }) => Promise<{ error: AuthError | null; cleanupResults?: Record<string, boolean> }>;
  refreshSession: () => Promise<void>;
  setBusinessContext: (businessId: string) => Promise<{ error: AuthError | null }>;
  getCurrentBusinessId: () => string | null;
  initializeSessionTimeout: (config?: Partial<SessionTimeoutConfig>) => void;
  resetSessionTimeout: () => void;
  stopSessionTimeout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize authentication state on mount with RLS context
  useEffect(() => {
    let mounted = true;
    let authSubscription: { data: { subscription: { unsubscribe: () => void } } } | null = null;

    const initializeAuth = async () => {
      try {
        // Check for existing session
        const { data: sessionData } = await auth.getSession();
        
        if (mounted && sessionData.session?.user) {
          // Automatically restore and validate business context from RLS system
          const validatedBusinessId = await getValidatedBusinessContext();
          
          // If we have a valid business context, ensure it's set in database
          if (validatedBusinessId) {
            const contextResult = await setRLSBusinessContext(validatedBusinessId);
            if (!contextResult.success) {
              console.warn('Failed to restore business context:', contextResult.error);
              await clearBusinessContext();
            }
          }

          const authUser: AuthUser = {
            id: sessionData.session.user.id,
            email: sessionData.session.user.email || '',
            name: sessionData.session.user.user_metadata?.name,
            businessId: validatedBusinessId || undefined,
          };

          if (mounted) {
            setUser(authUser);
          }
        }

        // Set up auth state change listener with automatic business context setting
        authSubscription = auth.onAuthStateChange(async (authUser: AuthUser | null) => {
          if (mounted) {
            if (authUser) {
              // User logged in - attempt to restore business context
              const validatedBusinessId = await getValidatedBusinessContext();
              
              if (validatedBusinessId) {
                const contextResult = await setRLSBusinessContext(validatedBusinessId);
                if (contextResult.success) {
                  authUser.businessId = validatedBusinessId;
                } else {
                  console.warn('Failed to set business context on auth change:', contextResult.error);
                }
              }
            } else {
              // User logged out - clear business context
              await clearBusinessContext();
            }
            
            setUser(authUser);
          }
        });

      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setIsInitialized(true);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.data?.subscription?.unsubscribe?.();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await auth.signIn(email, password);
      
      if (result.error) {
        return { error: result.error };
      }

      // After successful login, attempt to restore business context automatically
      try {
        const validatedBusinessId = await getValidatedBusinessContext();
        if (validatedBusinessId) {
          const contextResult = await setRLSBusinessContext(validatedBusinessId);
          if (!contextResult.success) {
            console.warn('Failed to restore business context after login:', contextResult.error);
          }
        }
      } catch (contextError) {
        console.warn('Error during business context restoration:', contextError);
      }

      // User state will be updated via the auth state change listener
      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: { message: 'Error inesperado al iniciar sesión' } };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await auth.signUp(email, password);
      
      if (result.error) {
        return { error: result.error };
      }

      // User state will be updated via the auth state change listener
      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: { message: 'Error inesperado al registrar usuario' } };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      // Clear business context before signing out
      await clearBusinessContext();
      await auth.signOut();
      // User state will be updated via the auth state change listener
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const enhancedSignOut = async (config?: {
    clearBusinessContext?: boolean;
    clearLocalStorage?: boolean;
    redirectToLogin?: boolean;
    redirectUrl?: string;
  }) => {
    setIsLoading(true);
    try {
      const result = await auth.enhancedSignOut(config);
      // Note: If redirectToLogin is true, user will be redirected
      return result;
    } catch (error) {
      console.error('Enhanced sign out error:', error);
      return { error: { message: 'Enhanced sign out failed' } };
    } finally {
      setIsLoading(false);
    }
  };

  // Session timeout management functions
  const initializeSessionTimeout = (config?: Partial<SessionTimeoutConfig>) => {
    try {
      import('./logout-session-management').then(({ initializeSessionTimeout, setupActivityTracking }) => {
        initializeSessionTimeout(config, {
          onWarning: () => {
            console.warn('Session timeout warning - session will expire soon');
            // You can show a warning notification here
          },
          onTimeout: () => {
            console.warn('Session timeout - automatic logout');
            // Automatic logout handled by session manager
          },
        });
        
        // Setup user activity tracking
        setupActivityTracking();
      });
    } catch (error) {
      console.error('Failed to initialize session timeout:', error);
    }
  };

  const resetSessionTimeout = () => {
    try {
      import('./logout-session-management').then(({ resetSessionTimeout }) => {
        resetSessionTimeout();
      });
    } catch (error) {
      console.error('Failed to reset session timeout:', error);
    }
  };

  const stopSessionTimeout = () => {
    try {
      import('./logout-session-management').then(({ stopSessionTimeout }) => {
        stopSessionTimeout();
      });
    } catch (error) {
      console.error('Failed to stop session timeout:', error);
    }
  };

  const refreshSession = async () => {
    try {
      const { data: sessionData } = await auth.getSession();
      
      if (sessionData.session?.user) {
        // Restore and validate business context using RLS system
        const validatedBusinessId = await getValidatedBusinessContext();
        
        // Set RLS context if valid business context exists
        if (validatedBusinessId) {
          const contextResult = await setRLSBusinessContext(validatedBusinessId);
          if (!contextResult.success) {
            console.warn('Failed to restore business context during refresh:', contextResult.error);
            await clearBusinessContext();
          }
        }

        const authUser: AuthUser = {
          id: sessionData.session.user.id,
          email: sessionData.session.user.email || '',
          name: sessionData.session.user.user_metadata?.name,
          businessId: validatedBusinessId || undefined,
        };

        setUser(authUser);
      } else {
        setUser(null);
        await clearBusinessContext();
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      setUser(null);
      await clearBusinessContext();
    }
  };

  const setBusinessContextWrapper = async (businessId: string) => {
    try {
      // Use RLS context management for setting business context
      const result = await setRLSBusinessContext(businessId);
      
      if (!result.success) {
        return { error: { message: result.error || 'Error al establecer el contexto del negocio' } };
      }

      // Update user state with new business context
      if (user) {
        setUser({
          ...user,
          businessId: businessId
        });
      }

      return { error: null };
    } catch (error) {
      console.error('Error setting business context:', error);
      return { error: { message: 'Error al establecer el contexto del negocio' } };
    }
  };

  const getCurrentBusinessId = () => {
    return getBusinessContext();
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isInitialized,
    signIn,
    signUp,
    signOut,
    enhancedSignOut,
    refreshSession,
    setBusinessContext: setBusinessContextWrapper,
    getCurrentBusinessId,
    initializeSessionTimeout,
    resetSessionTimeout,
    stopSessionTimeout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for protecting routes
export function useRequireAuth() {
  const { user, isInitialized } = useAuth();
  
  useEffect(() => {
    if (isInitialized && !user) {
      // Redirect to login page
      window.location.href = '/login';
    }
  }, [user, isInitialized]);

  return { user, isInitialized, isAuthenticated: !!user };
}

// Hook for business context requirement
export function useRequireBusinessContext() {
  const { user, isInitialized, getCurrentBusinessId } = useAuth();
  const businessId = getCurrentBusinessId();
  
  useEffect(() => {
    if (isInitialized && user && !businessId) {
      // Redirect to business setup or registration
      window.location.href = '/register/business';
    }
  }, [user, isInitialized, businessId]);

  return { user, isInitialized, businessId, hasBusinessContext: !!businessId };
}