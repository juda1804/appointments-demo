import React from 'react';
import { formatPesoCOP, formatPhoneForDisplay } from '@appointments-demo/utils/src/colombian';

export interface PesoDisplayProps extends React.HTMLAttributes<HTMLSpanElement> {
  amount: number;
  large?: boolean;
}

export const PesoDisplay: React.FC<PesoDisplayProps> = ({ 
  amount, 
  large = false, 
  className = '',
  ...props 
}) => {
  const baseClasses = large ? 'peso-amount-large' : 'peso-amount';
  const combinedClassName = `${baseClasses} ${className}`.trim();

  return (
    <span className={combinedClassName} {...props}>
      {formatPesoCOP(amount)}
    </span>
  );
};

export interface PhoneDisplayProps extends React.HTMLAttributes<HTMLSpanElement> {
  phone: string;
}

export const PhoneDisplay: React.FC<PhoneDisplayProps> = ({ 
  phone, 
  className = '',
  ...props 
}) => {
  const combinedClassName = `phone-number ${className}`.trim();
  const formattedPhone = formatPhoneForDisplay(phone) || phone;

  return (
    <span className={combinedClassName} {...props}>
      {formattedPhone}
    </span>
  );
};

export interface BusinessHoursProps extends React.HTMLAttributes<HTMLSpanElement> {
  isOpen: boolean;
  children?: React.ReactNode;
}

export const BusinessHours: React.FC<BusinessHoursProps> = ({ 
  isOpen, 
  children,
  className = '',
  ...props 
}) => {
  const statusClasses = isOpen ? 'business-hours-open' : 'business-hours-closed';
  const combinedClassName = `${statusClasses} ${className}`.trim();

  return (
    <span className={combinedClassName} {...props}>
      {children || (isOpen ? 'Abierto' : 'Cerrado')}
    </span>
  );
};