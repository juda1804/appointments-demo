import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { LoginForm } from './page';
import { auth } from '@/lib/auth';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock auth module
jest.mock('@/lib/auth', () => ({
  auth: {
    signIn: jest.fn(),
    resetPassword: jest.fn(),
    getCurrentBusinessId: jest.fn(),
  },
}));

// Mock validation schemas
jest.mock('@/components/forms/validation-schemas', () => ({
  LoginSchema: {
    parse: jest.fn(),
  },
  extractValidationErrors: jest.fn(),
}));

const mockRouterPush = jest.fn();
const mockSearchParamsGet = jest.fn();
const mockAuth = auth as jest.Mocked<typeof auth>;

// Test wrapper to handle Suspense boundary
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<div data-testid="loading">Loading...</div>}>
      {children}
    </Suspense>
  );
};

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockRouterPush,
    });
    (useSearchParams as jest.Mock).mockReturnValue({
      get: mockSearchParamsGet,
    });
    mockSearchParamsGet.mockReturnValue(null); // Default to no return URL
  });

  it('renders login form correctly', () => {
    render(<LoginForm />, { wrapper: TestWrapper });
    
    expect(screen.getByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /¿olvidaste tu contraseña?/i })).toBeInTheDocument();
    expect(screen.getByText(/¿no tienes cuenta?/i)).toBeInTheDocument();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    render(<LoginForm />, { wrapper: TestWrapper });
    
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
    });
  });

  it('requires password field', async () => {
    const user = userEvent.setup();
    render(<LoginForm />, { wrapper: TestWrapper });
    
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/la contraseña es requerida/i)).toBeInTheDocument();
    });
  });

  it('shows and hides password field', async () => {
    const user = userEvent.setup();
    render(<LoginForm />, { wrapper: TestWrapper });
    
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const showPasswordButton = screen.getByText(/mostrar/i);
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    await user.click(showPasswordButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByText(/ocultar/i)).toBeInTheDocument();
  });

  it('handles successful login', async () => {
    const user = userEvent.setup();
    mockAuth.signIn.mockResolvedValue({
      data: { 
        user: { id: 'user-123', email: 'test@example.com' },
        session: { access_token: 'token' }
      },
      error: null
    });
    mockAuth.getCurrentBusinessId.mockReturnValue('business-123');
    
    render(<LoginForm />, { wrapper: TestWrapper });
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockAuth.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('handles login with invalid credentials', async () => {
    const user = userEvent.setup();
    mockAuth.signIn.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials', status: 400 }
    });
    
    render(<LoginForm />, { wrapper: TestWrapper });
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/email o contraseña incorrectos/i)).toBeInTheDocument();
    });
  });

  it('handles email not confirmed error', async () => {
    const user = userEvent.setup();
    mockAuth.signIn.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Email not confirmed', status: 400 }
    });
    
    render(<LoginForm />, { wrapper: TestWrapper });
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/debes verificar tu email/i)).toBeInTheDocument();
    });
  });

  it('handles too many requests error', async () => {
    const user = userEvent.setup();
    mockAuth.signIn.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Too many requests', status: 429 }
    });
    
    render(<LoginForm />, { wrapper: TestWrapper });
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/demasiados intentos/i)).toBeInTheDocument();
    });
  });

  it('handles network error', async () => {
    const user = userEvent.setup();
    mockAuth.signIn.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Network error', status: 500 }
    });
    
    render(<LoginForm />, { wrapper: TestWrapper });
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/error de conexión/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during login', async () => {
    const user = userEvent.setup();
    let resolveSignIn: (value: { data: { user: { id: string }; session: { access_token: string } }; error: null }) => void;
    mockAuth.signIn.mockImplementation(() => 
      new Promise<{ data: { user: { id: string }; session: { access_token: string } }; error: null }>(resolve => {
        resolveSignIn = resolve;
      })
    );
    
    render(<LoginForm />, { wrapper: TestWrapper });
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    expect(screen.getByText(/iniciando sesión.../i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    
    // Resolve the promise
    resolveSignIn!({
      data: { user: { id: 'user-123' }, session: { access_token: 'token' } },
      error: null
    });
    
    await waitFor(() => {
      expect(screen.getByText(/iniciar sesión/i)).toBeInTheDocument();
    });
  });

  it('clears field errors when user starts typing', async () => {
    const user = userEvent.setup();
    render(<LoginForm />, { wrapper: TestWrapper });
    
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    
    // Trigger validation error
    await user.type(emailInput, 'invalid');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
    });
    
    // Start typing to clear error
    await user.clear(emailInput);
    await user.type(emailInput, 'valid@example.com');
    
    expect(screen.queryByText(/email inválido/i)).not.toBeInTheDocument();
  });

  it('handles forgot password functionality', async () => {
    const user = userEvent.setup();
    mockAuth.resetPassword.mockResolvedValue({
      data: { message: 'Email sent' },
      error: null
    });
    
    render(<LoginForm />, { wrapper: TestWrapper });
    
    const emailInput = screen.getByLabelText(/email/i);
    const forgotPasswordButton = screen.getByRole('button', { name: /¿olvidaste tu contraseña?/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.click(forgotPasswordButton);
    
    await waitFor(() => {
      expect(mockAuth.resetPassword).toHaveBeenCalledWith('test@example.com');
      expect(screen.getByText(/se ha enviado un email de recuperación/i)).toBeInTheDocument();
    });
  });

  it('requires email for forgot password', async () => {
    const user = userEvent.setup();
    render(<LoginForm />, { wrapper: TestWrapper });
    
    const forgotPasswordButton = screen.getByRole('button', { name: /¿olvidaste tu contraseña?/i });
    
    await user.click(forgotPasswordButton);
    
    await waitFor(() => {
      expect(screen.getByText(/ingresa tu email para recuperar/i)).toBeInTheDocument();
    });
  });

  it('handles forgot password error', async () => {
    const user = userEvent.setup();
    mockAuth.resetPassword.mockResolvedValue({
      data: null,
      error: { message: 'Reset failed', status: 400 }
    });
    
    render(<LoginForm />, { wrapper: TestWrapper });
    
    const emailInput = screen.getByLabelText(/email/i);
    const forgotPasswordButton = screen.getByRole('button', { name: /¿olvidaste tu contraseña?/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.click(forgotPasswordButton);
    
    await waitFor(() => {
      expect(screen.getByText(/error al enviar el email de recuperación/i)).toBeInTheDocument();
    });
  });

  it('links to registration page', () => {
    render(<LoginForm />, { wrapper: TestWrapper });
    
    const registerLink = screen.getByRole('link', { name: /regístrate aquí/i });
    expect(registerLink).toHaveAttribute('href', '/register');
  });

  it('links to business registration page', () => {
    render(<LoginForm />, { wrapper: TestWrapper });
    
    const businessRegisterLink = screen.getByRole('link', { name: /registrar negocio/i });
    expect(businessRegisterLink).toHaveAttribute('href', '/register/business');
  });

  it('handles login without business context', async () => {
    const user = userEvent.setup();
    mockAuth.signIn.mockResolvedValue({
      data: { 
        user: { id: 'user-123', email: 'test@example.com' },
        session: { access_token: 'token' }
      },
      error: null
    });
    mockAuth.getCurrentBusinessId.mockReturnValue(null);
    
    render(<LoginForm />, { wrapper: TestWrapper });
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('redirects to return URL after successful login', async () => {
    const user = userEvent.setup();
    mockSearchParamsGet.mockReturnValue('%2Fsettings%2Fprofile');
    mockAuth.signIn.mockResolvedValue({
      data: { 
        user: { id: 'user-123', email: 'test@example.com' },
        session: { access_token: 'token' }
      },
      error: null
    });
    mockAuth.getCurrentBusinessId.mockReturnValue('business-123');
    
    render(<LoginForm />, { wrapper: TestWrapper });
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockSearchParamsGet).toHaveBeenCalledWith('returnUrl');
      expect(mockRouterPush).toHaveBeenCalledWith('/settings/profile');
    });
  });

  it('falls back to dashboard when return URL is invalid', async () => {
    const user = userEvent.setup();
    mockSearchParamsGet.mockReturnValue(null);
    mockAuth.signIn.mockResolvedValue({
      data: { 
        user: { id: 'user-123', email: 'test@example.com' },
        session: { access_token: 'token' }
      },
      error: null
    });
    mockAuth.getCurrentBusinessId.mockReturnValue('business-123');
    
    render(<LoginForm />, { wrapper: TestWrapper });
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
    });
  });
});