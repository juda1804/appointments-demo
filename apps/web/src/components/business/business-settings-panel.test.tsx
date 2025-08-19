import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BusinessSettingsPanel } from './business-settings-panel';
import type { BusinessSettings } from '@appointments-demo/types';

describe('BusinessSettingsPanel', () => {
  const mockSettings: BusinessSettings = {
    timezone: 'America/Bogota',
    currency: 'COP',
    businessHours: [
      { dayOfWeek: 1, openTime: '08:00', closeTime: '18:00', isOpen: true },
      { dayOfWeek: 2, openTime: '08:00', closeTime: '18:00', isOpen: true },
      { dayOfWeek: 3, openTime: '08:00', closeTime: '18:00', isOpen: true },
      { dayOfWeek: 4, openTime: '08:00', closeTime: '18:00', isOpen: true },
      { dayOfWeek: 5, openTime: '08:00', closeTime: '18:00', isOpen: true },
      { dayOfWeek: 6, openTime: '08:00', closeTime: '14:00', isOpen: true },
      { dayOfWeek: 0, openTime: '10:00', closeTime: '14:00', isOpen: false }
    ]
  };

  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders current settings values', () => {
    render(<BusinessSettingsPanel settings={mockSettings} onSave={mockOnSave} />);

    expect(screen.getByDisplayValue('America/Bogota')).toBeInTheDocument();
    expect(screen.getByDisplayValue('COP')).toBeInTheDocument();
  });

  it('shows timezone selection with Colombian default', () => {
    render(<BusinessSettingsPanel settings={mockSettings} onSave={mockOnSave} />);

    const timezoneSelect = screen.getByDisplayValue('America/Bogota');
    expect(timezoneSelect).toBeInTheDocument();
    
    // Should include other timezone options
    expect(screen.getByRole('option', { name: /america\/bogota/i })).toBeInTheDocument();
  });

  it('shows currency fixed as Colombian Peso', () => {
    render(<BusinessSettingsPanel settings={mockSettings} onSave={mockOnSave} />);

    const currencySelect = screen.getByDisplayValue('COP');
    expect(currencySelect).toBeInTheDocument();
    
    // Should show COP as selected and potentially disabled for Colombian system
    expect(screen.getByRole('option', { name: /cop/i })).toBeInTheDocument();
  });

  it('displays business hours for all days of the week', () => {
    render(<BusinessSettingsPanel settings={mockSettings} onSave={mockOnSave} />);

    // Check for Spanish day names
    expect(screen.getByText(/lunes/i)).toBeInTheDocument();
    expect(screen.getByText(/martes/i)).toBeInTheDocument();
    expect(screen.getByText(/miércoles/i)).toBeInTheDocument();
    expect(screen.getByText(/jueves/i)).toBeInTheDocument();
    expect(screen.getByText(/viernes/i)).toBeInTheDocument();
    expect(screen.getByText(/sábado/i)).toBeInTheDocument();
    expect(screen.getByText(/domingo/i)).toBeInTheDocument();
  });

  it('shows business hours with correct time format', () => {
    render(<BusinessSettingsPanel settings={mockSettings} onSave={mockOnSave} />);

    // Check for 24-hour format times
    expect(screen.getByDisplayValue('08:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('18:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('14:00')).toBeInTheDocument();
  });

  it('allows toggling business hours on/off for each day', async () => {
    render(<BusinessSettingsPanel settings={mockSettings} onSave={mockOnSave} />);

    // Find the toggle for Sunday (should be off initially)
    const sundayToggle = screen.getByRole('checkbox', { name: /domingo/i });
    expect(sundayToggle).not.toBeChecked();

    // Toggle Sunday on
    await userEvent.click(sundayToggle);
    expect(sundayToggle).toBeChecked();
  });

  it('validates time format (HH:MM)', async () => {
    render(<BusinessSettingsPanel settings={mockSettings} onSave={mockOnSave} />);

    // Find a time input and enter invalid format
    const timeInputs = screen.getAllByDisplayValue('08:00');
    const firstTimeInput = timeInputs[0];
    
    await userEvent.clear(firstTimeInput);
    await userEvent.type(firstTimeInput, '25:00'); // Invalid hour

    const saveButton = screen.getByRole('button', { name: /guardar/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/formato de hora inválido/i)).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('validates that open time is before close time', async () => {
    render(<BusinessSettingsPanel settings={mockSettings} onSave={mockOnSave} />);

    // Set close time before open time
    const timeInputs = screen.getAllByDisplayValue('18:00');
    const closeTimeInput = timeInputs[0];
    
    await userEvent.clear(closeTimeInput);
    await userEvent.type(closeTimeInput, '07:00'); // Before 08:00 open time

    const saveButton = screen.getByRole('button', { name: /guardar/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/la hora de cierre debe ser posterior a la de apertura/i)).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('calls onSave with updated settings', async () => {
    render(<BusinessSettingsPanel settings={mockSettings} onSave={mockOnSave} />);

    // Change timezone
    const timezoneSelect = screen.getByDisplayValue('America/Bogota');
    await userEvent.selectOptions(timezoneSelect, 'America/New_York');

    const saveButton = screen.getByRole('button', { name: /guardar/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        ...mockSettings,
        timezone: 'America/New_York'
      });
    });
  });

  it('shows loading state during save', async () => {
    const slowMockOnSave = jest.fn(() => new Promise<void>(resolve => setTimeout(resolve, 100)));
    
    render(<BusinessSettingsPanel settings={mockSettings} onSave={slowMockOnSave} />);

    const saveButton = screen.getByRole('button', { name: /guardar/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/guardando/i)).toBeInTheDocument();
    });
  });

  it('uses Spanish terminology for Colombian business context', () => {
    render(<BusinessSettingsPanel settings={mockSettings} onSave={mockOnSave} />);

    expect(screen.getByText(/zona horaria/i)).toBeInTheDocument();
    expect(screen.getByText(/moneda/i)).toBeInTheDocument();
    expect(screen.getByText(/horarios de atención/i)).toBeInTheDocument();
    expect(screen.getByText(/hora de apertura/i)).toBeInTheDocument();
    expect(screen.getByText(/hora de cierre/i)).toBeInTheDocument();
  });

  it('handles settings without business hours', () => {
    const settingsWithoutHours = {
      ...mockSettings,
      businessHours: []
    };

    render(<BusinessSettingsPanel settings={settingsWithoutHours} onSave={mockOnSave} />);

    // Should still show day selector with default closed state
    expect(screen.getByText(/lunes/i)).toBeInTheDocument();
    expect(screen.getByText(/domingo/i)).toBeInTheDocument();
  });

  it('provides helpful information about Colombian timezone', () => {
    render(<BusinessSettingsPanel settings={mockSettings} onSave={mockOnSave} />);

    // Should have some context about Colombian timezone
    expect(screen.getByText(/recomendado: bogotá para negocios colombianos/i)).toBeInTheDocument();
  });

  it('shows Colombian peso currency information', () => {
    render(<BusinessSettingsPanel settings={mockSettings} onSave={mockOnSave} />);

    // Should show peso context
    expect(screen.getByText(/peso colombiano para tu negocio local/i)).toBeInTheDocument();
  });

  it('applies correct responsive styling', () => {
    const { container } = render(<BusinessSettingsPanel settings={mockSettings} onSave={mockOnSave} />);

    expect(container.firstChild).toHaveClass('bg-white', 'shadow', 'rounded-lg');
  });
});