import { jwtTokenManager, fetchInterceptor, apiMiddleware } from './jwt-token-management';

// Mock fetch
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.location
const mockLocation = {
  href: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
};

// Mock window.location differently to avoid redefine issues
delete (window as unknown as { location?: unknown }).location;
(window as unknown as { location: typeof mockLocation }).location = mockLocation;

// Mock Supabase
jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      refreshSession: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
    })),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockSupabase = require('./supabase').supabase;

// Mock auth module
jest.mock('./auth', () => ({
  businessContext: {
    getCurrentBusinessId: jest.fn(),
    validateBusinessContext: jest.fn(),
    clearBusinessContext: jest.fn(),
  },
  auth: {
    signOut: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockAuth = require('./auth');

describe('JWT Token Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
    localStorageMock.removeItem.mockReset();
    // Reset the href setter mock
    jest.clearAllMocks();
  });

  describe('JWT Token Structure with Business Context', () => {
    it('should decode JWT token and extract business_id', () => {
      // Mock JWT token with business_id in payload
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImJ1c2luZXNzX2lkIjoiYnVzaW5lc3MtMTIzIiwiaWF0IjoxNjQwOTk1MjAwLCJleHAiOjE2NDA5OTg4MDB9.test-signature';
      
      const decodedToken = jwtTokenManager.decodeToken(mockToken);
      
      expect(decodedToken).toEqual({
        sub: 'user-123',
        email: 'test@example.com',
        business_id: 'business-123',
        iat: 1640995200,
        exp: 1640998800,
      });
    });

    it('should handle JWT token without business_id', () => {
      // Mock JWT token without business_id
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTY0MDk5NTIwMCwiZXhwIjoxNjQwOTk4ODAwfQ.test-signature';
      
      const decodedToken = jwtTokenManager.decodeToken(mockToken);
      
      expect(decodedToken).toEqual({
        sub: 'user-123',
        email: 'test@example.com',
        iat: 1640995200,
        exp: 1640998800,
      });
      expect(decodedToken.business_id).toBeUndefined();
    });

    it('should handle invalid JWT token', () => {
      const invalidToken = 'invalid-jwt-token';
      
      const decodedToken = jwtTokenManager.decodeToken(invalidToken);
      
      expect(decodedToken).toBeNull();
    });

    it('should extract business_id from current session', async () => {
      const mockSession = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImJ1c2luZXNzX2lkIjoiYnVzaW5lc3MtMTIzIn0.test-signature',
        user: {
          id: 'user-123',
          user_metadata: { business_id: 'business-123' },
        },
      };
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      
      const businessId = await jwtTokenManager.getBusinessIdFromToken();
      
      expect(businessId).toBe('business-123');
    });

    it('should return null when no session exists', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      
      const businessId = await jwtTokenManager.getBusinessIdFromToken();
      
      expect(businessId).toBeNull();
    });

    it('should validate token has required business context', async () => {
      const mockSession = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImJ1c2luZXNzX2lkIjoiYnVzaW5lc3MtMTIzIn0.test-signature',
      };
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      
      const isValid = await jwtTokenManager.validateTokenBusinessContext();
      
      expect(isValid).toBe(true);
    });

    it('should detect missing business context in token', async () => {
      const mockSession = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyJ9.test-signature',
      };
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      
      const isValid = await jwtTokenManager.validateTokenBusinessContext();
      
      expect(isValid).toBe(false);
    });
  });

  describe('Token Refresh with Business Context Preservation', () => {
    it('should refresh token and preserve business context', async () => {
      const mockRefreshedSession = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        user: {
          id: 'user-123',
          user_metadata: { business_id: 'business-123' },
        },
      };
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: mockRefreshedSession },
        error: null,
      });
      mockAuth.businessContext.getCurrentBusinessId.mockReturnValue('business-123');
      mockAuth.businessContext.validateBusinessContext.mockResolvedValue({
        valid: true,
        error: null,
      });
      
      const result = await jwtTokenManager.refreshTokenWithBusinessContext();
      
      expect(result.success).toBe(true);
      expect(result.session).toEqual(mockRefreshedSession);
      expect(mockSupabase.auth.refreshSession).toHaveBeenCalled();
    });

    it('should handle token refresh failure', async () => {
      const mockError = {
        message: 'Refresh token expired',
        status: 401,
      };
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: mockError,
      });
      
      const result = await jwtTokenManager.refreshTokenWithBusinessContext();
      
      expect(result.success).toBe(false);
      expect(result.error).toEqual(mockError);
      expect(result.session).toBeNull();
    });

    it('should validate business context after token refresh', async () => {
      const mockRefreshedSession = {
        access_token: 'new-access-token',
        user: {
          id: 'user-123',
          user_metadata: { business_id: 'business-123' },
        },
      };
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: mockRefreshedSession },
        error: null,
      });
      mockAuth.businessContext.getCurrentBusinessId.mockReturnValue('business-123');
      mockAuth.businessContext.validateBusinessContext.mockResolvedValue({
        valid: true,
        error: null,
      });
      
      const result = await jwtTokenManager.refreshTokenWithBusinessContext();
      
      expect(result.success).toBe(true);
      expect(mockAuth.businessContext.validateBusinessContext).toHaveBeenCalledWith(
        'user-123',
        'business-123'
      );
    });

    it('should handle business context validation failure after refresh', async () => {
      const mockRefreshedSession = {
        access_token: 'new-access-token',
        user: {
          id: 'user-123',
          user_metadata: { business_id: 'business-123' },
        },
      };
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: mockRefreshedSession },
        error: null,
      });
      mockAuth.businessContext.getCurrentBusinessId.mockReturnValue('business-456'); // Different business
      mockAuth.businessContext.validateBusinessContext.mockResolvedValue({
        valid: false,
        error: { message: 'Business context mismatch', status: 403 },
      });
      
      const result = await jwtTokenManager.refreshTokenWithBusinessContext();
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Business context validation failed after token refresh');
    });

    it('should handle automatic token refresh on expiry', async () => {
      // Mock expired token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImJ1c2luZXNzX2lkIjoiYnVzaW5lc3MtMTIzIiwiZXhwIjoxNjQwOTk1MjAwfQ.test-signature';
      
      const isExpired = jwtTokenManager.isTokenExpired(expiredToken);
      
      expect(isExpired).toBe(true);
    });

    it('should detect non-expired tokens', () => {
      // Mock future expiry time
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const validToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ exp: futureTimestamp })).toString('base64')}.test-signature`;
      
      const isExpired = jwtTokenManager.isTokenExpired(validToken);
      
      expect(isExpired).toBe(false);
    });
  });

  describe('Business Context Validation in Tokens', () => {
    it('should validate business context matches between token and localStorage', async () => {
      const mockSession = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImJ1c2luZXNzX2lkIjoiYnVzaW5lc3MtMTIzIn0.test-signature',
      };
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockAuth.businessContext.getCurrentBusinessId.mockReturnValue('business-123');
      
      const isValid = await jwtTokenManager.validateBusinessContextConsistency();
      
      expect(isValid).toBe(true);
    });

    it('should detect business context mismatch between token and localStorage', async () => {
      const mockSession = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImJ1c2luZXNzX2lkIjoiYnVzaW5lc3MtMTIzIn0.test-signature',
      };
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockAuth.businessContext.getCurrentBusinessId.mockReturnValue('business-456'); // Different business
      
      const isValid = await jwtTokenManager.validateBusinessContextConsistency();
      
      expect(isValid).toBe(false);
    });

    it('should handle missing localStorage business context', async () => {
      const mockSession = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImJ1c2luZXNzX2lkIjoiYnVzaW5lc3MtMTIzIn0.test-signature',
      };
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockAuth.businessContext.getCurrentBusinessId.mockReturnValue(null);
      
      const isValid = await jwtTokenManager.validateBusinessContextConsistency();
      
      expect(isValid).toBe(false);
    });

    it('should validate user owns the business in token', async () => {
      const mockSession = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImJ1c2luZXNzX2lkIjoiYnVzaW5lc3MtMTIzIn0.test-signature',
      };
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockAuth.businessContext.validateBusinessContext.mockResolvedValue({
        valid: true,
        error: null,
      });
      
      const result = await jwtTokenManager.validateTokenBusinessOwnership();
      
      expect(result.valid).toBe(true);
      expect(mockAuth.businessContext.validateBusinessContext).toHaveBeenCalledWith(
        'user-123',
        'business-123'
      );
    });

    it('should reject token when user does not own business', async () => {
      const mockSession = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImJ1c2luZXNzX2lkIjoiYnVzaW5lc3MtMTIzIn0.test-signature',
      };
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockAuth.businessContext.validateBusinessContext.mockResolvedValue({
        valid: false,
        error: { message: 'Business access denied', status: 403 },
      });
      
      const result = await jwtTokenManager.validateTokenBusinessOwnership();
      
      expect(result.valid).toBe(false);
      expect(result.error?.message).toBe('Business access denied');
    });
  });

  describe('Fetch API Interceptors for Business Context', () => {
    let mockResponse: Response;
    let mockFetch: jest.MockedFunction<typeof fetch>;

    beforeEach(() => {
      mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });
    });

    it('should add Authorization header with Bearer token', async () => {
      // Mock a valid non-expired token
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const validToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ 
        sub: 'user-123', 
        business_id: 'business-123', 
        exp: futureTimestamp 
      })).toString('base64')}.test-signature`;
      
      const mockSession = {
        access_token: validToken,
      };
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockAuth.businessContext.getCurrentBusinessId.mockReturnValue('business-123');
      mockFetch.mockResolvedValue(mockResponse);
      
      await fetchInterceptor.fetchWithAuth('/api/test');
      
      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        headers: expect.objectContaining({
          get: expect.any(Function),
          set: expect.any(Function),
        }),
      });
      
      // Verify Authorization header was set
      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer ' + validToken);
    });

    it('should add X-Business-ID header with current business context', async () => {
      // Mock a valid non-expired token
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const validToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ 
        sub: 'user-123', 
        business_id: 'business-123', 
        exp: futureTimestamp 
      })).toString('base64')}.test-signature`;
      
      const mockSession = {
        access_token: validToken,
      };
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockAuth.businessContext.getCurrentBusinessId.mockReturnValue('business-123');
      mockFetch.mockResolvedValue(mockResponse);
      
      await fetchInterceptor.fetchWithAuth('/api/test');
      
      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Headers;
      expect(headers.get('X-Business-ID')).toBe('business-123');
    });

    it('should not add headers when user is not authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      mockFetch.mockResolvedValue(mockResponse);
      
      await fetchInterceptor.fetchWithAuth('/api/test');
      
      expect(mockFetch).toHaveBeenCalledWith('/api/test', {});
    });

    it('should handle authentication errors (401)', async () => {
      // Mock a valid non-expired token
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const validToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ 
        sub: 'user-123', 
        business_id: 'business-123', 
        exp: futureTimestamp 
      })).toString('base64')}.test-signature`;
      
      const mockSession = {
        access_token: validToken,
      };
      const authErrorResponse = new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        statusText: 'Unauthorized',
      });
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockAuth.businessContext.getCurrentBusinessId.mockReturnValue('business-123');
      mockFetch.mockResolvedValue(authErrorResponse);
      
      const response = await fetchInterceptor.fetchWithAuth('/api/test');
      
      expect(response.status).toBe(401);
      expect(mockAuth.auth.signOut).toHaveBeenCalled();
      expect(mockAuth.businessContext.clearBusinessContext).toHaveBeenCalled();
    });

    it('should handle business context errors (403)', async () => {
      // Mock a valid non-expired token
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const validToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ 
        sub: 'user-123', 
        business_id: 'business-123', 
        exp: futureTimestamp 
      })).toString('base64')}.test-signature`;
      
      const mockSession = {
        access_token: validToken,
      };
      const contextErrorResponse = new Response(JSON.stringify({ error: 'Invalid business context' }), {
        status: 403,
        statusText: 'Forbidden',
      });
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockAuth.businessContext.getCurrentBusinessId.mockReturnValue('business-123');
      mockFetch.mockResolvedValue(contextErrorResponse);
      
      const response = await fetchInterceptor.fetchWithAuth('/api/test');
      
      expect(response.status).toBe(403);
      expect(mockAuth.businessContext.clearBusinessContext).toHaveBeenCalled();
    });

    it('should pass through non-auth related errors', async () => {
      // Mock a valid non-expired token
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const validToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ 
        sub: 'user-123', 
        business_id: 'business-123', 
        exp: futureTimestamp 
      })).toString('base64')}.test-signature`;
      
      const mockSession = {
        access_token: validToken,
      };
      const serverErrorResponse = new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        statusText: 'Internal Server Error',
      });
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockAuth.businessContext.getCurrentBusinessId.mockReturnValue('business-123');
      mockFetch.mockResolvedValue(serverErrorResponse);
      
      const response = await fetchInterceptor.fetchWithAuth('/api/test');
      
      expect(response.status).toBe(500);
      expect(mockAuth.auth.signOut).not.toHaveBeenCalled();
    });

    it('should validate business context before adding headers', async () => {
      // Mock a valid non-expired token with business context
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const validToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ 
        sub: 'user-123', 
        business_id: 'business-123', 
        exp: futureTimestamp 
      })).toString('base64')}.test-signature`;
      
      const mockSession = {
        access_token: validToken,
      };
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockAuth.businessContext.getCurrentBusinessId.mockReturnValue('business-456'); // Mismatch
      
      await expect(fetchInterceptor.fetchWithAuth('/api/test')).rejects.toThrow(
        'Business context mismatch between token and localStorage'
      );
    });

    it('should refresh token automatically when expired', async () => {
      // Mock expired token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImJ1c2luZXNzX2lkIjoiYnVzaW5lc3MtMTIzIiwiZXhwIjoxNjQwOTk1MjAwfQ.test-signature';
      const mockSession = {
        access_token: expiredToken,
      };
      const refreshedSession = {
        access_token: 'new-access-token',
      };
      
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: refreshedSession },
        error: null,
      });
      mockAuth.businessContext.getCurrentBusinessId.mockReturnValue('business-123');
      mockFetch.mockResolvedValue(mockResponse);
      
      await fetchInterceptor.fetchWithAuth('/api/test');
      
      expect(mockSupabase.auth.refreshSession).toHaveBeenCalled();
      
      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer new-access-token');
    });

    it('should create auth headers correctly', async () => {
      // Mock a valid non-expired token
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const validToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ 
        sub: 'user-123', 
        business_id: 'business-123', 
        exp: futureTimestamp 
      })).toString('base64')}.test-signature`;
      
      const mockSession = {
        access_token: validToken,
      };
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockAuth.businessContext.getCurrentBusinessId.mockReturnValue('business-123');
      
      const headers = await fetchInterceptor.createAuthHeaders();
      
      expect(headers.get('Authorization')).toBe('Bearer ' + validToken);
      expect(headers.get('X-Business-ID')).toBe('business-123');
    });

    it('should return empty headers when not authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      
      const headers = await fetchInterceptor.createAuthHeaders();
      
      expect(headers.get('Authorization')).toBeNull();
      expect(headers.get('X-Business-ID')).toBeNull();
    });
  });

  describe('Business Context Spoofing Prevention', () => {
    it('should reject requests with mismatched business context in headers', async () => {
      // Mock a valid non-expired token with business context
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const validToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ 
        sub: 'user-123', 
        business_id: 'business-123', 
        exp: futureTimestamp 
      })).toString('base64')}.test-signature`;
      
      const mockSession = {
        access_token: validToken,
      };
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockAuth.businessContext.getCurrentBusinessId.mockReturnValue('business-123');
      
      // Manually set different business ID in headers (spoofing attempt)
      const headers = new Headers();
      headers.set('X-Business-ID', 'business-456');
      
      await expect(fetchInterceptor.fetchWithAuth('/api/test', { headers })).rejects.toThrow(
        'Business context spoofing detected'
      );
    });

    it('should validate JWT token business_id matches X-Business-ID header', async () => {
      // Mock a valid non-expired token with business context
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const validToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ 
        sub: 'user-123', 
        business_id: 'business-123', 
        exp: futureTimestamp 
      })).toString('base64')}.test-signature`;
      
      const mockSession = {
        access_token: validToken,
      };
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockAuth.businessContext.getCurrentBusinessId.mockReturnValue('business-123');
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));
      
      await fetchInterceptor.fetchWithAuth('/api/test');
      
      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Headers;
      expect(headers.get('X-Business-ID')).toBe('business-123');
      expect(headers.get('Authorization')).toContain('Bearer'); // JWT token with business_id
    });

    it('should handle missing business context gracefully', async () => {
      // Mock a valid non-expired token WITHOUT business context
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const validToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ 
        sub: 'user-123', 
        exp: futureTimestamp 
      })).toString('base64')}.test-signature`;
      
      const mockSession = {
        access_token: validToken,
      };
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockAuth.businessContext.getCurrentBusinessId.mockReturnValue(null);
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));
      
      await fetchInterceptor.fetchWithAuth('/api/test');
      
      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer ' + validToken);
      expect(headers.get('X-Business-ID')).toBeNull();
    });

    it('should validate business context before making API calls', async () => {
      // Mock valid session with all required properties
      const mockSession = {
        access_token: 'mock-access-token',
        user: { id: 'user-123' },
      };
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      
      // Mock business context consistency validation
      jest.spyOn(jwtTokenManager, 'validateBusinessContextConsistency').mockResolvedValue(true);
      jest.spyOn(jwtTokenManager, 'validateTokenBusinessOwnership').mockResolvedValue({
        valid: true,
        error: null,
      });
      
      const result = await apiMiddleware.validateBusinessContextBeforeCall();
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should detect unauthenticated users in validation', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      
      const result = await apiMiddleware.validateBusinessContextBeforeCall();
      
      expect(result.valid).toBe(false);
      expect(result.error?.message).toBe('User not authenticated');
      expect(result.error?.status).toBe(401);
    });
  });
});