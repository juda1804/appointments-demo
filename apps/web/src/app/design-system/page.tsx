'use client';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PesoDisplay, PhoneDisplay, BusinessHours } from '../../components/ui/ColombianDisplay';

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Energy/Performance Design System
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Professional design system with energy and performance focused colors 
            optimized for enterprise business applications.
          </p>
        </div>

        {/* Color Palette */}
        <Card className="mb-8 p-6">
          <h2 className="text-2xl font-semibold mb-6">Energy/Performance Color Palette</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-3">Primary Colors</h3>
              <div className="space-y-2">
                <div className="h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white font-medium">
                  Steel Blue (#0F172A)
                </div>
                <div className="h-12 bg-gray-900 rounded-lg flex items-center justify-center text-white font-medium" style={{backgroundColor: '#18181B'}}>
                  Carbon (#18181B)
                </div>
                <div className="h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-900 font-medium">
                  Light Neutral (#F8F9FA)
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-3">Accent Colors</h3>
              <div className="space-y-2">
                <div className="h-12 bg-yellow-500 rounded-lg flex items-center justify-center text-white font-medium">
                  CTA Orange (#EA580C)
                </div>
                <div className="h-12 bg-red-500 rounded-lg flex items-center justify-center text-white font-medium">
                  Alert Red (#DC2626)
                </div>
                <div className="h-12 bg-gray-600 rounded-lg flex items-center justify-center text-white font-medium" style={{backgroundColor: '#6B7280'}}>
                  Medium Gray (#6B7280)
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">Status Colors</h3>
              <div className="space-y-2">
                <div className="h-12 bg-green-500 rounded-lg flex items-center justify-center text-white font-medium">
                  Available
                </div>
                <div className="h-12 bg-red-500 rounded-lg flex items-center justify-center text-white font-medium">
                  Busy
                </div>
                <div className="h-12 bg-yellow-500 rounded-lg flex items-center justify-center text-white font-medium">
                  Break
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Buttons */}
        <Card className="mb-8 p-6">
          <h2 className="text-2xl font-semibold mb-6">Energy/Performance Buttons</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-3">Variantes</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="primary">Primario</Button>
                <Button variant="secondary">Secundario</Button>
                <Button variant="warning">Advertencia</Button>
                <Button variant="danger">Peligro</Button>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-3">Tamaños</h3>
              <div className="flex flex-wrap items-center gap-4">
                <Button size="sm">Pequeño</Button>
                <Button size="md">Mediano</Button>
                <Button size="lg">Grande</Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">Estados</h3>
              <div className="flex flex-wrap gap-4">
                <Button disabled>Deshabilitado</Button>
                <Button className="animate-pulse">Cargando</Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Business Components */}
        <Card className="mb-8 p-6">
          <h2 className="text-2xl font-semibold mb-6">Business Components</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium mb-4">Precios en Pesos</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-100 rounded">
                  <span>Corte de cabello:</span>
                  <PesoDisplay amount={25000} />
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-100 rounded">
                  <span>Manicure completa:</span>
                  <PesoDisplay amount={35000} large />
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-100 rounded">
                  <span>Paquete spa:</span>
                  <PesoDisplay amount={150000} large />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Phone Numbers</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-100 rounded">
                  <span>Salón Bogotá:</span>
                  <PhoneDisplay phone="3001234567" />
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-100 rounded">
                  <span>Barbería Medellín:</span>
                  <PhoneDisplay phone="3109876543" />
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-100 rounded">
                  <span>Spa Cali:</span>
                  <PhoneDisplay phone="3201112233" />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Badges */}
        <Card className="mb-8 p-6">
          <h2 className="text-2xl font-semibold mb-6">Status Badges</h2>
          
          <div className="flex flex-wrap gap-4">
            <Badge variant="success">Confirmada</Badge>
            <Badge variant="warning">Pendiente</Badge>
            <Badge variant="error">Cancelada</Badge>
            <Badge variant="info">Información</Badge>
          </div>
        </Card>

        {/* Business Hours */}
        <Card className="mb-8 p-6">
          <h2 className="text-2xl font-semibold mb-6">Horarios de Negocio</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Salón de Belleza Elena</h4>
                <BusinessHours isOpen={true} />
              </div>
              <p className="text-sm text-gray-600">Lunes a Sábado: 8:00 AM - 6:00 PM</p>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Barbería El Corte</h4>
                <BusinessHours isOpen={false} />
              </div>
              <p className="text-sm text-gray-600">Domingo: Cerrado</p>
            </div>
          </div>
        </Card>

        {/* Typography */}
        <Card className="mb-8 p-6">
          <h2 className="text-2xl font-semibold mb-6">Tipografía</h2>
          
          <div className="space-y-4">
            <div>
              <h1 className="mb-2">Título Principal (H1)</h1>
              <h2 className="mb-2">Subtítulo (H2)</h2>
              <h3 className="mb-2">Encabezado de Sección (H3)</h3>
              <p className="text-base mb-2">
                Texto normal para contenido principal del negocio colombiano.
              </p>
              <p className="text-sm text-gray-600">
                Texto pequeño para información secundaria y notas.
              </p>
            </div>
          </div>
        </Card>

        {/* Responsive Design */}
        <Card className="mb-8 p-6">
          <h2 className="text-2xl font-semibold mb-6">Responsive Design</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-100 rounded-lg">
              <h3 className="responsive-text mb-2">
                Responsive Text for Mobile Users
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                This text automatically adapts to different screen sizes, 
                optimized for modern mobile-first design patterns.
              </p>
              
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded text-center text-sm">
                  XS: 375px+
                </div>
                <div className="bg-white p-3 rounded text-center text-sm">
                  SM: 640px+
                </div>
                <div className="bg-white p-3 rounded text-center text-sm">
                  MD: 768px+
                </div>
                <div className="bg-white p-3 rounded text-center text-sm">
                  LG: 1024px+
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Animations */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-6">Animaciones</h2>
          
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="animate-fade-in p-4 bg-colombian-blue-100 rounded-lg">
                <span className="text-sm">Aparición Suave</span>
              </div>
              <div className="animate-slide-up p-4 bg-colombian-yellow-100 rounded-lg">
                <span className="text-sm">Deslizar Hacia Arriba</span>
              </div>
              <div className="animate-pulse-slow p-4 bg-colombian-red-100 rounded-lg">
                <span className="text-sm">Pulso Lento</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="loading-spinner w-8 h-8"></div>
              <span className="text-sm text-gray-600">Energy performance loading spinner</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}