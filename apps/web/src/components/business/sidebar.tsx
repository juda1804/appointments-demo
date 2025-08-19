'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { 
  HomeIcon, 
  UserGroupIcon, 
  CogIcon, 
  CalendarIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface BusinessSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: 'Panel de Control', href: '/dashboard', icon: HomeIcon },
  { name: 'Especialistas', href: '/specialists', icon: UserGroupIcon },
  { name: 'Servicios', href: '/services', icon: ClipboardDocumentListIcon },
  { name: 'Calendario', href: '/calendar', icon: CalendarIcon },
  { name: 'Clientes', href: '/clients', icon: UsersIcon },
  { name: 'Configuración', href: '/settings', icon: CogIcon },
];

export function BusinessSidebar({ isOpen, onClose }: BusinessSidebarProps) {
  const pathname = usePathname();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Mobile overlay */}
      <div 
        className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
        onClick={onClose}
        data-testid="sidebar-overlay"
      />
      
      {/* Sidebar */}
      <div 
        className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0"
        data-testid="business-sidebar"
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MN</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Mi Negocio</p>
            </div>
          </div>
          
          {/* Close button for mobile */}
          <button
            className="lg:hidden -mr-2 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-5 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`${
                  isActive
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } group flex items-center px-3 py-2 text-sm font-medium border-l-4 transition-colors duration-150 ease-in-out`}
                onClick={() => {
                  // Close mobile menu when navigation item is clicked
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    onClose();
                  }
                }}
              >
                <item.icon
                  className={`${
                    isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                  } mr-3 h-5 w-5 transition-colors duration-150 ease-in-out`}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sign out button */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="group flex w-full items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors duration-150 ease-in-out"
          >
            <svg
              className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Cerrar Sesión
          </button>
        </div>
      </div>
    </>
  );
}