'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { BusinessSidebar } from './sidebar';
import { Bars3Icon } from '@heroicons/react/24/outline';

interface BusinessLayoutProps {
  children: React.ReactNode;
}

export function BusinessLayout({ children }: BusinessLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const searchParams = useSearchParams();
  
  // Allow dashboard access during business setup flow to handle redirect logic
  const isSetupFlow = searchParams.get('setup') === 'business';
  const requireBusinessContext = !isSetupFlow;

  return (
    <ProtectedRoute requireBusinessContext={requireBusinessContext}>
      <div className="min-h-screen bg-gray-50">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0" data-testid="business-sidebar">
          <BusinessSidebar isOpen={true} onClose={() => {}} />
        </div>

        {/* Mobile sidebar */}
        <BusinessSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content */}
        <div className="lg:pl-64 flex flex-col flex-1">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center justify-between h-16 bg-white border-b border-gray-200 px-4">
            <button
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Panel de Control</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>

          {/* Page content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}