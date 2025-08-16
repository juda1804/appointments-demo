'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type VerificationStatus = 'loading' | 'success' | 'error' | 'invalid_token' | 'expired_token' | 'network_error';

interface VerificationError {
  message: string;
  status?: number;
  canRetry?: boolean;
  canResend?: boolean;
}

export function EmailVerificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [error, setError] = useState<VerificationError | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [businessContextWarning, setBusinessContextWarning] = useState(false);

  const token = searchParams.get('token');
  const type = searchParams.get('type') as 'signup' | 'recovery' | null;
  const email = searchParams.get('email');

  useEffect(() => {
    const verifyTokenEffect = async (tokenHash: string, verificationType: 'signup' | 'recovery') => {
      try {
        setStatus('loading');
        
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: verificationType
        });

        if (verifyError) {
          handleVerificationError(verifyError);
          return;
        }

        if (data.user && data.session) {
          setStatus('success');
          
          // Handle business context setup for signup
          if (verificationType === 'signup') {
            await handleBusinessContextSetup();
          }
          
          // Redirect based on verification type
          setTimeout(() => {
            if (verificationType === 'recovery') {
              router.push('/auth/reset-password');
            } else {
              router.push('/dashboard');
            }
          }, 2000);
        } else {
          setStatus('error');
          setError({
            message: 'La verificación falló. Token inválido.',
            canRetry: true,
            canResend: true
          });
        }
      } catch (err) {
        console.error('Email verification error:', err);
        setStatus('network_error');
        setError({
          message: 'Error de conexión. Verifica tu conexión a internet.',
          canRetry: true,
          canResend: false
        });
      }
    };

    if (!token || !type) {
      setStatus('invalid_token');
      setError({
        message: 'No se proporcionó un token de verificación válido',
        canRetry: false,
        canResend: false
      });
      return;
    }

    verifyTokenEffect(token, type);
  }, [token, type, router]);


  const handleVerificationError = (verifyError: { message?: string; status?: number }) => {
    if (verifyError.message?.includes('expired') || verifyError.status === 410) {
      setStatus('expired_token');
      setError({
        message: 'El enlace de verificación ha expirado',
        canRetry: false,
        canResend: true
      });
    } else if (verifyError.message?.includes('invalid') || verifyError.status === 400) {
      setStatus('invalid_token');
      setError({
        message: 'El enlace de verificación no es válido. Es posible que el enlace haya expirado o ya haya sido usado.',
        canRetry: false,
        canResend: true
      });
    } else {
      setStatus('error');
      setError({
        message: 'Error durante la verificación. Por favor, intenta de nuevo.',
        canRetry: true,
        canResend: true
      });
    }
  };

  const handleBusinessContextSetup = async () => {
    try {
      // Get user with metadata
      const { data: userData } = await auth.getUser();
      
      if (userData.user?.user_metadata?.business_id) {
        const businessId = userData.user.user_metadata.business_id;
        const { error: contextError } = await auth.setBusinessContext(businessId);
        
        if (contextError) {
          console.warn('Business context setup failed:', contextError);
          setBusinessContextWarning(true);
        }
      }
    } catch (err) {
      console.warn('Business context setup error:', err);
      setBusinessContextWarning(true);
    }
  };

  const handleResendEmail = async () => {
    if (!email || !type || isResending) return;

    setIsResending(true);
    setResendSuccess(false);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: type,
        email: email
      });

      if (resendError) {
        if (resendError.message?.includes('rate limit') || resendError.status === 429) {
          setError({
            ...error,
            message: 'Demasiados intentos. Espera unos minutos antes de solicitar otro enlace.'
          });
        } else {
          setError({
            ...error,
            message: 'Error al enviar el enlace. Por favor, intenta de nuevo.'
          });
        }
      } else {
        setResendSuccess(true);
        setError(null);
      }
    } catch (err) {
      console.error('Resend email error:', err);
      setError({
        ...error,
        message: 'Error de conexión al enviar el enlace.'
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleRetry = () => {
    if (token && type) {
      // Reset status and re-trigger the useEffect
      setStatus('loading');
      setError(null);
    }
  };

  return (
    <main 
      className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      aria-label="Verificación de correo electrónico"
    >
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Verificación de Correo Electrónico
          </h1>
          <p className="text-gray-600">
            Appointments Demo - Sistema de Gestión de Citas
          </p>
        </div>

        <Card className="p-8">
          {status === 'loading' && (
            <div className="text-center">
              <div 
                className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"
                data-testid="loading-spinner"
                aria-label="Verificando email"
              />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Verificando tu email...
              </h2>
              <p className="text-gray-600">
                Por favor espera mientras procesamos tu verificación.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="rounded-full h-12 w-12 bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h2 className="text-lg font-semibold text-green-800 mb-2">
                ¡Email verificado exitosamente!
              </h2>
              
              <p className="text-gray-600 mb-4">
                Bienvenido a Appointments Demo
              </p>

              {businessContextWarning && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    Advertencia: Configuración del negocio pendiente. 
                    Podrás completarla en el dashboard.
                  </p>
                </div>
              )}

              {type === 'signup' && (
                <p className="text-sm text-gray-500 mb-4">
                  Configurando tu negocio... Redirigiendo al dashboard...
                </p>
              )}

              {type === 'recovery' && (
                <p className="text-sm text-gray-500 mb-4">
                  Redirigiendo para cambiar contraseña...
                </p>
              )}

              <div className="animate-pulse">
                <div className="h-1 bg-blue-200 rounded">
                  <div className="h-1 bg-blue-600 rounded animate-pulse w-full"></div>
                </div>
              </div>
            </div>
          )}

          {(status === 'error' || status === 'invalid_token' || status === 'expired_token' || status === 'network_error') && (
            <div role="alert">
              <div className="rounded-full h-12 w-12 bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>

              <h2 className="text-lg font-semibold text-red-800 mb-2 text-center">
                {status === 'expired_token' ? 'Enlace Expirado' : 
                 status === 'invalid_token' ? 'Enlace Inválido' :
                 status === 'network_error' ? 'Error de Conexión' : 'Error de Verificación'}
              </h2>

              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <p className="text-sm text-red-800">
                  {error?.message}
                </p>
                
                {email && (status === 'expired_token' || status === 'invalid_token') && (
                  <p className="text-sm text-red-700 mt-2">
                    Email: <span className="font-mono">{email}</span>
                  </p>
                )}
              </div>

              {resendSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                  <h3 className="text-sm font-semibold text-green-800 mb-1">
                    Nuevo enlace enviado
                  </h3>
                  <p className="text-sm text-green-700">
                    Revisa tu bandeja de entrada y carpeta de spam.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {error?.canRetry && (
                  <Button
                    onClick={handleRetry}
                    className="w-full"
                    variant="outline"
                  >
                    Intentar de nuevo
                  </Button>
                )}

                {error?.canResend && email && (
                  <Button
                    onClick={handleResendEmail}
                    disabled={isResending}
                    className="w-full"
                  >
                    {isResending ? 'Enviando...' : 
                     status === 'expired_token' ? 'Enviar nuevo enlace' : 'Solicitar nuevo enlace'}
                  </Button>
                )}

                <Link
                  href="/login"
                  className="block w-full text-center text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Ir al inicio de sesión
                </Link>
              </div>
            </div>
          )}

          {status === 'invalid_token' && !token && (
            <div className="text-center">
              <div className="rounded-full h-12 w-12 bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>

              <h2 className="text-lg font-semibold text-red-800 mb-2">
                Enlace de verificación inválido
              </h2>

              <p className="text-gray-600 mb-4">
                No se proporcionó un token de verificación válido.
              </p>

              <Link
                href="/login"
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Ir al inicio de sesión
              </Link>
            </div>
          )}
        </Card>

        <div className="text-center text-sm text-gray-500">
          <p>
            ¿Necesitas ayuda?{' '}
            <Link href="/contact" className="text-blue-600 hover:text-blue-800 underline">
              Contáctanos
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return <EmailVerificationPage />;
}