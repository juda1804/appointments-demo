'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, type AuthUser, type AuthError } from './auth';
import { businessContext } from './business-context';
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
  const [isLoading, setIsLoading] = useState(true); // Start with loading = true
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize authentication state on mount with RLS context
  useEffect(() => {
    let mounted = true;
    let authSubscription: { data: { subscription: { unsubscribe: () => void } } } | null = null;

    const initializeAuth = async () => {
      try {
        console.log('🔐 AuthContext: Initializing auth state...');
        
        // Add timeout to prevent infinite loading
        const authCheckPromise = auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth initialization timeout')), 10000)
        );
        
        const result = await Promise.race([authCheckPromise, timeoutPromise]);
        const { data: sessionData } = result as Awaited<ReturnType<typeof auth.getSession>>;
        
        if (mounted && sessionData.session?.user) {
          console.log('🔐 AuthContext: Session found, setting up user...');
          
          // Try to get business context with auto-discovery and timeout
          let validatedBusinessId: string | null = null;
          try {
            const businessContextPromise = businessContext.getCurrentBusinessId();
            const businessTimeoutPromise = new Promise<string | null>((resolve) => 
              setTimeout(() => resolve(null), 5000) // Increased timeout for discovery
            );
            
            validatedBusinessId = await Promise.race([businessContextPromise, businessTimeoutPromise]);
            
            if (validatedBusinessId) {
              console.log('🔐 AuthContext: Business context available:', validatedBusinessId);
              // Context is already set by businessContext.getCurrentBusinessId if discovered
            } else {
              console.log('🔐 AuthContext: No business context found or discovered');
            }
          } catch (businessError) {
            console.warn('🔐 AuthContext: Business context error:', businessError);
            validatedBusinessId = null;
          }

          const authUser: AuthUser = {
            id: sessionData.session.user.id,
            email: sessionData.session.user.email || '',
            name: sessionData.session.user.user_metadata?.name,
            businessId: validatedBusinessId || undefined,
          };

          if (mounted) {
            console.log('🔐 AuthContext: Setting user state:', { 
              userId: authUser.id, 
              hasBusinessId: !!authUser.businessId 
            });
            setUser(authUser);
          }
        } else {
          console.log('🔐 AuthContext: No existing session found');
        }

        // Set up auth state change listener with automatic business context setting
        authSubscription = auth.onAuthStateChange(async (authUser: AuthUser | null) => {
          if (mounted) {
            if (authUser) {
              // User logged in - attempt to get or discover business context
              const validatedBusinessId = businessContext.getCurrentBusinessId();
              
              if (validatedBusinessId) {
                authUser.businessId = validatedBusinessId;
                console.log('🔐 AuthContext: Business context set on auth change:', validatedBusinessId);
              } else {
                console.log('🔐 AuthContext: No business context available on auth change');
              }
            } else {
              // User logged out - clear business context
              await businessContext.clearBusinessContext();
            }
            
            setUser(authUser);
          }
        });

      } catch (error) {
        console.error('🔐 AuthContext: Error initializing auth:', error);
      } finally {
        if (mounted) {
          console.log('🔐 AuthContext: Auth initialization complete');
          setIsInitialized(true);
          setIsLoading(false); // Critical: Always clear loading state
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

      // After successful login, attempt to get or discover business context automatically
      try {
        const validatedBusinessId = businessContext.getCurrentBusinessId();
        if (validatedBusinessId) {
          console.log('🔐 AuthContext: Business context set after login:', validatedBusinessId);
        } else {
          console.log('🔐 AuthContext: No business context available after login');
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
      console.log('🔐 AuthContext: Starting basic signOut process');
      
      // Clear business context before signing out
      await businessContext.clearBusinessContext();
      const result = await auth.signOut();
      
      if (result.error) {
        console.error('🔐 AuthContext: Basic signOut failed:', result.error);
        throw new Error(result.error.message);
      }
      
      console.log('🔐 AuthContext: Basic signOut completed');
      // User state will be updated via the auth state change listener
    } catch (error) {
      console.error('🔐 AuthContext: Sign out error:', error);
      
      // Even if there's an error, try to clear local state
      try {
        await businessContext.clearBusinessContext();
        setUser(null);
      } catch (cleanupError) {
        console.error('🔐 AuthContext: Failed to cleanup after signOut error:', cleanupError);
      }
      
      throw error; // Re-throw to let caller handle
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
      console.log('🔐 AuthContext: Starting enhanced signOut process with config:', config);
      
      const result = await auth.enhancedSignOut(config);
      
      if (result.error) {
        console.error('🔐 AuthContext: Enhanced signOut failed:', result.error);
        
        // Even if enhanced logout fails, try emergency cleanup
        console.log('🔐 AuthContext: Attempting emergency cleanup after enhanced signOut failure');
        try {
          await businessContext.clearBusinessContext();
          setUser(null);
          
          // Force redirect if configured, even on failure
          if (config?.redirectToLogin && typeof window !== 'undefined') {
            const redirectUrl = config.redirectUrl || '/login';
            console.log('🔐 AuthContext: Force redirecting after failed logout to:', redirectUrl);
            window.location.replace(redirectUrl);
          }
        } catch (cleanupError) {
          console.error('🔐 AuthContext: Emergency cleanup also failed:', cleanupError);
        }
      } else {
        console.log('🔐 AuthContext: Enhanced signOut completed successfully');
        // Clear user state immediately to prevent UI inconsistencies
        setUser(null);
      }
      
      return result;
    } catch (error) {
      console.error('🔐 AuthContext: Unexpected error during enhanced sign out:', error);
      
      // Emergency fallback - clear everything and redirect
      try {
        console.log('🔐 AuthContext: Performing emergency fallback logout');
        await businessContext.clearBusinessContext();
        setUser(null);
        
        if (config?.redirectToLogin && typeof window !== 'undefined') {
          const redirectUrl = config.redirectUrl || '/login?reason=emergency';
          console.log('🔐 AuthContext: Emergency redirect to:', redirectUrl);
          window.location.replace(redirectUrl);
        }
      } catch (fallbackError) {
        console.error('🔐 AuthContext: Emergency fallback failed:', fallbackError);
      }
      
      return { 
        error: { 
          message: error instanceof Error ? error.message : 'Enhanced sign out failed' 
        } 
      };
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
        // Restore and validate business context using RLS system with auto-discovery
        const validatedBusinessId = businessContext.getCurrentBusinessId();
        
        if (!validatedBusinessId) {
          console.log('🔐 AuthContext: No business context available during refresh');
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
        await businessContext.clearBusinessContext();
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      setUser(null);
      await businessContext.clearBusinessContext();
    }
  };

  const setBusinessContextWrapper = async (businessId: string) => {
    try {
      // Use RLS context management for setting business context
      const result = await businessContext.setBusinessContext(businessId);
      
      if (!result.success) {
        const errorMessage = result.error?.message || 'Error al establecer el contexto del negocio';
        return { error: { message: errorMessage } };
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
    return businessContext.getCurrentBusinessId();
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