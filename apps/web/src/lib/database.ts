import { createServerSupabaseClient } from './supabase';
import type { Business } from '@appointments-demo/types';

// Database utility functions for businesses
export const businessDb = {
  // Set current business context for RLS
  setBusinessContext: async (businessId: string) => {
    const supabase = createServerSupabaseClient();
    
    const { error } = await supabase.rpc('set_current_business_id', {
      business_uuid: businessId
    });
    
    if (error) {
      throw new Error(`Failed to set business context: ${error.message}`);
    }
  },

  // Get current business from context
  getCurrentBusiness: async (): Promise<Business | null> => {
    const supabase = createServerSupabaseClient();
    
    const { data: businessId, error: contextError } = await supabase.rpc('get_current_business_id');
    
    if (contextError || !businessId) {
      return null;
    }

    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (error) {
      throw new Error(`Failed to get current business: ${error.message}`);
    }

    return data;
  },

  // Create a new business
  create: async (businessData: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>) => {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('businesses')
      .insert([{
        name: businessData.name,
        description: businessData.description,
        street: businessData.address.street,
        city: businessData.address.city,
        department: businessData.address.department,
        postal_code: businessData.address.postalCode,
        phone: businessData.phone,
        whatsapp_number: businessData.whatsappNumber,
        email: businessData.email,
        settings: businessData.settings
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create business: ${error.message}`);
    }

    return data;
  },

  // Get business by ID (respects RLS)
  getById: async (id: string): Promise<Business | null> => {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No matching row found
      }
      throw new Error(`Failed to get business: ${error.message}`);
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      address: {
        street: data.street,
        city: data.city,
        department: data.department,
        postalCode: data.postal_code
      },
      phone: data.phone,
      whatsappNumber: data.whatsapp_number,
      email: data.email,
      settings: data.settings,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  },

  // Update business (respects RLS)
  update: async (id: string, updates: Partial<Omit<Business, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const supabase = createServerSupabaseClient();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    
    if (updates.name) updateData.name = updates.name;
    if (updates.description) updateData.description = updates.description;
    if (updates.address) {
      if (updates.address.street) updateData.street = updates.address.street;
      if (updates.address.city) updateData.city = updates.address.city;
      if (updates.address.department) updateData.department = updates.address.department;
      if (updates.address.postalCode) updateData.postal_code = updates.address.postalCode;
    }
    if (updates.phone) updateData.phone = updates.phone;
    if (updates.whatsappNumber) updateData.whatsapp_number = updates.whatsappNumber;
    if (updates.email) updateData.email = updates.email;
    if (updates.settings) updateData.settings = updates.settings;

    const { data, error } = await supabase
      .from('businesses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update business: ${error.message}`);
    }

    return data;
  },

  // Delete business (respects RLS)
  delete: async (id: string) => {
    const supabase = createServerSupabaseClient();
    
    const { error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete business: ${error.message}`);
    }
  },

  // Test RLS isolation
  testMultiTenantIsolation: async () => {
    const supabase = createServerSupabaseClient();
    
    // Try to access all businesses without setting context (should return empty)
    const { data: allBusinesses, error: allError } = await supabase
      .from('businesses')
      .select('id, name');

    if (allError) {
      throw new Error(`Failed to test isolation: ${allError.message}`);
    }

    return {
      businessesWithoutContext: allBusinesses,
      message: allBusinesses.length === 0 
        ? 'RLS working correctly - no businesses returned without context'
        : `Warning: RLS may not be working - ${allBusinesses.length} businesses returned without context`
    };
  },

  // Check if email is already registered
  isEmailTaken: async (email: string): Promise<boolean> => {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('businesses')
      .select('id')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return false; // No matching email found
      }
      throw new Error(`Failed to check email availability: ${error.message}`);
    }

    return data !== null; // Email is taken if data exists
  },

  // Get businesses by Colombian department
  getByDepartment: async (department: string): Promise<Business[]> => {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('department', department);

    if (error) {
      throw new Error(`Failed to get businesses by department: ${error.message}`);
    }

    return data?.map(business => ({
      id: business.id,
      name: business.name,
      description: business.description,
      address: {
        street: business.street,
        city: business.city,
        department: business.department,
        postalCode: business.postal_code
      },
      phone: business.phone,
      whatsappNumber: business.whatsapp_number,
      email: business.email,
      settings: business.settings,
      createdAt: new Date(business.created_at),
      updatedAt: new Date(business.updated_at)
    })) || [];
  },

  // Search businesses by name or city (with RLS respect)
  search: async (query: string, limit: number = 10): Promise<Business[]> => {
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .or(`name.ilike.%${query}%,city.ilike.%${query}%`)
      .limit(limit);

    if (error) {
      throw new Error(`Failed to search businesses: ${error.message}`);
    }

    return data?.map(business => ({
      id: business.id,
      name: business.name,
      description: business.description,
      address: {
        street: business.street,
        city: business.city,
        department: business.department,
        postalCode: business.postal_code
      },
      phone: business.phone,
      whatsappNumber: business.whatsapp_number,
      email: business.email,
      settings: business.settings,
      createdAt: new Date(business.created_at),
      updatedAt: new Date(business.updated_at)
    })) || [];
  },

  // Update business settings only
  updateSettings: async (id: string, settings: Partial<Business['settings']>) => {
    const supabase = createServerSupabaseClient();
    
    // Get current settings first
    const { data: currentBusiness, error: getCurrentError } = await supabase
      .from('businesses')
      .select('settings')
      .eq('id', id)
      .single();

    if (getCurrentError) {
      if (getCurrentError.code === 'PGRST116') {
        throw new Error('Business not found or access denied');
      }
      throw new Error(`Failed to get current settings: ${getCurrentError.message}`);
    }

    // Merge with existing settings
    const updatedSettings = {
      ...currentBusiness.settings,
      ...settings
    };

    const { data, error } = await supabase
      .from('businesses')
      .update({ settings: updatedSettings })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update business settings: ${error.message}`);
    }

    return data;
  },

  // Colombian business validation utilities
  validateColombianPhone: (phone: string): boolean => {
    const colombianPhoneRegex = /^\+57 [0-9]{3} [0-9]{3} [0-9]{4}$/;
    return colombianPhoneRegex.test(phone);
  },

  validateColombianDepartment: (department: string): boolean => {
    const validDepartments = [
      'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá',
      'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba',
      'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena',
      'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda',
      'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca',
      'Vaupés', 'Vichada', 'Bogotá D.C.'
    ];
    return validDepartments.includes(department);
  },

  // Create Colombian business with default settings
  createColombianBusiness: async (businessData: Omit<Business, 'id' | 'createdAt' | 'updatedAt' | 'settings'> & { settings?: Partial<Business['settings']> }) => {
    const colombianDefaults = {
      timezone: 'America/Bogota',
      currency: 'COP',
      businessHours: [
        { dayOfWeek: 1, openTime: "08:00", closeTime: "18:00", isOpen: true },
        { dayOfWeek: 2, openTime: "08:00", closeTime: "18:00", isOpen: true },
        { dayOfWeek: 3, openTime: "08:00", closeTime: "18:00", isOpen: true },
        { dayOfWeek: 4, openTime: "08:00", closeTime: "18:00", isOpen: true },
        { dayOfWeek: 5, openTime: "08:00", closeTime: "18:00", isOpen: true },
        { dayOfWeek: 6, openTime: "08:00", closeTime: "14:00", isOpen: true },
        { dayOfWeek: 0, openTime: "10:00", closeTime: "14:00", isOpen: false }
      ]
    };

    const fullBusinessData = {
      ...businessData,
      settings: {
        ...colombianDefaults,
        ...businessData.settings
      }
    };

    return businessDb.create(fullBusinessData);
  },

  // Bulk operations for business management
  bulkUpdateSettings: async (updates: Array<{ id: string; settings: Partial<Business['settings']> }>) => {
    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const result = await businessDb.updateSettings(update.id, update.settings);
        results.push({ id: update.id, success: true, data: result });
      } catch (error) {
        errors.push({ id: update.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return { results, errors };
  },

  // Business statistics and health check
  getBusinessHealth: async (businessId: string) => {
    try {
      // Set context to the business we want to check
      await businessDb.setBusinessContext(businessId);
      
      // Get business data
      const business = await businessDb.getById(businessId);
      
      if (!business) {
        throw new Error('Business not found or access denied');
      }

      // Check various health indicators
      const healthMetrics = {
        businessId: business.id,
        name: business.name,
        hasValidPhone: businessDb.validateColombianPhone(business.phone),
        hasValidWhatsApp: business.whatsappNumber ? businessDb.validateColombianPhone(business.whatsappNumber) : true,
        hasValidDepartment: businessDb.validateColombianDepartment(business.address.department),
        hasCompleteAddress: !!(business.address.street && business.address.city && business.address.department),
        hasBusinessHours: !!(business.settings.businessHours && business.settings.businessHours.length > 0),
        isColombianTimezone: business.settings.timezone === 'America/Bogota',
        isColombianCurrency: business.settings.currency === 'COP',
        lastUpdated: business.updatedAt,
        overallHealth: 'good' as 'good' | 'warning' | 'critical'
      };

      // Calculate overall health
      const issues = [
        !healthMetrics.hasValidPhone,
        !healthMetrics.hasValidWhatsApp,
        !healthMetrics.hasValidDepartment,
        !healthMetrics.hasCompleteAddress,
        !healthMetrics.hasBusinessHours,
        !healthMetrics.isColombianTimezone,
        !healthMetrics.isColombianCurrency
      ].filter(Boolean).length;

      if (issues >= 3) {
        healthMetrics.overallHealth = 'critical';
      } else if (issues >= 1) {
        healthMetrics.overallHealth = 'warning';
      }

      return healthMetrics;
    } catch (error) {
      throw new Error(`Failed to get business health: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};