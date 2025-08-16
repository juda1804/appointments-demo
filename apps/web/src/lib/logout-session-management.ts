/**
 * Enhanced Logout and Session Management
 * Comprehensive logout functionality with complete session cleanup,
 * business context clearing, and authentication state management
 */

import { supabase } from './supabase';
import { auth, businessContext, type AuthError } from './auth';
import { clearBusinessContext, getBusinessContext } from './rls-context-management';
import { jwtTokenManager } from './jwt-token-management';

export interface LogoutResult {
  success: boolean;
  error?: AuthError;
  cleanupResults?: {
    supabaseSession: boolean;
    businessContext: boolean;
    localStorage: boolean;
    databaseContext: boolean;
  };
}

export interface SessionTimeoutConfig {
  timeoutWarningMs: number; // Show warning before timeout
  timeoutMs: number; // Automatic logout timeout
  checkIntervalMs: number; // How often to check for timeout
  enabled: boolean;
}

export interface SessionCleanupConfig {
  clearSupabaseSession: boolean;
  clearBusinessContext: boolean;
  clearLocalStorage: boolean;
  clearDatabaseContext: boolean;
  redirectToLogin: boolean;
  redirectUrl?: string;
}

/**
 * Default session timeout configuration
 * Warning at 55 minutes, timeout at 60 minutes (1 hour)
 */
export const DEFAULT_SESSION_TIMEOUT_CONFIG: SessionTimeoutConfig = {
  timeoutWarningMs: 55 * 60 * 1000, // 55 minutes
  timeoutMs: 60 * 60 * 1000, // 60 minutes
  checkIntervalMs: 60 * 1000, // Check every minute
  enabled: true,
};

/**
 * Default cleanup configuration - clean everything
 */
export const DEFAULT_CLEANUP_CONFIG: SessionCleanupConfig = {
  clearSupabaseSession: true,
  clearBusinessContext: true,
  clearLocalStorage: true,
  clearDatabaseContext: true,
  redirectToLogin: true,
  redirectUrl: '/login',
};

/**
 * Enhanced logout function with comprehensive cleanup
 * Clears Supabase session, business context, localStorage, and database context
 */
export async function enhancedLogout(
  config: Partial<SessionCleanupConfig> = {}
): Promise<LogoutResult> {
  const cleanupConfig = { ...DEFAULT_CLEANUP_CONFIG, ...config };
  
  const cleanupResults = {
    supabaseSession: false,
    businessContext: false,
    localStorage: false,
    databaseContext: false,
  };

  let hasErrors = false;
  let lastError: AuthError | undefined;

  try {
    // Step 1: Clear business context from database and localStorage
    if (cleanupConfig.clearBusinessContext || cleanupConfig.clearDatabaseContext) {
      try {
        console.log('Clearing business context...');
        const businessContextResult = await clearBusinessContext();
        cleanupResults.businessContext = businessContextResult.success;
        cleanupResults.databaseContext = businessContextResult.success;
        
        if (!businessContextResult.success) {
          console.warn('Failed to clear business context:', businessContextResult.error);
          lastError = { 
            message: businessContextResult.error || 'Failed to clear business context',
            status: 500 
          };
          hasErrors = true;
        }
      } catch (error) {
        console.error('Exception during business context cleanup:', error);
        lastError = { 
          message: error instanceof Error ? error.message : 'Business context cleanup failed',
          status: 500 
        };
        hasErrors = true;
      }
    }

    // Step 2: Clear additional localStorage data
    if (cleanupConfig.clearLocalStorage) {
      try {
        console.log('Clearing localStorage...');
        clearLocalStorageData();
        cleanupResults.localStorage = true;
      } catch (error) {
        console.error('Exception during localStorage cleanup:', error);
        lastError = { 
          message: 'Failed to clear localStorage data',
          status: 500 
        };
        hasErrors = true;
      }
    }

    // Step 3: Sign out from Supabase (this should be last to maintain session for cleanup)
    if (cleanupConfig.clearSupabaseSession) {
      try {
        console.log('Signing out from Supabase...');
        const signOutResult = await auth.signOut();
        cleanupResults.supabaseSession = !signOutResult.error;
        
        if (signOutResult.error) {
          console.warn('Failed to sign out from Supabase:', signOutResult.error);
          lastError = signOutResult.error;
          hasErrors = true;
        }
      } catch (error) {
        console.error('Exception during Supabase sign out:', error);
        lastError = { 
          message: error instanceof Error ? error.message : 'Supabase sign out failed',
          status: 500 
        };
        hasErrors = true;
      }
    }

    // Step 4: Redirect to login if configured
    if (cleanupConfig.redirectToLogin && typeof window !== 'undefined') {
      try {
        const redirectUrl = cleanupConfig.redirectUrl || '/login';
        console.log('Redirecting to login:', redirectUrl);
        
        // Use replace to prevent back button navigation to protected pages
        window.location.replace(redirectUrl);
      } catch (error) {
        console.error('Exception during redirect:', error);
        // Don't treat redirect errors as critical
      }
    }

    return {
      success: !hasErrors,
      error: lastError,
      cleanupResults,
    };

  } catch (error) {
    console.error('Critical error during logout:', error);
    
    // Even if there are critical errors, attempt basic cleanup
    try {
      businessContext.clearBusinessContext();
      clearLocalStorageData();
    } catch (cleanupError) {
      console.error('Failed emergency cleanup:', cleanupError);
    }

    return {
      success: false,
      error: { 
        message: error instanceof Error ? error.message : 'Critical logout error',
        status: 500 
      },
      cleanupResults,
    };
  }
}

