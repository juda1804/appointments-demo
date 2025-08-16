import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '@/lib/auth-context';

// Mock Next.js router and pathname
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock auth context
jest.mock('@/lib/auth-context', () => ({
  useAuth: jest.fn(),
}));

const mockRouterPush = jest.fn();
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockRouterPush,
    });
    mockUsePathname.mockReturnValue('/dashboard');
  });

  it('shows loading state while authentication is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      businessId: null,
      signOut: jest.fn(),
    });

    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Verificando autenticación...')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      isLoading: false,
      businessId: 'business-123',
      signOut: jest.fn(),
    });

    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      businessId: null,
      signOut: jest.fn(),
    });

    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/login?returnUrl=%2Fdashboard');
    });

    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('redirects to custom login page when specified', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      businessId: null,
      signOut: jest.fn(),
    });

    render(
      <ProtectedRoute redirectTo="/auth/signin">
        <div>Protected content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/auth/signin?returnUrl=%2Fdashboard');
    });
  });

  it('redirects to business setup when business context is required but missing', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      isLoading: false,
      businessId: null,
      signOut: jest.fn(),
    });

    render(
      <ProtectedRoute requireBusinessContext={true}>
        <div>Protected content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard?setup=business');
    });

    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated and has required business context', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      isLoading: false,
      businessId: 'business-123',
      signOut: jest.fn(),
    });

    render(
      <ProtectedRoute requireBusinessContext={true}>
        <div>Protected content with business context</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected content with business context')).toBeInTheDocument();
  });

  it('renders children when business context is not required', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      isLoading: false,
      businessId: null,
      signOut: jest.fn(),
    });

    render(
      <ProtectedRoute requireBusinessContext={false}>
        <div>Protected content without business context</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected content without business context')).toBeInTheDocument();
  });

  it('handles different pathnames for return URL', async () => {
    mockUsePathname.mockReturnValue('/settings/profile');
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      businessId: null,
      signOut: jest.fn(),
    });

    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/login?returnUrl=%2Fsettings%2Fprofile');
    });
  });

  it('does not redirect when user becomes authenticated', () => {
    const { rerender } = render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    );

    // Initial state: loading
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      businessId: null,
      signOut: jest.fn(),
    });
    rerender(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    );

    // User becomes authenticated
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      isLoading: false,
      businessId: 'business-123',
      signOut: jest.fn(),
    });
    rerender(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});