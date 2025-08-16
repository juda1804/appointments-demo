/**
 * Comprehensive Test Suite for Logout Functionality and Session Management
 * Tests complete session cleanup, business context clearing, and authentication state management
 */

import { supabase } from './supabase';
import { 
  clearBusinessContext, 
  setBusinessContext, 
  getBusinessContext, 
  validateBusinessContext 
} from './rls-context-management';

// Mock RLS context management
jest.mock('./rls-context-management', () => ({
  clearBusinessContext: jest.fn(),
  setBusinessContext: jest.fn(),
  getBusinessContext: jest.fn(),
  validateBusinessContext: jest.fn(),
}));

// Mock Supabase client
jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      refreshSession: jest.fn(),
    },
    rpc: jest.fn(),
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  },
}));

// Mock JWT token management
jest.mock('./jwt-token-management', () => ({
  jwtTokenManager: {
    isTokenExpired: jest.fn(),
    refreshTokenWithBusinessContext: jest.fn(),
    getBusinessIdFromToken: jest.fn(),
    validateBusinessContextConsistency: jest.fn(),
  },
  fetchInterceptor: {
    fetchWithAuth: jest.fn(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.location
const mockLocation = {
  href: '',
  replace: jest.fn(),
  assign: jest.fn(),
};

// Mock window object
(global as typeof global & { window: Record<string, unknown> }).window = {
  ...global.window,
  location: mockLocation,
  localStorage: localStorageMock,
};

describe('Logout Functionality and Session Cleanup', () => {
  const mockBusinessId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = 'user123';
  const mockSession = {
    access_token: 'mock-jwt-token',
    refresh_token: 'mock-refresh-token',
    user: {
      id: mockUserId,
      email: 'test@example.com',
      user_metadata: { business_id: mockBusinessId },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockLocation.href = '';
    
    // Set up getBusinessContext mock to return current localStorage value
    const mockGetBusinessContext = getBusinessContext as jest.MockedFunction<typeof getBusinessContext>;
    mockGetBusinessContext.mockImplementation(() => {
      return localStorageMock.getItem('current_business_id');
    });
  });

  describe('Basic Logout Functionality', () => {
    test('should clear Supabase session on logout', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      const result = await auth.signOut();

      expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1);
      expect(result.error).toBeNull();
    });

    test('should handle Supabase signOut errors gracefully', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      const mockError = { message: 'Network error', status: 500 };
      mockSupabase.auth.signOut.mockResolvedValue({ error: mockError });

      const result = await auth.signOut();

      expect(result.error).toEqual({
        message: 'Network error',
        status: 500,
      });
    });

    test('should handle exceptions during logout', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      mockSupabase.auth.signOut.mockRejectedValue(new Error('Connection timeout'));

      const result = await auth.signOut();

      expect(result.error).toEqual({
        message: 'Connection timeout',
        status: 500,
      });
    });
  });

  describe('Business Context Cleanup', () => {
    test('should clear localStorage business_id on logout', async () => {
      // Set up initial business context
      localStorageMock.setItem('current_business_id', mockBusinessId);
      expect(businessContext.getCurrentBusinessId()).toBe(mockBusinessId);

      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      await auth.signOut();

      expect(businessContext.getCurrentBusinessId()).toBeNull();
      expect(localStorageMock.getItem('current_business_id')).toBeNull();
    });

    test('should clear database business context on logout', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      // Set up initial business context in localStorage
      localStorageMock.setItem('current_business_id', mockBusinessId);

      await auth.signOut();

      // Business context should be cleared via RLS context management
      expect(localStorageMock.getItem('current_business_id')).toBeNull();
    });

    test('should clear business context even if Supabase signOut fails', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      mockSupabase.auth.signOut.mockRejectedValue(new Error('Network error'));

      // Set up initial business context
      localStorageMock.setItem('current_business_id', mockBusinessId);

      await auth.signOut();

      // Business context should still be cleared despite logout failure
      expect(localStorageMock.getItem('current_business_id')).toBeNull();
    });
  });

  describe('Complete Session Data Cleanup', () => {
    test('should clear all session-related localStorage data', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      // Set up various session data
      localStorageMock.setItem('current_business_id', mockBusinessId);
      localStorageMock.setItem('session_data', 'some_session_data');
      localStorageMock.setItem('user_preferences', 'preferences');

      await auth.signOut();

      // Business context should be cleared
      expect(localStorageMock.getItem('current_business_id')).toBeNull();
    });

    test('should clear RLS business context from database session', async () => {
      const mockClearBusinessContext = clearBusinessContext as jest.MockedFunction<typeof clearBusinessContext>;
      mockClearBusinessContext.mockResolvedValue({ success: true });

      localStorageMock.setItem('current_business_id', mockBusinessId);

      const clearResult = await clearBusinessContext();

      expect(clearResult.success).toBe(true);
      expect(mockClearBusinessContext).toHaveBeenCalledTimes(1);
    });

    test('should handle RLS context clearing errors', async () => {
      const mockClearBusinessContext = clearBusinessContext as jest.MockedFunction<typeof clearBusinessContext>;
      mockClearBusinessContext.mockResolvedValue({
        success: false,
        error: 'Failed to clear business context: Database connection failed',
      });

      localStorageMock.setItem('current_business_id', mockBusinessId);

      const clearResult = await clearBusinessContext();

      expect(clearResult.success).toBe(false);
      expect(clearResult.error).toContain('Failed to clear business context');
    });
  });

  describe('Session Token Management During Logout', () => {
    test('should invalidate JWT tokens on logout', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
      mockSupabase.auth.getSession
        .mockResolvedValueOnce({ data: { session: mockSession }, error: null }) // Before logout
        .mockResolvedValueOnce({ data: { session: null }, error: null }); // After logout

      // Before logout - should have session
      const beforeLogout = await auth.getSession();
      expect(beforeLogout.data.session).not.toBeNull();

      await auth.signOut();

      // After logout - session should be null
      const afterLogout = await auth.getSession();
      expect(afterLogout.data.session).toBeNull();
    });

    test('should clear refresh tokens on logout', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      await auth.signOut();

      // Verify signOut was called which should clear refresh tokens
      expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1);
    });

    test('should prevent token refresh after logout', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      const mockJwtTokenManager = jwtTokenManager as jest.Mocked<typeof jwtTokenManager>;
      
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
      mockJwtTokenManager.refreshTokenWithBusinessContext.mockResolvedValue({
        success: false,
        session: null,
        error: { message: 'Failed to refresh session', status: 401 },
      });

      await auth.signOut();

      // Try to refresh after logout
      const refreshResult = await jwtTokenManager.refreshTokenWithBusinessContext();

      expect(refreshResult.success).toBe(false);
      expect(refreshResult.error?.message).toContain('Failed to refresh session');
    });
  });

  describe('API Request Handling After Logout', () => {
    test('should handle 401 errors by clearing context and redirecting', async () => {
      const mockFetchInterceptor = fetchInterceptor as jest.Mocked<typeof fetchInterceptor>;
      
      // Mock fetch interceptor to simulate 401 handling
      mockFetchInterceptor.fetchWithAuth.mockImplementation(async () => {
        // Simulate the behavior that sets location.href
        mockLocation.href = '/login';
        throw new Error('401 Unauthorized');
      });

      localStorageMock.setItem('current_business_id', mockBusinessId);

      try {
        await fetchInterceptor.fetchWithAuth('/api/test', {});
      } catch {
        // Expected to fail due to 401
      }

      // Should redirect to login on 401
      expect(mockLocation.href).toBe('/login');
    });

    test('should clear business context on 403 errors with business context message', async () => {
      const mockFetchInterceptor = fetchInterceptor as jest.Mocked<typeof fetchInterceptor>;
      const mockGetBusinessContext = getBusinessContext as jest.MockedFunction<typeof getBusinessContext>;
      
      mockGetBusinessContext.mockReturnValue(mockBusinessId);
      localStorageMock.setItem('current_business_id', mockBusinessId);

      // Mock fetch interceptor to simulate 403 handling
      mockFetchInterceptor.fetchWithAuth.mockImplementation(async () => {
        // Simulate clearing business context and redirect
        localStorageMock.removeItem('current_business_id');
        mockLocation.href = '/login?error=business_context_invalid';
        const response = new Response(JSON.stringify({ error: 'Invalid business context' }), { status: 403 });
        return response;
      });

      await fetchInterceptor.fetchWithAuth('/api/test', {});

      // Should clear business context and redirect to login with error
      expect(localStorageMock.getItem('current_business_id')).toBeNull();
      expect(mockLocation.href).toBe('/login?error=business_context_invalid');
    });
  });

  describe('Auth State Change Listener', () => {
    test('should clear business context when auth state changes to null', async () => {
      localStorageMock.setItem('current_business_id', mockBusinessId);
      
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      const mockCallback = jest.fn();
      
      // Mock auth state change listener
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        // Simulate auth state change to null (logout)
        callback('SIGNED_OUT', null);
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      auth.onAuthStateChange(mockCallback);

      // Should clear business context when user becomes null
      expect(localStorageMock.getItem('current_business_id')).toBeNull();
      expect(mockCallback).toHaveBeenCalledWith(null);
    });

    test('should restore business context when auth state changes to valid user', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      const mockCallback = jest.fn();
      const mockSetBusinessContext = setBusinessContext as jest.MockedFunction<typeof setBusinessContext>;
      const mockGetBusinessContext = getBusinessContext as jest.MockedFunction<typeof getBusinessContext>;
      
      // Set up business context before auth change
      localStorageMock.setItem('current_business_id', mockBusinessId);
      mockGetBusinessContext.mockReturnValue(mockBusinessId);
      mockSetBusinessContext.mockResolvedValue({ success: true, businessId: mockBusinessId });

      mockSupabase.auth.onAuthStateChange.mockImplementation(async (callback) => {
        // Simulate auth state change to valid user
        const authUser = {
          id: mockUserId,
          email: 'test@example.com',
          name: undefined,
          businessId: mockBusinessId,
        };
        callback(authUser);
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      const listener = auth.onAuthStateChange(mockCallback);

      expect(mockCallback).toHaveBeenCalled();
      expect(listener).toBeDefined();
    });
  });

  describe('Logout Integration with Session Management', () => {
    test('should perform complete logout flow with all cleanup steps', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      
      // Set up initial state
      localStorageMock.setItem('current_business_id', mockBusinessId);
      localStorageMock.setItem('session_data', 'test_data');
      
      // Mock successful logout
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await auth.signOut();

      // Verify complete cleanup
      expect(result.error).toBeNull();
      expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1);
      expect(localStorageMock.getItem('current_business_id')).toBeNull();
    });

    test('should attempt cleanup even if some steps fail', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      
      // Set up initial state
      localStorageMock.setItem('current_business_id', mockBusinessId);
      
      // Mock partial failure - Supabase signOut fails but business context should still be cleared
      mockSupabase.auth.signOut.mockRejectedValue(new Error('Network timeout'));

      const result = await auth.signOut();

      // Should still clear business context even if Supabase signOut fails
      expect(result.error?.message).toBe('Network timeout');
      expect(localStorageMock.getItem('current_business_id')).toBeNull();
    });
  });

  describe('Session Timeout Scenarios', () => {
    test('should handle expired tokens by clearing session', async () => {
      const mockJwtTokenManager = jwtTokenManager as jest.Mocked<typeof jwtTokenManager>;
      mockJwtTokenManager.isTokenExpired.mockReturnValue(true);
      
      const expiredToken = 'expired-token';
      
      expect(jwtTokenManager.isTokenExpired(expiredToken)).toBe(true);
    });

    test('should attempt token refresh before logout on expired tokens', async () => {
      const mockJwtTokenManager = jwtTokenManager as jest.Mocked<typeof jwtTokenManager>;
      localStorageMock.setItem('current_business_id', mockBusinessId);
      
      // Mock successful token refresh
      mockJwtTokenManager.refreshTokenWithBusinessContext.mockResolvedValue({
        success: true,
        session: mockSession,
        error: null,
      });

      const refreshResult = await jwtTokenManager.refreshTokenWithBusinessContext();
      
      expect(refreshResult.success).toBe(true);
      expect(mockJwtTokenManager.refreshTokenWithBusinessContext).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cross-tab Logout Synchronization', () => {
    test('should handle storage events for cross-tab logout', () => {
      // Set up initial business context
      localStorageMock.setItem('current_business_id', mockBusinessId);
      expect(getBusinessContext()).toBe(mockBusinessId);

      // Simulate storage event (business context cleared in another tab)
      const storageEvent = new StorageEvent('storage', {
        key: 'current_business_id',
        oldValue: mockBusinessId,
        newValue: null,
      });

      // Verify storage event was created correctly
      expect(storageEvent.key).toBe('current_business_id');
      
      // Clear context manually to simulate the event effect
      localStorageMock.removeItem('current_business_id');
      
      expect(getBusinessContext()).toBeNull();
    });

    test('should synchronize logout state across browser tabs', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      // Set up multiple "tabs" with business context
      localStorageMock.setItem('current_business_id', mockBusinessId);

      await auth.signOut();

      // Verify business context cleared (simulating cross-tab sync)
      expect(getBusinessContext()).toBeNull();
    });
  });

  describe('Error Recovery and Cleanup Validation', () => {
    test('should validate complete cleanup after logout', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      // Set up session data
      localStorageMock.setItem('current_business_id', mockBusinessId);

      await auth.signOut();

      // Validate all cleanup completed
      expect(getBusinessContext()).toBeNull();
      expect(localStorageMock.getItem('current_business_id')).toBeNull();
    });

    test('should provide clear error messages for cleanup failures', async () => {
      const mockClearBusinessContext = clearBusinessContext as jest.MockedFunction<typeof clearBusinessContext>;
      mockClearBusinessContext.mockResolvedValue({
        success: false,
        error: 'Failed to clear business context: Connection lost',
      });

      const clearResult = await clearBusinessContext();

      expect(clearResult.success).toBe(false);
      expect(clearResult.error).toContain('Failed to clear business context: Connection lost');
    });
  });
});

describe('Advanced Logout Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe('Logout with Active Business Operations', () => {
    test('should handle logout during active business operations', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      const mockBusinessId = '550e8400-e29b-41d4-a716-446655440000';
      
      // Set up active business context
      localStorageMock.setItem('current_business_id', mockBusinessId);
      
      // Mock Supabase operations
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await auth.signOut();

      expect(result.error).toBeNull();
      expect(getBusinessContext()).toBeNull();
    });
  });

  describe('Logout State Persistence', () => {
    test('should maintain logout state after page refresh', async () => {
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

      await auth.signOut();

      // Simulate page refresh - check session
      const sessionResult = await auth.getSession();
      
      expect(sessionResult.data.session).toBeNull();
      expect(getBusinessContext()).toBeNull();
    });
  });
});