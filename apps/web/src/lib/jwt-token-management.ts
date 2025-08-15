import { supabase } from './supabase';
import { businessContext, auth } from './auth';

export type JWTPayload = {
  sub: string;
  email?: string;
  business_id?: string;
  iat: number;
  exp: number;
  [key: string]: unknown;
};

export type TokenRefreshResult = {
  success: boolean;
  session: {
    access_token: string;
    refresh_token: string;
    user: { id: string; email?: string };
    [key: string]: unknown;
  } | null;
  error?: { message: string; status?: number } | null;
};

export type BusinessContextValidationResult = {
  valid: boolean;
  error?: { message: string; status?: number } | null;
};

/**
 * JWT Token Management with Business Context Integration
 * Handles JWT tokens with business_id for multi-tenant context
 */
export const jwtTokenManager = {
  /**
   * Decode JWT token and extract payload
   * @param token - JWT token string
   * @returns Decoded token payload or null if invalid
   */
  decodeToken: (token: string): JWTPayload | null => {
    try {
      // JWT tokens have 3 parts separated by dots: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      // Decode the payload (second part)
      const payload = parts[1];
      // Add padding if needed for base64 decoding
      const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
      const decodedPayload = atob(paddedPayload);
      
      return JSON.parse(decodedPayload) as JWTPayload;
    } catch (error) {
      console.error('Failed to decode JWT token:', error);
      return null;
    }
  },

  /**
   * Extract business_id from current session JWT token
   * @returns Business ID from token or null if not found
   */
  getBusinessIdFromToken: async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session?.access_token) {
        return null;
      }

      const decodedToken = jwtTokenManager.decodeToken(data.session.access_token);
      return decodedToken?.business_id || null;
    } catch (error) {
      console.error('Failed to get business ID from token:', error);
      return null;
    }
  },

  /**
   * Validate that current JWT token contains business context
   * @returns True if token has business_id, false otherwise
   */
  validateTokenBusinessContext: async (): Promise<boolean> => {
    try {
      const businessId = await jwtTokenManager.getBusinessIdFromToken();
      return businessId !== null;
    } catch (error) {
      console.error('Failed to validate token business context:', error);
      return false;
    }
  },

  /**
   * Check if JWT token is expired
   * @param token - JWT token string
   * @returns True if token is expired, false otherwise
   */
  isTokenExpired: (token: string): boolean => {
    try {
      const decodedToken = jwtTokenManager.decodeToken(token);
      
      if (!decodedToken || !decodedToken.exp) {
        return true; // Consider invalid tokens as expired
      }

      // JWT exp is in seconds, Date.now() is in milliseconds
      const currentTime = Math.floor(Date.now() / 1000);
      return decodedToken.exp < currentTime;
    } catch (error) {
      console.error('Failed to check token expiry:', error);
      return true;
    }
  },

  /**
   * Refresh JWT token while preserving business context
   * @returns Token refresh result with success status and new session
   */
  refreshTokenWithBusinessContext: async (): Promise<TokenRefreshResult> => {
    try {
      // Get current business context before refresh
      const currentBusinessId = businessContext.getCurrentBusinessId();
      
      // Refresh the session
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error || !data.session) {
        return {
          success: false,
          session: null,
          error: error || { message: 'Failed to refresh session', status: 401 },
        };
      }

      // Validate business context is preserved
      if (currentBusinessId && data.session.user?.user_metadata?.business_id) {
        const tokenBusinessId = data.session.user.user_metadata.business_id;
        
        // Validate user still owns this business
        const validationResult = await businessContext.validateBusinessContext(
          data.session.user.id,
          tokenBusinessId
        );

        if (!validationResult.valid) {
          return {
            success: false,
            session: null,
            error: { message: 'Business context validation failed after token refresh', status: 403 },
          };
        }
      }

      return {
        success: true,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          user: {
            id: data.session.user.id,
            email: data.session.user.email || undefined
          }
        },
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        session: null,
        error: {
          message: error instanceof Error ? error.message : 'Token refresh failed',
          status: 500,
        },
      };
    }
  },

  /**
   * Validate business context consistency between JWT token and localStorage
   * @returns True if business contexts match, false otherwise
   */
  validateBusinessContextConsistency: async (): Promise<boolean> => {
    try {
      const tokenBusinessId = await jwtTokenManager.getBusinessIdFromToken();
      const localBusinessId = businessContext.getCurrentBusinessId();
      
      // Both should be null or both should match
      if (tokenBusinessId === null && localBusinessId === null) {
        return true;
      }
      
      return tokenBusinessId === localBusinessId;
    } catch (error) {
      console.error('Failed to validate business context consistency:', error);
      return false;
    }
  },

  /**
   * Validate that user owns the business specified in the JWT token
   * @returns Validation result with success status and error details
   */
  validateTokenBusinessOwnership: async (): Promise<BusinessContextValidationResult> => {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session?.access_token) {
        return {
          valid: false,
          error: { message: 'No active session', status: 401 },
        };
      }

      const decodedToken = jwtTokenManager.decodeToken(data.session.access_token);
      
      if (!decodedToken || !decodedToken.business_id) {
        return {
          valid: false,
          error: { message: 'No business context in token', status: 400 },
        };
      }

      // Validate user owns the business
      const validationResult = await businessContext.validateBusinessContext(
        decodedToken.sub,
        decodedToken.business_id
      );

      return validationResult;
    } catch (error) {
      return {
        valid: false,
        error: {
          message: error instanceof Error ? error.message : 'Business ownership validation failed',
          status: 500,
        },
      };
    }
  },
};

