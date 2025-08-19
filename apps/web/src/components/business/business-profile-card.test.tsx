import { render, screen } from '@testing-library/react';
import { BusinessProfileCard } from './business-profile-card';
import type { Business } from '@appointments-demo/types';

// Mock Colombian utilities
jest.mock('@appointments-demo/utils', () => ({
  formatColombianPhone: jest.fn((phone: string) => phone),
  isValidColombianDepartment: jest.fn(() => true),
}));

describe('BusinessProfileCard', () => {
  const mockBusiness: Business = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Peluquería Bella Vista',
    description: 'Servicios de belleza y peluquería profesional',
    address: {
      street: 'Carrera 15 #45-67',
      city: 'Medellín',
      department: 'Antioquia',
      postalCode: '050010'
    },
    phone: '+57 301 234 5678',
    whatsappNumber: '+57 301 234 5678',
    email: 'contacto@bellavista.com.co',
    settings: {
      timezone: 'America/Bogota',
      currency: 'COP',
      businessHours: []
    },
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z')
  };

  it('renders business name and description', () => {
    render(<BusinessProfileCard business={mockBusiness} />);
    
    expect(screen.getByText('Peluquería Bella Vista')).toBeInTheDocument();
    expect(screen.getByText('Servicios de belleza y peluquería profesional')).toBeInTheDocument();
  });

  it('displays Colombian address information', () => {
    render(<BusinessProfileCard business={mockBusiness} />);
    
    expect(screen.getByText('Carrera 15 #45-67')).toBeInTheDocument();
    expect(screen.getByText('Medellín, Antioquia')).toBeInTheDocument();
    expect(screen.getByText('050010')).toBeInTheDocument();
  });

  it('shows Colombian phone numbers with correct formatting', () => {
    render(<BusinessProfileCard business={mockBusiness} />);
    
    expect(screen.getByText('+57 301 234 5678')).toBeInTheDocument();
  });

  it('displays business email', () => {
    render(<BusinessProfileCard business={mockBusiness} />);
    
    expect(screen.getByText('contacto@bellavista.com.co')).toBeInTheDocument();
  });

  it('shows Colombian timezone information', () => {
    render(<BusinessProfileCard business={mockBusiness} />);
    
    expect(screen.getByText('America/Bogota')).toBeInTheDocument();
  });

  it('handles business without description', () => {
    const businessWithoutDescription = { ...mockBusiness, description: undefined };
    render(<BusinessProfileCard business={businessWithoutDescription} />);
    
    expect(screen.getByText('Peluquería Bella Vista')).toBeInTheDocument();
    expect(screen.queryByText('Servicios de belleza y peluquería profesional')).not.toBeInTheDocument();
  });

  it('handles business without WhatsApp number', () => {
    const businessWithoutWhatsApp = { ...mockBusiness, whatsappNumber: undefined };
    render(<BusinessProfileCard business={businessWithoutWhatsApp} />);
    
    expect(screen.getByText('+57 301 234 5678')).toBeInTheDocument();
    expect(screen.queryByText('WhatsApp')).not.toBeInTheDocument();
  });

  it('shows edit button when onEdit prop is provided', () => {
    const mockOnEdit = jest.fn();
    render(<BusinessProfileCard business={mockBusiness} onEdit={mockOnEdit} />);
    
    expect(screen.getByRole('button', { name: /editar perfil/i })).toBeInTheDocument();
  });

  it('does not show edit button when onEdit prop is not provided', () => {
    render(<BusinessProfileCard business={mockBusiness} />);
    
    expect(screen.queryByRole('button', { name: /editar perfil/i })).not.toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const mockOnEdit = jest.fn();
    render(<BusinessProfileCard business={mockBusiness} onEdit={mockOnEdit} />);
    
    const editButton = screen.getByRole('button', { name: /editar perfil/i });
    editButton.click();
    
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it('uses Colombian business terminology in Spanish', () => {
    render(<BusinessProfileCard business={mockBusiness} />);
    
    // Check for Spanish labels
    expect(screen.getByText(/dirección/i)).toBeInTheDocument();
    expect(screen.getByText(/teléfono/i)).toBeInTheDocument();
    expect(screen.getByText(/correo/i)).toBeInTheDocument();
    expect(screen.getByText(/zona horaria/i)).toBeInTheDocument();
  });

  it('applies correct styling classes for mobile responsiveness', () => {
    const { container } = render(<BusinessProfileCard business={mockBusiness} />);
    
    expect(container.firstChild).toHaveClass('bg-white', 'shadow', 'rounded-lg');
  });
});