import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BusinessProfileEditForm } from './business-profile-edit-form';
import type { Business } from '@appointments-demo/types';

// Mock Colombian utilities
jest.mock('@appointments-demo/utils', () => ({
  formatColombianPhone: jest.fn((phone: string) => {
    if (phone === '3012345678') return '+57 301 234 5678';
    return phone;
  }),
  validateColombianPhone: jest.fn((phone: string) => {
    return phone === '+57 301 234 5678';
  }),
  isValidColombianDepartment: jest.fn((dept: string) => {
    return ['Antioquia', 'Bogotá D.C.', 'Valle del Cauca'].includes(dept);
  }),
  COLOMBIAN_DEPARTMENTS: [
    'Antioquia', 'Bogotá D.C.', 'Valle del Cauca', 'Cundinamarca'
  ]
}));

describe('BusinessProfileEditForm', () => {
  const mockBusiness: Business = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Peluquería Bella Vista',
    description: 'Servicios de belleza profesional',
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

  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form with current business data', () => {
    render(
      <BusinessProfileEditForm 
        business={mockBusiness} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );

    expect(screen.getByDisplayValue('Peluquería Bella Vista')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Servicios de belleza profesional')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Carrera 15 #45-67')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Medellín')).toBeInTheDocument();
    expect(screen.getByDisplayValue('contacto@bellavista.com.co')).toBeInTheDocument();
  });

  it('validates required fields in Spanish', async () => {
    render(
      <BusinessProfileEditForm 
        business={mockBusiness} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );

    // Clear required field
    const nameInput = screen.getByDisplayValue('Peluquería Bella Vista');
    await userEvent.clear(nameInput);

    const saveButton = screen.getByRole('button', { name: /guardar/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/el nombre del negocio es requerido/i)).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('validates Colombian phone number format', async () => {
    render(
      <BusinessProfileEditForm 
        business={mockBusiness} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );

    const phoneInput = screen.getByDisplayValue('+57 301 234 5678');
    await userEvent.clear(phoneInput);
    await userEvent.type(phoneInput, '123456789');

    const saveButton = screen.getByRole('button', { name: /guardar/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/formato de teléfono colombiano inválido/i)).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('validates Colombian department selection', async () => {
    render(
      <BusinessProfileEditForm 
        business={mockBusiness} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );

    const departmentSelect = screen.getByDisplayValue('Antioquia');
    await userEvent.selectOptions(departmentSelect, 'InvalidDepartment');

    const saveButton = screen.getByRole('button', { name: /guardar/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/departamento colombiano inválido/i)).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('formats phone number as user types', async () => {
    render(
      <BusinessProfileEditForm 
        business={mockBusiness} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );

    const phoneInput = screen.getByDisplayValue('+57 301 234 5678');
    await userEvent.clear(phoneInput);
    await userEvent.type(phoneInput, '3012345678');

    await waitFor(() => {
      expect(phoneInput).toHaveValue('+57 301 234 5678');
    });
  });

  it('shows loading state during save', async () => {
    const slowMockOnSave = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(
      <BusinessProfileEditForm 
        business={mockBusiness} 
        onSave={slowMockOnSave} 
        onCancel={mockOnCancel} 
      />
    );

    const saveButton = screen.getByRole('button', { name: /guardar/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/guardando/i)).toBeInTheDocument();
    });
  });

  it('calls onSave with updated business data', async () => {
    render(
      <BusinessProfileEditForm 
        business={mockBusiness} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );

    const nameInput = screen.getByDisplayValue('Peluquería Bella Vista');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Nuevo Nombre');

    const saveButton = screen.getByRole('button', { name: /guardar/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        ...mockBusiness,
        name: 'Nuevo Nombre'
      });
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <BusinessProfileEditForm 
        business={mockBusiness} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('includes Colombian department options in select', () => {
    render(
      <BusinessProfileEditForm 
        business={mockBusiness} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );

    const departmentSelect = screen.getByDisplayValue('Antioquia');
    expect(departmentSelect).toBeInTheDocument();

    // Check that Colombian departments are available
    expect(screen.getByRole('option', { name: 'Bogotá D.C.' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Valle del Cauca' })).toBeInTheDocument();
  });

  it('validates email format', async () => {
    render(
      <BusinessProfileEditForm 
        business={mockBusiness} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );

    const emailInput = screen.getByDisplayValue('contacto@bellavista.com.co');
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'invalid-email');

    const saveButton = screen.getByRole('button', { name: /guardar/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/formato de correo inválido/i)).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('handles WhatsApp number as optional field', async () => {
    const businessWithoutWhatsApp = { ...mockBusiness, whatsappNumber: undefined };
    
    render(
      <BusinessProfileEditForm 
        business={businessWithoutWhatsApp} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );

    const saveButton = screen.getByRole('button', { name: /guardar/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('uses Colombian business terminology and Spanish labels', () => {
    render(
      <BusinessProfileEditForm 
        business={mockBusiness} 
        onSave={mockOnSave} 
        onCancel={mockOnCancel} 
      />
    );

    expect(screen.getByLabelText(/nombre del negocio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dirección/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ciudad/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/departamento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/teléfono/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/whatsapp/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
  });
});