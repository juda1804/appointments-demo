'use client';

import React from 'react';

// All 32 Colombian departments according to administrative divisions
const COLOMBIAN_DEPARTMENTS = [
  'Amazonas',
  'Antioquia',
  'Arauca',
  'Atlántico',
  'Bolívar',
  'Boyacá',
  'Caldas',
  'Caquetá',
  'Casanare',
  'Cauca',
  'Cesar',
  'Chocó',
  'Córdoba',
  'Cundinamarca',
  'Guainía',
  'Guaviare',
  'Huila',
  'La Guajira',
  'Magdalena',
  'Meta',
  'Nariño',
  'Norte de Santander',
  'Putumayo',
  'Quindío',
  'Risaralda',
  'San Andrés y Providencia',
  'Santander',
  'Sucre',
  'Tolima',
  'Valle del Cauca',
  'Vaupés',
  'Vichada'
];

export interface ColombianAddress {
  street: string;
  city: string;
  department: string;
}

export interface ColombianAddressInputProps {
  value: ColombianAddress;
  onChange: (address: ColombianAddress) => void;
  onBlur?: () => void;
  errors?: {
    street?: string;
    city?: string;
    department?: string;
  };
  disabled?: boolean;
}

export function ColombianAddressInput({ 
  value, 
  onChange, 
  onBlur,
  errors = {},
  disabled = false 
}: ColombianAddressInputProps) {
  
  const handleInputChange = (field: keyof ColombianAddress, inputValue: string) => {
    onChange({
      ...value,
      [field]: inputValue
    });
  };

  const getFieldId = (field: string) => `address-${field}`;
  const getErrorId = (field: string) => `address-${field}-error`;

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="block text-sm font-medium text-gray-700 mb-3">
          Dirección del Negocio *
        </legend>
        
        {/* Street Address */}
        <div className="mb-4">
          <label 
            htmlFor={getFieldId('street')} 
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Dirección *
          </label>
          <input
            id={getFieldId('street')}
            type="text"
            value={value.street}
            onChange={(e) => handleInputChange('street', e.target.value)}
            onBlur={onBlur}
            placeholder="Calle 123 #45-67"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.street ? 'border-red-500' : 'border-gray-300'
            }`}
            aria-describedby={errors.street ? getErrorId('street') : undefined}
            disabled={disabled}
          />
          {errors.street && (
            <p id={getErrorId('street')} className="mt-1 text-sm text-red-600" role="alert">
              {errors.street}
            </p>
          )}
        </div>

        {/* City */}
        <div className="mb-4">
          <label 
            htmlFor={getFieldId('city')} 
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Ciudad *
          </label>
          <input
            id={getFieldId('city')}
            type="text"
            value={value.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            onBlur={onBlur}
            placeholder="Bogotá"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.city ? 'border-red-500' : 'border-gray-300'
            }`}
            aria-describedby={errors.city ? getErrorId('city') : undefined}
            disabled={disabled}
          />
          {errors.city && (
            <p id={getErrorId('city')} className="mt-1 text-sm text-red-600" role="alert">
              {errors.city}
            </p>
          )}
        </div>

        {/* Department */}
        <div>
          <label 
            htmlFor={getFieldId('department')} 
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Departamento *
          </label>
          <select
            id={getFieldId('department')}
            value={value.department}
            onChange={(e) => handleInputChange('department', e.target.value)}
            onBlur={onBlur}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.department ? 'border-red-500' : 'border-gray-300'
            }`}
            aria-describedby={errors.department ? getErrorId('department') : undefined}
            disabled={disabled}
          >
            <option value="">Seleccione un departamento</option>
            {COLOMBIAN_DEPARTMENTS.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
          {errors.department && (
            <p id={getErrorId('department')} className="mt-1 text-sm text-red-600" role="alert">
              {errors.department}
            </p>
          )}
        </div>
      </fieldset>
    </div>
  );
}