/**
 * Fetch API Interceptor for Automatic Business Context Management
 * Handles Authorization headers and business context validation
 */
export const fetchInterceptor = {
  /**
   * Create fetch request with authentication and business context headers
   * @param url - Request URL
   * @param options - Fetch options
   * @returns Promise with fetch response
   */
  fetchWithAuth: async (url: string, options: RequestInit = {}): Promise<Response> => {
    try {
      // Get current session
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session?.access_token) {
        // No authentication available, make request as-is
        return fetch(url, options);
      }

      // Check if token is expired and refresh if needed
      let accessToken = data.session.access_token;
      if (jwtTokenManager.isTokenExpired(accessToken)) {
        const refreshResult = await jwtTokenManager.refreshTokenWithBusinessContext();
        
        if (!refreshResult.success) {
          throw new Error('Token refresh failed: ' + refreshResult.error?.message);
        }
        
        // Use the refreshed access token
        accessToken = refreshResult.session?.access_token || accessToken;
      }

      // Prepare headers
      const headers = new Headers(options.headers);
      headers.set('Authorization', `Bearer ${accessToken}`);

      // Get business context
      const currentBusinessId = businessContext.getCurrentBusinessId();
      const tokenBusinessId = await jwtTokenManager.getBusinessIdFromToken();

      // Validate business context consistency
      if (currentBusinessId && tokenBusinessId) {
        if (currentBusinessId !== tokenBusinessId) {
          throw new Error('Business context mismatch between token and localStorage');
        }

        // Check for spoofing attempts (if header was manually set)
        const existingBusinessHeader = headers.get('X-Business-ID');
        if (existingBusinessHeader && existingBusinessHeader !== currentBusinessId) {
          throw new Error('Business context spoofing detected');
        }

        // Add business context header
        headers.set('X-Business-ID', currentBusinessId);
      }

      // Make authenticated request
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle authentication and business context errors
      if (response.status === 401) {
        console.warn('Authentication error detected, logging out user');
        auth.signOut();
        businessContext.clearBusinessContext();
        
        // Redirect to login page if in browser
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }

      if (response.status === 403) {
        console.warn('Business context error detected, clearing business context');
        businessContext.clearBusinessContext();
        
        // Could redirect to business selection page or re-login
        if (typeof window !== 'undefined') {
          try {
            const errorData = await response.clone().json();
            if (errorData.error?.includes('business') || errorData.error?.includes('context')) {
              // Business-specific error, redirect to login for context re-establishment
              window.location.href = '/login?error=business_context_invalid';
            }
          } catch {
            // Ignore JSON parsing errors for non-JSON responses
          }
        }
      }

      return response;
    } catch (error) {
      console.error('Fetch interceptor error:', error);
      throw error;
    }
  },

  /**
   * Create headers with authentication and business context
   * @returns Headers object with auth and business context
   */
  createAuthHeaders: async (): Promise<Headers> => {
    const headers = new Headers();
    
    try {
      // Get current session
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session?.access_token) {
        return headers; // Return empty headers if not authenticated
      }

      // Check if token is expired and refresh if needed
      let accessToken = data.session.access_token;
      if (jwtTokenManager.isTokenExpired(accessToken)) {
        const refreshResult = await jwtTokenManager.refreshTokenWithBusinessContext();
        
        if (!refreshResult.success) {
          throw new Error('Token refresh failed: ' + refreshResult.error?.message);
        }
        
        // Use the refreshed access token
        accessToken = refreshResult.session?.access_token || accessToken;
      }

      // Add Authorization header
      headers.set('Authorization', `Bearer ${accessToken}`);

      // Add business context if available
      const currentBusinessId = businessContext.getCurrentBusinessId();
      if (currentBusinessId) {
        headers.set('X-Business-ID', currentBusinessId);
      }

      return headers;
    } catch (error) {
      console.error('Failed to create auth headers:', error);
      return headers; // Return empty headers on error
    }
  },
};

