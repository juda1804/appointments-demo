import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ 
  hover = false, 
  children, 
  className = '',
  ...props 
}) => {
  const baseClasses = hover ? 'card-hover' : 'card';
  const combinedClassName = `${baseClasses} ${className}`.trim();

  return (
    <div className={combinedClassName} {...props}>
      {children}
    </div>
  );
};