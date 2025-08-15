'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface ProtectedRouteProps {
  children: ReactNode;
  requireBusinessContext?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requireBusinessContext = false,
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, getCurrentBusinessId } = useAuth();
  const businessId = getCurrentBusinessId();

  useEffect(() => {
    if (isLoading) {
      return; // Wait for auth state to load
    }

    if (!user) {
      // User is not authenticated, redirect to login
      const returnUrl = encodeURIComponent(pathname);
      router.push(`${redirectTo}?returnUrl=${returnUrl}`);
      return;
    }

    if (requireBusinessContext && !businessId) {
      // User is authenticated but missing business context
      // Redirect to business setup or dashboard
      router.push('/dashboard?setup=business');
      return;
    }
  }, [user, isLoading, businessId, requireBusinessContext, router, pathname, redirectTo]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Don't render children if user is not authenticated or missing required context
  if (!user || (requireBusinessContext && !businessId)) {
    return null;
  }

  // User is authenticated and has required context, render children
  return <>{children}</>;
}

export default ProtectedRoute;