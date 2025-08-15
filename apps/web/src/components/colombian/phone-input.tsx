'use client';

import React from 'react';

export interface ColombianPhoneInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  'aria-describedby'?: string;
}

export function ColombianPhoneInput({ 
  id,
  value, 
  onChange, 
  onBlur,
  error,
  disabled = false,
  placeholder = 'Ej: +57 300 123 4567',
  'aria-describedby': ariaDescribedBy
}: ColombianPhoneInputProps) {

  const formatColombianPhone = (input: string): string => {
    // Remove all non-digit characters
    const digitsOnly = input.replace(/\D/g, '');
    
    // If starts with 57, add the + prefix
    if (digitsOnly.startsWith('57') && digitsOnly.length > 2) {
      const numberPart = digitsOnly.substring(2);
      return formatNumberPart(`+57${numberPart}`);
    }
    
    // If already starts with +57, format the rest
    if (input.startsWith('+57')) {
      return formatNumberPart(input);
    }
    
    // If it's just digits and 10 digits long, assume it's Colombian
    if (digitsOnly.length === 10) {
      return formatNumberPart(`+57${digitsOnly}`);
    }
    
    // If digits start and we have some digits, format progressively
    if (digitsOnly.length > 0) {
      if (digitsOnly.length <= 2) {
        return digitsOnly.startsWith('57') ? `+57` : `+57${digitsOnly}`;
      } else {
        return formatNumberPart(`+57${digitsOnly}`);
      }
    }
    
    return input;
  };

  const formatNumberPart = (phone: string): string => {
    // Extract just the number part after +57
    const match = phone.match(/^\+57(.*)$/);
    if (!match) return phone;
    
    const digits = match[1].replace(/\D/g, '');
    
    // Format as +57 XXX XXX XXXX
    if (digits.length >= 10) {
      return `+57 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
    } else if (digits.length >= 6) {
      return `+57 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    } else if (digits.length >= 3) {
      return `+57 ${digits.slice(0, 3)} ${digits.slice(3)}`;
    } else if (digits.length > 0) {
      return `+57 ${digits}`;
    } else {
      return '+57 ';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow backspacing to empty
    if (inputValue === '') {
      onChange('');
      return;
    }
    
    // Don't allow deletion of +57 prefix
    if (inputValue.length < 4 && !inputValue.startsWith('+57')) {
      return;
    }
    
    const formatted = formatColombianPhone(inputValue);
    onChange(formatted);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent deleting the +57 prefix
    if ((e.key === 'Backspace' || e.key === 'Delete') && value.length <= 4) {
      e.preventDefault();
    }
  };

  const handleFocus = () => {
    // If empty, start with +57 prefix
    if (value === '') {
      onChange('+57 ');
    }
  };

  return (
    <input
      id={id}
      type="tel"
      value={value}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={onBlur}
      placeholder={placeholder}
      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
        error ? 'border-red-500' : 'border-gray-300'
      }`}
      aria-describedby={ariaDescribedBy}
      disabled={disabled}
      maxLength={17} // +57 XXX XXX XXXX = 17 characters
    />
  );
}