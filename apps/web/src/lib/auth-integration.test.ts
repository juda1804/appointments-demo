import { auth, businessContext } from './auth';
import { UserRegistrationSchema, LoginSchema } from '@/components/forms/validation-schemas';

// Mock Supabase
jest.mock('./supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
    },
    rpc: jest.fn(),
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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockSupabase = require('./supabase').supabase;

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Registration Flow', () => {
    it('should complete user registration with email/password validation', async () => {
      // Test data that passes validation
      const registrationData = {
        email: 'test@example.com',
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!'
      };

      // Validate registration data
      const validationResult = UserRegistrationSchema.safeParse(registrationData);
      expect(validationResult.success).toBe(true);

      // Mock successful registration
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { 
          user: { id: 'user-123', email: 'test@example.com' },
          session: null 
        },
        error: null
      });

      // Call auth service
      const result = await auth.signUp(registrationData.email, registrationData.password);

      expect(result.error).toBeNull();
      expect(result.data.user?.email).toBe('test@example.com');
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'ValidPass123!'
      });
    });

    it('should handle registration validation errors', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'weak',
        confirmPassword: 'different'
      };

      const validationResult = UserRegistrationSchema.safeParse(invalidData);
      expect(validationResult.success).toBe(false);
      
      if (!validationResult.success) {
        const errors = validationResult.error.issues;
        expect(errors.some(e => e.path.includes('email'))).toBe(true);
        expect(errors.some(e => e.path.includes('password'))).toBe(true);
        expect(errors.some(e => e.path.includes('confirmPassword'))).toBe(true);
      }
    });
  });

  describe('Complete Login Flow', () => {
    it('should complete login with business context setup', async () => {
      // Test data that passes validation
      const loginData = {
        email: 'test@example.com',
        password: 'ValidPass123!'
      };

      // Validate login data
      const validationResult = LoginSchema.safeParse(loginData);
      expect(validationResult.success).toBe(true);

      // Mock successful login with business context
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { business_id: 'business-123' }
      };
      const mockSession = {
        access_token: 'mock-token',
        user: mockUser
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });
      mockSupabase.rpc.mockResolvedValue({ error: null });

      // Call auth service
      const result = await auth.signIn(loginData.email, loginData.password);

      expect(result.error).toBeNull();
      expect(result.data.session?.access_token).toBe('mock-token');
      
      // Verify business context was set
      expect(localStorageMock.setItem).toHaveBeenCalledWith('current_business_id', 'business-123');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('set_current_business_id', {
        business_id: 'business-123'
      });
    });

    it('should handle login with invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      // Mock authentication failure
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', status: 400 }
      });

      const result = await auth.signIn(loginData.email, loginData.password);

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('Invalid login credentials');
      expect(result.data.user).toBeNull();
      expect(result.data.session).toBeNull();
    });
  });

  describe('Business Context Management Flow', () => {
    it('should validate and set business context correctly', async () => {
      const userId = 'user-123';
      const businessId = 'business-123';

      // Mock successful business validation
      const mockSingle = jest.fn().mockResolvedValue({
        data: { id: businessId },
        error: null
      });
      const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const validation = await businessContext.validateBusinessContext(userId, businessId);

      expect(validation.valid).toBe(true);
      expect(validation.error).toBeNull();
    });

    it('should handle invalid business context', async () => {
      const userId = 'user-123';
      const businessId = 'invalid-business';

      // Mock validation failure
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      });
      const mockEq2 = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq1 });
      mockSupabase.from.mockReturnValue({ select: mockSelect });

      const validation = await businessContext.validateBusinessContext(userId, businessId);

      expect(validation.valid).toBe(false);
      expect(validation.error?.message).toBe('Business context validation failed');
      expect(validation.error?.status).toBe(403);
    });
  });

  describe('Session Management Flow', () => {
    it('should handle complete logout with cleanup', async () => {
      // Mock successful logout
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      const result = await auth.signOut();

      expect(result.error).toBeNull();
      
      // Verify business context was cleared
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('current_business_id');
    });

    it('should handle session restoration', async () => {
      const mockSession = {
        access_token: 'token',
        user: { id: 'user-123', email: 'test@example.com' }
      };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      const result = await auth.getSession();

      expect(result.error).toBeNull();
      expect(result.data.session?.access_token).toBe('token');
    });
  });

  describe('Error Handling Flows', () => {
    it('should handle network errors gracefully', async () => {
      mockSupabase.auth.signInWithPassword.mockRejectedValue(new Error('Network error'));

      const result = await auth.signIn('test@example.com', 'password');

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('Network error');
      expect(result.error?.status).toBe(500);
    });

    it('should handle business context RPC errors', async () => {
      mockSupabase.rpc.mockResolvedValue({
        error: { message: 'RPC failed', code: '301' }
      });

      const result = await businessContext.setDatabaseBusinessContext('business-123');

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('RPC failed');
      expect(result.error?.status).toBe(301);
    });

    it('should handle auth state changes with error recovery', () => {
      let authStateCallback: (event: string, session: unknown) => void;

      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      // Set up the listener
      const unsubscribe = auth.onAuthStateChange(() => {
        // User callback would handle the auth state
      });

      // Simulate auth state change to null (logout)
      authStateCallback('SIGNED_OUT', null);

      // Verify business context is cleared
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('current_business_id');

      // Cleanup
      unsubscribe.data?.subscription?.unsubscribe?.();
    });
  });

  describe('Password Reset Flow', () => {
    it('should handle password reset request', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: { message: 'Reset email sent' },
        error: null
      });

      const result = await auth.resetPassword('test@example.com');

      expect(result.error).toBeNull();
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle password reset errors', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: null,
        error: { message: 'User not found', status: 404 }
      });

      const result = await auth.resetPassword('nonexistent@example.com');

      expect(result.error?.message).toBe('User not found');
      expect(result.error?.status).toBe(404);
    });
  });
});