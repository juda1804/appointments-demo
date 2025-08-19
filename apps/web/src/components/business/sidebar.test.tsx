import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import { BusinessSidebar } from './sidebar';
import { useAuth } from '@/lib/auth-context';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock Next.js Link
jest.mock('next/link', () => {
  const MockLink = ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => {
  function MockIcon(props: { [key: string]: unknown }) {
    return <div data-testid="mock-icon" {...props} />;
  }
  
  return {
    HomeIcon: MockIcon,
    UserGroupIcon: MockIcon,
    CogIcon: MockIcon,
    CalendarIcon: MockIcon,
    ClipboardDocumentListIcon: MockIcon,
    UsersIcon: MockIcon,
    XMarkIcon: MockIcon,
    Bars3Icon: MockIcon,
  };
});

// Mock auth context
jest.mock('@/lib/auth-context', () => ({
  useAuth: jest.fn(),
}));

const mockRouterPush = jest.fn();
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockGetCurrentBusinessId = jest.fn();

describe('BusinessSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockRouterPush,
    });
    
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      isLoading: false,
      isInitialized: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      enhancedSignOut: jest.fn(),
      refreshSession: jest.fn(),
      setBusinessContext: jest.fn(),
      getCurrentBusinessId: mockGetCurrentBusinessId,
      initializeSessionTimeout: jest.fn(),
      resetSessionTimeout: jest.fn(),
      stopSessionTimeout: jest.fn(),
    });
  });

  it('renders all navigation links', () => {
    mockGetCurrentBusinessId.mockReturnValue('business-123');
    mockUsePathname.mockReturnValue('/dashboard');

    render(<BusinessSidebar isOpen={true} onClose={jest.fn()} />);

    expect(screen.getByText('Panel de Control')).toBeInTheDocument();
    expect(screen.getByText('Especialistas')).toBeInTheDocument();
    expect(screen.getByText('Servicios')).toBeInTheDocument();
    expect(screen.getByText('Calendario')).toBeInTheDocument();
    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('Configuración')).toBeInTheDocument();
  });

  it('highlights active navigation link', () => {
    mockGetCurrentBusinessId.mockReturnValue('business-123');
    mockUsePathname.mockReturnValue('/dashboard');

    render(<BusinessSidebar isOpen={true} onClose={jest.fn()} />);

    const dashboardLink = screen.getByRole('link', { name: /panel de control/i });
    expect(dashboardLink).toHaveClass('bg-blue-50', 'text-blue-700');
  });

  it('shows different active state for specialists page', () => {
    mockGetCurrentBusinessId.mockReturnValue('business-123');
    mockUsePathname.mockReturnValue('/specialists');

    render(<BusinessSidebar isOpen={true} onClose={jest.fn()} />);

    const specialistsLink = screen.getByRole('link', { name: /especialistas/i });
    expect(specialistsLink).toHaveClass('bg-blue-50', 'text-blue-700');
  });

  it('calls onClose when clicking outside on mobile', () => {
    const mockOnClose = jest.fn();
    mockGetCurrentBusinessId.mockReturnValue('business-123');
    mockUsePathname.mockReturnValue('/dashboard');

    render(<BusinessSidebar isOpen={true} onClose={mockOnClose} />);

    // Click the overlay
    const overlay = screen.getByTestId('sidebar-overlay');
    fireEvent.click(overlay);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('displays business logo and name', () => {
    mockGetCurrentBusinessId.mockReturnValue('business-123');
    mockUsePathname.mockReturnValue('/dashboard');

    render(<BusinessSidebar isOpen={true} onClose={jest.fn()} />);

    expect(screen.getByText('Mi Negocio')).toBeInTheDocument();
  });

  it('shows sign out button', () => {
    mockGetCurrentBusinessId.mockReturnValue('business-123');
    mockUsePathname.mockReturnValue('/dashboard');

    render(<BusinessSidebar isOpen={true} onClose={jest.fn()} />);

    expect(screen.getByText('Cerrar Sesión')).toBeInTheDocument();
  });

  it('handles sign out functionality', () => {
    const mockSignOut = jest.fn();
    mockGetCurrentBusinessId.mockReturnValue('business-123');
    mockUsePathname.mockReturnValue('/dashboard');
    
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

    render(<BusinessSidebar isOpen={true} onClose={jest.fn()} />);

    const signOutButton = screen.getByRole('button', { name: /cerrar sesión/i });
    fireEvent.click(signOutButton);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('has correct navigation hrefs', () => {
    mockGetCurrentBusinessId.mockReturnValue('business-123');
    mockUsePathname.mockReturnValue('/dashboard');

    render(<BusinessSidebar isOpen={true} onClose={jest.fn()} />);

    expect(screen.getByRole('link', { name: /panel de control/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /especialistas/i })).toHaveAttribute('href', '/specialists');
    expect(screen.getByRole('link', { name: /servicios/i })).toHaveAttribute('href', '/services');
    expect(screen.getByRole('link', { name: /calendario/i })).toHaveAttribute('href', '/calendar');
    expect(screen.getByRole('link', { name: /clientes/i })).toHaveAttribute('href', '/clients');
    expect(screen.getByRole('link', { name: /configuración/i })).toHaveAttribute('href', '/settings');
  });

  it('renders with correct responsive classes', () => {
    mockGetCurrentBusinessId.mockReturnValue('business-123');
    mockUsePathname.mockReturnValue('/dashboard');

    render(<BusinessSidebar isOpen={true} onClose={jest.fn()} />);

    const sidebar = screen.getByTestId('business-sidebar');
    expect(sidebar).toHaveClass('fixed', 'inset-y-0', 'left-0', 'z-50', 'w-64', 'bg-white', 'shadow-lg');
  });

  it('shows when isOpen is true', () => {
    mockGetCurrentBusinessId.mockReturnValue('business-123');
    mockUsePathname.mockReturnValue('/dashboard');

    render(<BusinessSidebar isOpen={true} onClose={jest.fn()} />);

    const sidebar = screen.getByTestId('business-sidebar');
    expect(sidebar).toBeInTheDocument();
  });

  it('is hidden when isOpen is false', () => {
    mockGetCurrentBusinessId.mockReturnValue('business-123');
    mockUsePathname.mockReturnValue('/dashboard');

    render(<BusinessSidebar isOpen={false} onClose={jest.fn()} />);

    const sidebar = screen.queryByTestId('business-sidebar');
    expect(sidebar).not.toBeInTheDocument();
  });
});