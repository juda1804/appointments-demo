'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth-context';

// Disable static optimization for this page since it requires client-side auth
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const { user, getCurrentBusinessId, signOut } = useAuth();
  const businessId = getCurrentBusinessId();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <ProtectedRoute requireBusinessContext={false}>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  Panel de Control
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  {user?.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  ¡Bienvenido a tu panel de control!
                </h2>
                <p className="text-gray-600 mb-6">
                  Autenticación exitosa. Tu negocio está listo para gestionar citas.
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-800">
                        <strong>Estado de autenticación:</strong> Activo
                        {businessId && (
                          <>
                            <br />
                            <strong>Contexto de negocio:</strong> {businessId}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="font-semibold text-gray-900 mb-2">Citas</h3>
                    <p className="text-gray-600 text-sm">Gestiona las citas de tu negocio</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="font-semibold text-gray-900 mb-2">Clientes</h3>
                    <p className="text-gray-600 text-sm">Administra tu base de clientes</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="font-semibold text-gray-900 mb-2">Reportes</h3>
                    <p className="text-gray-600 text-sm">Analiza el rendimiento de tu negocio</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}