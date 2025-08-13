/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PesoDisplay, PhoneDisplay, BusinessHours } from './ColombianDisplay';

// Mock the Colombian utilities
jest.mock('@appointments-demo/utils', () => ({
  formatPesoCOP: (amount: number) => `$${amount.toLocaleString('es-CO')}`,
  formatColombianPhone: (phone: string) => `+57 ${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`,
}));

describe('ColombianDisplay Components', () => {
  describe('PesoDisplay', () => {
    it('renders peso amount with Colombian formatting', () => {
      render(<PesoDisplay amount={25000} />);
      expect(screen.getByText('$25.000')).toBeInTheDocument();
    });

    it('applies large styling when large prop is true', () => {
      render(<PesoDisplay amount={50000} large />);
      const display = screen.getByText('$50.000');
      
      expect(display).toHaveClass('peso-amount-large');
      expect(display).toHaveClass('text-peso');
    });

    it('applies custom className', () => {
      render(<PesoDisplay amount={10000} className="custom-peso" />);
      expect(screen.getByText('$10.000')).toHaveClass('custom-peso');
    });
  });

  describe('PhoneDisplay', () => {
    it('renders Colombian phone number with proper formatting', () => {
      render(<PhoneDisplay phone="3001234567" />);
      expect(screen.getByText('+57 300 123 4567')).toBeInTheDocument();
    });

    it('applies phone number styling classes', () => {
      render(<PhoneDisplay phone="3109876543" />);
      const display = screen.getByText('+57 310 987 6543');
      
      expect(display).toHaveClass('phone-number');
      expect(display).toHaveClass('text-phone');
    });

    it('applies custom className', () => {
      render(<PhoneDisplay phone="3201112233" className="custom-phone" />);
      expect(screen.getByText('+57 320 111 2233')).toHaveClass('custom-phone');
    });
  });

  describe('BusinessHours', () => {
    it('displays "Abierto" when isOpen is true', () => {
      render(<BusinessHours isOpen={true} />);
      const hours = screen.getByText('Abierto');
      
      expect(hours).toBeInTheDocument();
      expect(hours).toHaveClass('business-hours-open');
    });

    it('displays "Cerrado" when isOpen is false', () => {
      render(<BusinessHours isOpen={false} />);
      const hours = screen.getByText('Cerrado');
      
      expect(hours).toBeInTheDocument();
      expect(hours).toHaveClass('business-hours-closed');
    });

    it('displays custom children when provided', () => {
      render(<BusinessHours isOpen={true}>Abierto hasta las 6 PM</BusinessHours>);
      expect(screen.getByText('Abierto hasta las 6 PM')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<BusinessHours isOpen={true} className="custom-hours" />);
      expect(screen.getByText('Abierto')).toHaveClass('custom-hours');
    });
  });
});