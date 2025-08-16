import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import DashboardPage from './page';
import { useAuth } from '@/lib/auth-context';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/dashboard'),
}));

// Mock auth context
jest.mock('@/lib/auth-context', () => ({
  useAuth: jest.fn(),
}));

// Mock ProtectedRoute component
jest.mock('@/components/auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => children,
}));

const mockRouterPush = jest.fn();
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockSignOut = jest.fn();
const mockGetCurrentBusinessId = jest.fn();

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockRouterPush,
    });
  });

  it('renders dashboard with user information', () => {
    mockGetCurrentBusinessId.mockReturnValue('business-123');
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      isLoading: false,
      isInitialized: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
      enhancedSignOut: jest.fn(),
      refreshSession: jest.fn(),
      setBusinessContext: jest.fn(),
      getCurrentBusinessId: mockGetCurrentBusinessId,
      initializeSessionTimeout: jest.fn(),
      resetSessionTimeout: jest.fn(),
      stopSessionTimeout: jest.fn(),
    });

    render(<DashboardPage />);

    expect(screen.getByText('Panel de Control')).toBeInTheDocument();
    expect(screen.getByText('¡Bienvenido a tu panel de control!')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('business-123')).toBeInTheDocument();
  });

  it('renders dashboard without business context', () => {
    mockGetCurrentBusinessId.mockReturnValue(null);
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      isLoading: false,
      isInitialized: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
      enhancedSignOut: jest.fn(),
      refreshSession: jest.fn(),
      setBusinessContext: jest.fn(),
      getCurrentBusinessId: mockGetCurrentBusinessId,
      initializeSessionTimeout: jest.fn(),
      resetSessionTimeout: jest.fn(),
      stopSessionTimeout: jest.fn(),
    });

    render(<DashboardPage />);

    expect(screen.getByText('Panel de Control')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.queryByText('business-123')).not.toBeInTheDocument();
  });

  it('displays main navigation sections', () => {
    mockGetCurrentBusinessId.mockReturnValue('business-123');
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      isLoading: false,
      isInitialized: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
      enhancedSignOut: jest.fn(),
      refreshSession: jest.fn(),
      setBusinessContext: jest.fn(),
      getCurrentBusinessId: mockGetCurrentBusinessId,
      initializeSessionTimeout: jest.fn(),
      resetSessionTimeout: jest.fn(),
      stopSessionTimeout: jest.fn(),
    });

    render(<DashboardPage />);

    expect(screen.getByText('Citas')).toBeInTheDocument();
    expect(screen.getByText('Gestiona las citas de tu negocio')).toBeInTheDocument();
    
    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('Administra tu base de clientes')).toBeInTheDocument();
    
    expect(screen.getByText('Reportes')).toBeInTheDocument();
    expect(screen.getByText('Analiza el rendimiento de tu negocio')).toBeInTheDocument();
  });

  it('shows authentication status information', () => {
    mockGetCurrentBusinessId.mockReturnValue('business-123');
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      isLoading: false,
      isInitialized: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
      enhancedSignOut: jest.fn(),
      refreshSession: jest.fn(),
      setBusinessContext: jest.fn(),
      getCurrentBusinessId: mockGetCurrentBusinessId,
      initializeSessionTimeout: jest.fn(),
      resetSessionTimeout: jest.fn(),
      stopSessionTimeout: jest.fn(),
    });

    render(<DashboardPage />);

    expect(screen.getByText('Estado de autenticación:')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Contexto de negocio:')).toBeInTheDocument();
  });

  it('handles sign out functionality', async () => {
    mockGetCurrentBusinessId.mockReturnValue('business-123');
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      isLoading: false,
      isInitialized: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
      enhancedSignOut: jest.fn(),
      refreshSession: jest.fn(),
      setBusinessContext: jest.fn(),
      getCurrentBusinessId: mockGetCurrentBusinessId,
      initializeSessionTimeout: jest.fn(),
      resetSessionTimeout: jest.fn(),
      stopSessionTimeout: jest.fn(),
    });

    render(<DashboardPage />);

    const signOutButton = screen.getByRole('button', { name: /cerrar sesión/i });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  it('displays sign out button in navigation', () => {
    mockGetCurrentBusinessId.mockReturnValue('business-123');
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      isLoading: false,
      isInitialized: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
      enhancedSignOut: jest.fn(),
      refreshSession: jest.fn(),
      setBusinessContext: jest.fn(),
      getCurrentBusinessId: mockGetCurrentBusinessId,
      initializeSessionTimeout: jest.fn(),
      resetSessionTimeout: jest.fn(),
      stopSessionTimeout: jest.fn(),
    });

    render(<DashboardPage />);

    const signOutButton = screen.getByRole('button', { name: /cerrar sesión/i });
    expect(signOutButton).toBeInTheDocument();
  });

  it('shows welcome message and authentication success status', () => {
    mockGetCurrentBusinessId.mockReturnValue('business-123');
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      isLoading: false,
      isInitialized: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
      enhancedSignOut: jest.fn(),
      refreshSession: jest.fn(),
      setBusinessContext: jest.fn(),
      getCurrentBusinessId: mockGetCurrentBusinessId,
      initializeSessionTimeout: jest.fn(),
      resetSessionTimeout: jest.fn(),
      stopSessionTimeout: jest.fn(),
    });

    render(<DashboardPage />);

    expect(screen.getByText('Autenticación exitosa. Tu negocio está listo para gestionar citas.')).toBeInTheDocument();
  });
});