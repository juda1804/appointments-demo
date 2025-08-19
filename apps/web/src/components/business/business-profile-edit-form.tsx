'use client';

import { useState, useCallback } from 'react';
import type { Business } from '@appointments-demo/types';
import { 
  formatColombianPhone, 
  validateColombianPhone, 
  COLOMBIAN_DEPARTMENTS, 
  isValidColombianDepartment 
} from '@appointments-demo/utils';

interface BusinessProfileEditFormProps {
  business: Business;
  onSave: (updatedBusiness: Business) => Promise<void>;
  onCancel: () => void;
}

interface FormData {
  name: string;
  description: string;
  street: string;
  city: string;
  department: string;
  postalCode: string;
  phone: string;
  whatsappNumber: string;
  email: string;
}

interface FormErrors {
  [key: string]: string;
}

export function BusinessProfileEditForm({ business, onSave, onCancel }: BusinessProfileEditFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: business.name,
    description: business.description || '',
    street: business.address.street,
    city: business.address.city,
    department: business.address.department,
    postalCode: business.address.postalCode || '',
    phone: business.phone,
    whatsappNumber: business.whatsappNumber || '',
    email: business.email
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Required fields validation
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del negocio es requerido';
    }

    if (!formData.street.trim()) {
      newErrors.street = 'La dirección es requerida';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'La ciudad es requerida';
    }

    if (!formData.department.trim()) {
      newErrors.department = 'El departamento es requerido';
    } else if (!isValidColombianDepartment(formData.department)) {
      newErrors.department = 'Departamento colombiano inválido';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    } else if (!validateColombianPhone(formData.phone)) {
      newErrors.phone = 'Formato de teléfono colombiano inválido (+57 XXX XXX XXXX)';
    }

    // Optional WhatsApp validation
    if (formData.whatsappNumber.trim() && !validateColombianPhone(formData.whatsappNumber)) {
      newErrors.whatsappNumber = 'Formato de WhatsApp colombiano inválido (+57 XXX XXX XXXX)';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Formato de correo inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleInputChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Auto-format phone numbers as user types
    if ((field === 'phone' || field === 'whatsappNumber') && value) {
      const formatted = formatColombianPhone(value);
      if (formatted && formatted !== value) {
        setFormData(prev => ({ ...prev, [field]: formatted }));
      }
    }
  }, [errors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const updatedBusiness: Business = {
        ...business,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        address: {
          street: formData.street.trim(),
          city: formData.city.trim(),
          department: formData.department,
          postalCode: formData.postalCode.trim() || undefined
        },
        phone: formData.phone,
        whatsappNumber: formData.whatsappNumber.trim() || undefined,
        email: formData.email.trim()
      };

      await onSave(updatedBusiness);
    } catch (error) {
      console.error('Error saving business profile:', error);
      setErrors({ submit: 'Error al guardar el perfil. Inténtalo de nuevo.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Editar Perfil del Negocio
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Actualiza la información de tu negocio para clientes colombianos
        </p>
      </div>

      {/* Business Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Nombre del Negocio *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Ej. Peluquería Bella Vista"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>

        <div className="md:col-span-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Descripción
          </label>
          <textarea
            id="description"
            rows={3}
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe tu negocio y servicios..."
          />
        </div>
      </div>

      {/* Address Information */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Dirección</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="street" className="block text-sm font-medium text-gray-700">
              Dirección *
            </label>
            <input
              type="text"
              id="street"
              value={formData.street}
              onChange={(e) => handleInputChange('street', e.target.value)}
              className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.street ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Ej. Carrera 15 #45-67"
            />
            {errors.street && <p className="mt-1 text-sm text-red-600">{errors.street}</p>}
          </div>

          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">
              Ciudad *
            </label>
            <input
              type="text"
              id="city"
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.city ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Ej. Medellín"
            />
            {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
          </div>

          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700">
              Departamento *
            </label>
            <select
              id="department"
              value={formData.department}
              onChange={(e) => handleInputChange('department', e.target.value)}
              className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.department ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Selecciona un departamento</option>
              {COLOMBIAN_DEPARTMENTS.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            {errors.department && <p className="mt-1 text-sm text-red-600">{errors.department}</p>}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
              Código Postal
            </label>
            <input
              type="text"
              id="postalCode"
              value={formData.postalCode}
              onChange={(e) => handleInputChange('postalCode', e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ej. 050010"
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Información de Contacto</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Teléfono *
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.phone ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="+57 301 234 5678"
            />
            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
          </div>

          <div>
            <label htmlFor="whatsappNumber" className="block text-sm font-medium text-gray-700">
              WhatsApp
            </label>
            <input
              type="tel"
              id="whatsappNumber"
              value={formData.whatsappNumber}
              onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
              className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.whatsappNumber ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="+57 301 234 5678"
            />
            {errors.whatsappNumber && <p className="mt-1 text-sm text-red-600">{errors.whatsappNumber}</p>}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Correo Electrónico *
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`mt-1 block w-full border rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="contacto@tunegocio.com.co"
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="border-t border-gray-200 pt-6 flex justify-end space-x-3">
        {errors.submit && (
          <p className="flex-1 text-sm text-red-600">{errors.submit}</p>
        )}
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </form>
  );
}