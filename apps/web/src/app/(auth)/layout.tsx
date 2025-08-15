import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Iniciar sesión - Appointments Demo',
  description: 'Inicia sesión en tu cuenta de Appointments Demo',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}