/**
 * Clear all session-related data from localStorage
 */
function clearLocalStorageData(): void {
  if (typeof window === 'undefined') return;

  const sessionKeys = [
    'current_business_id',
    'user_preferences',
    'session_data',
    'auth_token',
    'refresh_token',
    'business_session_history',
    'last_activity_time',
    // Add other session-related keys as needed
  ];

  sessionKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove localStorage key ${key}:`, error);
    }
  });

  console.log('Cleared localStorage session data');
}

/**
 * Session timeout manager with automatic logout
 */
export class SessionTimeoutManager {
  private timeoutId: NodeJS.Timeout | null = null;
  private warningTimeoutId: NodeJS.Timeout | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private config: SessionTimeoutConfig;
  private onWarning?: () => void;
  private onTimeout?: () => void;

  constructor(
    config: Partial<SessionTimeoutConfig> = {},
    callbacks?: {
      onWarning?: () => void;
      onTimeout?: () => void;
    }
  ) {
    this.config = { ...DEFAULT_SESSION_TIMEOUT_CONFIG, ...config };
    this.onWarning = callbacks?.onWarning;
    this.onTimeout = callbacks?.onTimeout;
  }

  /**
   * Start session timeout monitoring
   */
  start(): void {
    if (!this.config.enabled) return;

    console.log('Starting session timeout manager');
    this.resetTimeout();

    // Set up interval to check session validity
    this.intervalId = setInterval(() => {
      this.checkSessionValidity();
    }, this.config.checkIntervalMs);
  }

  /**
   * Stop session timeout monitoring
   */
  stop(): void {
    console.log('Stopping session timeout manager');
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    if (this.warningTimeoutId) {
      clearTimeout(this.warningTimeoutId);
      this.warningTimeoutId = null;
    }
    
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Reset timeout (call when user activity is detected)
   */
  resetTimeout(): void {
    if (!this.config.enabled) return;

    // Clear existing timeouts
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.warningTimeoutId) clearTimeout(this.warningTimeoutId);

    // Set warning timeout
    this.warningTimeoutId = setTimeout(() => {
      console.warn('Session timeout warning triggered');
      this.onWarning?.();
    }, this.config.timeoutWarningMs);

    // Set automatic logout timeout
    this.timeoutId = setTimeout(async () => {
      console.warn('Session timeout triggered - automatic logout');
      await this.handleTimeout();
    }, this.config.timeoutMs);

    // Update last activity time
    if (typeof window !== 'undefined') {
      localStorage.setItem('last_activity_time', Date.now().toString());
    }
  }

  /**
   * Check if current session is still valid
   */
  private async checkSessionValidity(): Promise<void> {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session) {
        console.log('Session is invalid - stopping timeout manager');
        this.stop();
        return;
      }

      // Check if token is expired
      const isExpired = jwtTokenManager.isTokenExpired(data.session.access_token);
      if (isExpired) {
        console.log('Token expired - attempting refresh');
        const refreshResult = await jwtTokenManager.refreshTokenWithBusinessContext();
        
        if (!refreshResult.success) {
          console.warn('Token refresh failed - triggering logout');
          await this.handleTimeout();
        } else {
          console.log('Token refreshed successfully');
          this.resetTimeout(); // Reset timeout after successful refresh
        }
      }
    } catch (error) {
      console.error('Error checking session validity:', error);
    }
  }

  /**
   * Handle session timeout by performing automatic logout
   */
  private async handleTimeout(): Promise<void> {
    try {
      this.onTimeout?.();
      
      await enhancedLogout({
        redirectUrl: '/login?reason=timeout',
      });
    } catch (error) {
      console.error('Error during timeout logout:', error);
      
      // Force redirect even if logout fails
      if (typeof window !== 'undefined') {
        window.location.replace('/login?reason=timeout');
      }
    }
  }

  /**
   * Check if session timeout is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get current configuration
   */
  getConfig(): SessionTimeoutConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SessionTimeoutConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.enabled) {
      this.resetTimeout();
    } else {
      this.stop();
    }
  }
}

/**
 * Global session timeout manager instance
 */
let globalSessionTimeoutManager: SessionTimeoutManager | null = null;

/**
 * Initialize global session timeout manager
 */
export function initializeSessionTimeout(
  config?: Partial<SessionTimeoutConfig>,
  callbacks?: {
    onWarning?: () => void;
    onTimeout?: () => void;
  }
): SessionTimeoutManager {
  if (globalSessionTimeoutManager) {
    globalSessionTimeoutManager.stop();
  }

  globalSessionTimeoutManager = new SessionTimeoutManager(config, callbacks);
  globalSessionTimeoutManager.start();

  return globalSessionTimeoutManager;
}

/**
 * Get global session timeout manager
 */
export function getSessionTimeoutManager(): SessionTimeoutManager | null {
  return globalSessionTimeoutManager;
}

/**
 * Reset global session timeout (call on user activity)
 */
export function resetSessionTimeout(): void {
  globalSessionTimeoutManager?.resetTimeout();
}

/**
 * Stop global session timeout manager
 */
export function stopSessionTimeout(): void {
  if (globalSessionTimeoutManager) {
    globalSessionTimeoutManager.stop();
    globalSessionTimeoutManager = null;
  }
}

/**
 * Quick logout function for emergency situations
 * Performs minimal cleanup and immediate redirect
 */
export async function emergencyLogout(reason?: string): Promise<void> {
  try {
    // Clear critical data immediately
    businessContext.clearBusinessContext();
    clearLocalStorageData();
    
    // Attempt Supabase logout (don't wait)
    auth.signOut().catch(error => {
      console.error('Emergency logout - Supabase signOut failed:', error);
    });

    // Immediate redirect
    if (typeof window !== 'undefined') {
      const redirectUrl = reason 
        ? `/login?reason=${encodeURIComponent(reason)}`
        : '/login?reason=emergency';
      window.location.replace(redirectUrl);
    }
  } catch (error) {
    console.error('Emergency logout failed:', error);
    
    // Last resort - force redirect
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
  }
}

/**
 * Validate complete logout cleanup
 * Used for testing and verification
 */
export async function validateLogoutCleanup(): Promise<{
  isComplete: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    // Check Supabase session
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      issues.push('Supabase session still active');
    }

    // Check business context
    const businessId = getBusinessContext();
    if (businessId) {
      issues.push('Business context not cleared');
    }

    // Check localStorage
    if (typeof window !== 'undefined') {
      const sessionKeys = [
        'current_business_id',
        'session_data', 
        'auth_token',
        'refresh_token'
      ];
      
      sessionKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          issues.push(`localStorage key '${key}' not cleared`);
        }
      });
    }

    return {
      isComplete: issues.length === 0,
      issues,
    };
  } catch (error) {
    issues.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      isComplete: false,
      issues,
    };
  }
}

/**
 * Setup automatic user activity tracking for session timeout
 */
export function setupActivityTracking(): void {
  if (typeof window === 'undefined') return;

  const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  
  const resetTimeoutHandler = () => {
    resetSessionTimeout();
  };

  activities.forEach(activity => {
    document.addEventListener(activity, resetTimeoutHandler, true);
  });

  console.log('Activity tracking setup complete');
}