/**
 * Middleware for automatic business context setting in API calls
 * This should be called before making any authenticated API requests
 */
export const apiMiddleware = {
  /**
   * Create authenticated fetch function with business context
   * @returns Fetch function with authentication and business context
   */
  createAuthenticatedFetch: () => {
    return fetchInterceptor.fetchWithAuth;
  },

  /**
   * Validate business context before API call
   * @returns Promise resolving to validation result
   */
  validateBusinessContextBeforeCall: async (): Promise<BusinessContextValidationResult> => {
    try {
      // Check if user is authenticated
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session) {
        return {
          valid: false,
          error: { message: 'User not authenticated', status: 401 },
        };
      }

      // Validate business context consistency
      const isConsistent = await jwtTokenManager.validateBusinessContextConsistency();
      
      if (!isConsistent) {
        return {
          valid: false,
          error: { message: 'Business context inconsistency detected', status: 400 },
        };
      }

      // Validate business ownership
      return await jwtTokenManager.validateTokenBusinessOwnership();
    } catch (error) {
      return {
        valid: false,
        error: {
          message: error instanceof Error ? error.message : 'Business context validation failed',
          status: 500,
        },
      };
    }
  },

  /**
   * Setup global fetch override with authentication (optional)
   * This can be used to automatically add auth to all fetch calls
   */
  setupGlobalFetchOverride: () => {
    if (typeof window !== 'undefined') {
      const originalFetch = window.fetch;
      
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        // Check if this is an API call
        const url = typeof input === 'string' ? input : input.toString();
        
        // Only intercept API calls (customize this logic as needed)
        if (url.startsWith('/api/') || url.includes('api')) {
          return fetchInterceptor.fetchWithAuth(url, init);
        }
        
        // Use original fetch for non-API calls
        return originalFetch(input, init);
      };
    }
  },

  /**
   * Restore original fetch function
   */
  restoreOriginalFetch: () => {
    if (typeof window !== 'undefined' && 'originalFetch' in window) {
      window.fetch = (window as typeof window & { originalFetch: typeof fetch }).originalFetch;
      delete (window as typeof window & { originalFetch?: typeof fetch }).originalFetch;
    }
  },
};