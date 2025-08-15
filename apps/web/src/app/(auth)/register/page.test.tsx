import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import RegisterPage from './page';
import { auth } from '@/lib/auth';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock auth module
jest.mock('@/lib/auth', () => ({
  auth: {
    signUp: jest.fn(),
  },
}));

// Mock validation schemas
jest.mock('@/components/forms/validation-schemas', () => ({
  UserRegistrationSchema: {
    parse: jest.fn(),
  },
  extractValidationErrors: jest.fn(),
}));

const mockRouterPush = jest.fn();
const mockAuth = auth as jest.Mocked<typeof auth>;

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockRouterPush,
    });
  });

  it('renders registration form correctly', () => {
    render(<RegisterPage />);
    
    expect(screen.getByRole('heading', { name: /crear cuenta/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeInTheDocument();
    expect(screen.getByText(/¿ya tienes cuenta?/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /inicia sesión aquí/i })).toBeInTheDocument();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /crear cuenta/i });
    
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
    });
  });

  it('validates password requirements', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    
    const passwordInput = screen.getByLabelText(/^contraseña$/i);
    const submitButton = screen.getByRole('button', { name: /crear cuenta/i });
    
    await user.type(passwordInput, 'weak');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/la contraseña debe tener al menos 8 caracteres/i)).toBeInTheDocument();
    });
  });

  it('validates password confirmation match', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    
    const passwordInput = screen.getByLabelText(/^contraseña$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmar contraseña/i);
    const submitButton = screen.getByRole('button', { name: /crear cuenta/i });
    
    await user.type(passwordInput, 'ValidPass123!');
    await user.type(confirmPasswordInput, 'DifferentPass123!');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/las contraseñas no coinciden/i)).toBeInTheDocument();
    });
  });

  it('shows and hides password fields', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    
    const passwordInput = screen.getByLabelText(/^contraseña$/i);
    const showPasswordButton = screen.getAllByText(/mostrar/i)[0];
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    await user.click(showPasswordButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getAllByText(/ocultar/i)[0]).toBeInTheDocument();
    
    await user.click(screen.getAllByText(/ocultar/i)[0]);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('handles successful registration', async () => {
    const user = userEvent.setup();
    mockAuth.signUp.mockResolvedValue({
      data: { 
        user: { id: 'user-123', email: 'test@example.com' },
        session: { access_token: 'token' }
      },
      error: null
    });
    
    render(<RegisterPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^contraseña$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmar contraseña/i);
    const submitButton = screen.getByRole('button', { name: /crear cuenta/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'ValidPass123!');
    await user.type(confirmPasswordInput, 'ValidPass123!');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockAuth.signUp).toHaveBeenCalledWith('test@example.com', 'ValidPass123!');
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('handles registration with email verification required', async () => {
    const user = userEvent.setup();
    mockAuth.signUp.mockResolvedValue({
      data: { 
        user: { id: 'user-123', email: 'test@example.com' },
        session: null // No session means email verification required
      },
      error: null
    });
    
    render(<RegisterPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^contraseña$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmar contraseña/i);
    const submitButton = screen.getByRole('button', { name: /crear cuenta/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'ValidPass123!');
    await user.type(confirmPasswordInput, 'ValidPass123!');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/auth/verify-email?email=test%40example.com');
    });
  });

  it('handles registration errors', async () => {
    const user = userEvent.setup();
    mockAuth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered', status: 400 }
    });
    
    render(<RegisterPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^contraseña$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmar contraseña/i);
    const submitButton = screen.getByRole('button', { name: /crear cuenta/i });
    
    await user.type(emailInput, 'existing@example.com');
    await user.type(passwordInput, 'ValidPass123!');
    await user.type(confirmPasswordInput, 'ValidPass123!');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/este email ya está registrado/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during registration', async () => {
    const user = userEvent.setup();
    let resolveSignUp: (value: { data: { user: { id: string }; session: { access_token: string } }; error: null }) => void;
    mockAuth.signUp.mockImplementation(() => 
      new Promise<{ data: { user: { id: string }; session: { access_token: string } }; error: null }>(resolve => {
        resolveSignUp = resolve;
      })
    );
    
    render(<RegisterPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^contraseña$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmar contraseña/i);
    const submitButton = screen.getByRole('button', { name: /crear cuenta/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'ValidPass123!');
    await user.type(confirmPasswordInput, 'ValidPass123!');
    await user.click(submitButton);
    
    expect(screen.getByText(/creando cuenta.../i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    
    // Resolve the promise
    resolveSignUp!({
      data: { user: { id: 'user-123' }, session: { access_token: 'token' } },
      error: null
    });
    
    await waitFor(() => {
      expect(screen.getByText(/crear cuenta/i)).toBeInTheDocument();
    });
  });

  it('clears field errors when user starts typing', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /crear cuenta/i });
    
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

  it('links to business registration page', () => {
    render(<RegisterPage />);
    
    const businessRegisterLink = screen.getByRole('link', { name: /registrar negocio/i });
    expect(businessRegisterLink).toHaveAttribute('href', '/register/business');
  });

  it('shows password requirements hint', () => {
    render(<RegisterPage />);
    
    expect(screen.getByText(/mínimo 8 caracteres con mayúsculas, minúsculas, números y símbolos/i)).toBeInTheDocument();
  });
});