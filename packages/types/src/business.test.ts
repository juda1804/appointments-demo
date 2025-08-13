import { Business, BusinessSettings, BusinessHours } from './business';

describe('Business Types', () => {
  it('should define proper Business interface structure', () => {
    const mockBusiness: Business = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
      name: 'Test Business',
      description: 'A test business',
      address: {
        street: 'Carrera 7 # 32-16',
        city: 'Bogotá',
        department: 'Cundinamarca',
        postalCode: '110111'
      },
      phone: '+57 301 234 5678',
      whatsappNumber: '+57 301 234 5678',
      email: 'test@business.com',
      settings: {
        timezone: 'America/Bogota',
        currency: 'COP',
        businessHours: []
      }
    };

    expect(mockBusiness).toBeDefined();
    expect(mockBusiness.settings.timezone).toBe('America/Bogota');
    expect(mockBusiness.settings.currency).toBe('COP');
  });

  it('should define proper BusinessHours structure', () => {
    const businessHours: BusinessHours = {
      dayOfWeek: 1, // Monday
      openTime: '09:00',
      closeTime: '17:00',
      isOpen: true
    };

    expect(businessHours.dayOfWeek).toBe(1);
    expect(businessHours.openTime).toBe('09:00');
    expect(businessHours.isOpen).toBe(true);
  });
});