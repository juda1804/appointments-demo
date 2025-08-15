'use client';

import React, { useState } from 'react';
import { z } from 'zod';
import { ColombianAddressInput } from '../colombian/address-input';
import { ColombianPhoneInput } from '../colombian/phone-input';
import { BusinessRegistrationSchema, type BusinessRegistrationData } from '../forms/validation-schemas';

export interface ColombianBusinessFormProps {
  onSubmit: (data: BusinessRegistrationData) => void;
  isLoading?: boolean;
}

export function ColombianBusinessForm({ onSubmit, isLoading = false }: ColombianBusinessFormProps) {
  const [formData, setFormData] = useState<BusinessRegistrationData>({
    name: '',
    email: '',
    phone: '',
    whatsapp_number: '',
    address: {
      street: '',
      city: '',
      department: ''
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (name: string, value: unknown) => {
    try {
      if (name === 'address') {
        BusinessRegistrationSchema.shape.address.parse(value);
      } else if (name in BusinessRegistrationSchema.shape) {
        (BusinessRegistrationSchema.shape as Record<string, z.ZodTypeAny>)[name]?.parse(value);
      }
      
      // Clear error if validation passes
      const newErrors = { ...errors };
      delete newErrors[name];
      // Also clear nested address errors if validating address
      if (name === 'address') {
        delete newErrors['address.street'];
        delete newErrors['address.city'];
        delete newErrors['address.department'];
      }
      setErrors(newErrors);
      return true;
    } catch (error: unknown) {
      if (name === 'address' && error instanceof z.ZodError) {
        // Handle nested address validation errors
        const addressErrors: Record<string, string> = {};
        error.issues.forEach((err: z.ZodIssue) => {
          const field = `address.${err.path.join('.')}`;
          addressErrors[field] = err.message;
        });
        setErrors(prev => ({ ...prev, ...addressErrors }));
      } else if (error instanceof z.ZodError) {
        const errorMessage = error.issues[0]?.message || 'Error de validación';
        setErrors(prev => ({ ...prev, [name]: errorMessage }));
      } else {
        setErrors(prev => ({ ...prev, [name]: 'Error de validación' }));
      }
      return false;
    }
  };

  const handleInputChange = (name: string, value: string) => {
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
    
    if (touched[name]) {
      validateField(name, value);
    }
  };

  const handleAddressChange = (address: { street: string; city: string; department: string }) => {
    const newFormData = { ...formData, address };
    setFormData(newFormData);
    
    if (touched.address) {
      validateField('address', address);
    }
  };

  const handleBlur = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    
    if (name === 'address') {
      validateField(name, formData.address);
    } else {
      validateField(name, (formData as Record<string, unknown>)[name]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = BusinessRegistrationSchema.parse(formData);
      setErrors({});
      onSubmit(validatedData);
    } catch (error: unknown) {
      const formErrors: Record<string, string> = {};
      
      if (error instanceof z.ZodError) {
        error.issues.forEach((err: z.ZodIssue) => {
          const field = err.path.join('.');
          formErrors[field] = err.message;
        });
      }
      
      setErrors(formErrors);
      
      // Mark all fields as touched to show errors
      setTouched({
        name: true,
        email: true,
        phone: true,
        whatsapp_number: true,
        address: true
      });
    }
  };

  const getFieldError = (field: string) => {
    return errors[field] || '';
  };

  const getFieldId = (field: string) => `business-${field}`;
  const getErrorId = (field: string) => `business-${field}-error`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="space-y-4">
        {/* Business Name */}
        <div>
          <label 
            htmlFor={getFieldId('name')} 
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Nombre del Negocio *
          </label>
          <input
            id={getFieldId('name')}
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            placeholder="Nombre de tu negocio"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              getFieldError('name') ? 'border-red-500' : 'border-gray-300'
            }`}
            aria-describedby={getFieldError('name') ? getErrorId('name') : undefined}
            disabled={isLoading}
          />
          {getFieldError('name') && (
            <p id={getErrorId('name')} className="mt-1 text-sm text-red-600" role="alert">
              {getFieldError('name')}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label 
            htmlFor={getFieldId('email')} 
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email *
          </label>
          <input
            id={getFieldId('email')}
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            placeholder="tu@email.com"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              getFieldError('email') ? 'border-red-500' : 'border-gray-300'
            }`}
            aria-describedby={getFieldError('email') ? getErrorId('email') : undefined}
            disabled={isLoading}
          />
          {getFieldError('email') && (
            <p id={getErrorId('email')} className="mt-1 text-sm text-red-600" role="alert">
              {getFieldError('email')}
            </p>
          )}
        </div>

        {/* Business Phone */}
        <div>
          <label 
            htmlFor={getFieldId('phone')} 
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Teléfono del Negocio *
          </label>
          <ColombianPhoneInput
            id={getFieldId('phone')}
            value={formData.phone}
            onChange={(value) => handleInputChange('phone', value)}
            onBlur={() => handleBlur('phone')}
            error={getFieldError('phone')}
            disabled={isLoading}
            aria-describedby={getFieldError('phone') ? getErrorId('phone') : undefined}
          />
          {getFieldError('phone') && (
            <p id={getErrorId('phone')} className="mt-1 text-sm text-red-600" role="alert">
              {getFieldError('phone')}
            </p>
          )}
        </div>

        {/* WhatsApp Number */}
        <div>
          <label 
            htmlFor={getFieldId('whatsapp')} 
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            WhatsApp *
          </label>
          <ColombianPhoneInput
            id={getFieldId('whatsapp')}
            value={formData.whatsapp_number}
            onChange={(value) => handleInputChange('whatsapp_number', value)}
            onBlur={() => handleBlur('whatsapp_number')}
            error={getFieldError('whatsapp_number')}
            disabled={isLoading}
            aria-describedby={getFieldError('whatsapp_number') ? getErrorId('whatsapp_number') : undefined}
          />
          {getFieldError('whatsapp_number') && (
            <p id={getErrorId('whatsapp_number')} className="mt-1 text-sm text-red-600" role="alert">
              {getFieldError('whatsapp_number')}
            </p>
          )}
        </div>

        {/* Colombian Address */}
        <div>
          <ColombianAddressInput
            value={formData.address}
            onChange={handleAddressChange}
            onBlur={() => handleBlur('address')}
            errors={{
              street: getFieldError('address.street'),
              city: getFieldError('address.city'),
              department: getFieldError('address.department')
            }}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
          isLoading ? 'bg-gray-400' : ''
        }`}
      >
        {isLoading ? 'Registrando...' : 'Registrar Negocio'}
      </button>
    </form>
  );
}