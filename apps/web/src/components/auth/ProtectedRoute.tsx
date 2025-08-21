'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, useBusinessContext } from '@/lib/auth-context';

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
  const { user, isLoading: authLoading } = useAuth();
  
  // Use async business context when business context is required
  const businessContext = useBusinessContext({ 
    autoSelect: requireBusinessContext 
  });
  
  const businessId = requireBusinessContext ? businessContext.businessId : null;
  const isBusinessLoading = requireBusinessContext ? businessContext.isLoading : false;
  const businessError = requireBusinessContext ? businessContext.error : null;

  useEffect(() => {
    if (authLoading || (requireBusinessContext && isBusinessLoading)) {
      return; // Wait for auth and business context to load
    }

    if (!user) {
      // User is not authenticated, redirect to login
      const returnUrl = encodeURIComponent(pathname);
      router.push(`${redirectTo}?returnUrl=${returnUrl}`);
      return;
    }

    if (requireBusinessContext) {
      if (businessError) {
        // Error loading business context, redirect to business registration
        console.error('Business context error:', businessError);
        router.push('/register/business');
        return;
      }
      
      if (!businessId) {
        // User is authenticated but no business found after auto-selection
        router.push('/register/business');
        return;
      }
    }
  }, [user, authLoading, isBusinessLoading, businessId, businessError, requireBusinessContext, router, pathname, redirectTo]);

  // Show loading state while checking authentication and business context
  if (authLoading || (requireBusinessContext && isBusinessLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {authLoading ? 'Verificando autenticación...' : 'Cargando contexto del negocio...'}
          </p>
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