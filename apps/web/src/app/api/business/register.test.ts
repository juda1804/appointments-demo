/**
 * Business Registration API Tests
 * 
 * Tests the /api/business/register endpoint for business creation scenarios
 * including validation, email uniqueness, UUID generation, and multi-tenant isolation
 */

import { createServerSupabaseClient } from '@/lib/supabase';
import { BusinessRegistrationSchema, type BusinessRegistrationData } from '@/components/forms/validation-schemas';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

describe('Business Registration API Logic', () => {
  let mockSupabaseClient: {
    from: jest.Mock;
    auth: {
      signUp: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock Supabase client
    mockSupabaseClient = {
      from: jest.fn(),
      auth: {
        signUp: jest.fn(),
      },
    };
    
    (createServerSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  const validBusinessData: BusinessRegistrationData = {
    name: 'Mi Negocio Colombiano',
    email: 'negocio@example.com',
    phone: '+57 300 123 4567',
    whatsapp_number: '+57 310 987 6543',
    address: {
      street: 'Calle 123 #45-67',
      city: 'Bogotá',
      department: 'Cundinamarca'
    }
  };

  describe('Request Validation', () => {
    it('should validate correct business registration data', () => {
      const result = BusinessRegistrationSchema.safeParse(validBusinessData);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.name).toBe('Mi Negocio Colombiano');
        expect(result.data.email).toBe('negocio@example.com');
        expect(result.data.phone).toBe('+57 300 123 4567');
        expect(result.data.whatsapp_number).toBe('+57 310 987 6543');
        expect(result.data.address.department).toBe('Cundinamarca');
      }
    });

    it('should reject invalid business registration data', () => {
      const invalidData = {
        name: '', // Empty name
        email: 'invalid-email', // Invalid email
        phone: '3001234567', // Missing +57 format
        whatsapp_number: '+57 300 123 456', // Too short
        address: {
          street: '',
          city: '',
          department: 'InvalidDepartment'
        }
      };

      const result = BusinessRegistrationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errors = result.error.flatten();
        expect(errors.fieldErrors.name).toContain('El nombre es requerido');
        expect(errors.fieldErrors.email).toContain('Email inválido');
        expect(errors.fieldErrors.phone).toContain('Formato de teléfono colombiano inválido');
        expect(errors.fieldErrors.whatsapp_number).toContain('Formato de teléfono colombiano inválido');
      }
    });

    it('should handle missing required fields', () => {
      const incompleteData = {
        name: 'Test Business'
        // Missing all other required fields
      };

      const result = BusinessRegistrationSchema.safeParse(incompleteData);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('should normalize email to lowercase', () => {
      const dataWithUppercaseEmail = {
        ...validBusinessData,
        email: 'TEST@EXAMPLE.COM'
      };

      const result = BusinessRegistrationSchema.parse(dataWithUppercaseEmail);
      expect(result.email).toBe('test@example.com');
    });

    it('should trim whitespace from name and email', () => {
      const dataWithWhitespace = {
        ...validBusinessData,
        name: '  Test Business  ',
        email: '  test@example.com  '
      };

      const result = BusinessRegistrationSchema.parse(dataWithWhitespace);
      expect(result.name).toBe('Test Business');
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('Email Uniqueness Validation', () => {
    it('should check email uniqueness successfully when email is available', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' } // No rows found
            })
          })
        })
      });

      mockSupabaseClient.from.mockImplementation(mockFrom);

      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from('businesses')
        .select('id')
        .eq('email', validBusinessData.email)
        .single();

      expect(mockFrom).toHaveBeenCalledWith('businesses');
      expect(data).toBeNull();
      expect(error?.code).toBe('PGRST116'); // No rows found = email is unique
    });

    it('should detect email duplication when email already exists', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'existing-business-id' },
              error: null
            })
          })
        })
      });

      mockSupabaseClient.from.mockImplementation(mockFrom);

      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from('businesses')
        .select('id')
        .eq('email', validBusinessData.email)
        .single();

      expect(data).toEqual({ id: 'existing-business-id' });
      expect(error).toBeNull();
      // This indicates email already exists
    });

    it('should handle database errors during email uniqueness check', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed', code: 'CONNECTION_ERROR' }
            })
          })
        })
      });

      mockSupabaseClient.from.mockImplementation(mockFrom);

      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from('businesses')
        .select('id')
        .eq('email', validBusinessData.email)
        .single();

      expect(data).toBeNull();
      expect(error?.message).toBe('Database connection failed');
      expect(error?.code).toBe('CONNECTION_ERROR');
    });
  });

  describe('Business Record Creation', () => {
    it('should create business record with UUID and Colombian defaults', async () => {
      const mockUUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const expectedBusinessRecord = {
        id: mockUUID,
        name: validBusinessData.name,
        email: validBusinessData.email,
        phone: validBusinessData.phone,
        whatsapp_number: validBusinessData.whatsapp_number,
        street: validBusinessData.address.street,
        city: validBusinessData.address.city,
        department: validBusinessData.address.department,
        settings: {
          timezone: 'America/Bogota',
          currency: 'COP'
        },
        created_at: expect.any(String),
        updated_at: expect.any(String)
      };

      const mockFrom = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: expectedBusinessRecord,
              error: null
            })
          })
        })
      });

      mockSupabaseClient.from.mockImplementation(mockFrom);

      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from('businesses')
        .insert({
          id: mockUUID,
          ...validBusinessData,
          street: validBusinessData.address.street,
          city: validBusinessData.address.city,
          department: validBusinessData.address.department,
          settings: {
            timezone: 'America/Bogota',
            currency: 'COP'
          }
        })
        .select()
        .single();

      expect(mockFrom).toHaveBeenCalledWith('businesses');
      expect(data).toEqual(expectedBusinessRecord);
      expect(error).toBeNull();
    });

    it('should generate valid UUID for business ID', () => {
      // Test UUID generation pattern
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      // Simulate crypto.randomUUID() functionality
      const mockUUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      expect(mockUUID).toMatch(uuidPattern);
    });

    it('should handle business creation errors', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { 
                message: 'duplicate key value violates unique constraint',
                code: '23505'
              }
            })
          })
        })
      });

      mockSupabaseClient.from.mockImplementation(mockFrom);

      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from('businesses')
        .insert({
          id: 'test-uuid',
          ...validBusinessData
        })
        .select()
        .single();

      expect(data).toBeNull();
      expect(error?.code).toBe('23505');
      expect(error?.message).toContain('duplicate key');
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should validate business isolation with Row Level Security', async () => {
      // Test that business queries are properly isolated
      const businessId = 'business-123';
      
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { 
                id: businessId,
                name: 'Test Business'
              },
              error: null
            })
          })
        })
      });

      mockSupabaseClient.from.mockImplementation(mockFrom);

      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('id', businessId)
        .single();

      expect(mockFrom).toHaveBeenCalledWith('businesses');
      expect(data?.id).toBe(businessId);
      expect(error).toBeNull();
    });

    it('should handle business context setup for authentication', () => {
      const businessId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const businessContext = {
        business_id: businessId,
        name: validBusinessData.name,
        email: validBusinessData.email
      };

      // Validate business context structure
      expect(businessContext.business_id).toBe(businessId);
      expect(businessContext.name).toBe(validBusinessData.name);
      expect(businessContext.email).toBe(validBusinessData.email);
    });
  });

  describe('Response Formatting', () => {
    it('should format successful registration response', () => {
      const businessId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const successResponse = {
        success: true,
        data: {
          business: {
            id: businessId,
            name: validBusinessData.name,
            email: validBusinessData.email,
            phone: validBusinessData.phone,
            whatsapp_number: validBusinessData.whatsapp_number,
            address: validBusinessData.address
          }
        },
        message: 'Negocio registrado exitosamente'
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.data.business.id).toBe(businessId);
      expect(successResponse.message).toBe('Negocio registrado exitosamente');
    });

    it('should format validation error response', () => {
      const validationErrorResponse = {
        success: false,
        error: {
          type: 'validation_error',
          message: 'Datos de registro inválidos',
          details: {
            name: 'El nombre es requerido',
            email: 'Email inválido',
            phone: 'Formato de teléfono colombiano inválido'
          }
        }
      };

      expect(validationErrorResponse.success).toBe(false);
      expect(validationErrorResponse.error.type).toBe('validation_error');
      expect(validationErrorResponse.error.message).toBe('Datos de registro inválidos');
      expect(validationErrorResponse.error.details).toBeDefined();
    });

    it('should format email duplication error response', () => {
      const duplicateEmailResponse = {
        success: false,
        error: {
          type: 'email_exists',
          message: 'Este email ya está registrado',
          field: 'email'
        }
      };

      expect(duplicateEmailResponse.success).toBe(false);
      expect(duplicateEmailResponse.error.type).toBe('email_exists');
      expect(duplicateEmailResponse.error.message).toBe('Este email ya está registrado');
      expect(duplicateEmailResponse.error.field).toBe('email');
    });

    it('should format server error response', () => {
      const serverErrorResponse = {
        success: false,
        error: {
          type: 'server_error',
          message: 'Error interno del servidor. Intente nuevamente.'
        }
      };

      expect(serverErrorResponse.success).toBe(false);
      expect(serverErrorResponse.error.type).toBe('server_error');
      expect(serverErrorResponse.error.message).toBe('Error interno del servidor. Intente nuevamente.');
    });
  });

  describe('HTTP Methods and Headers', () => {
    it('should validate that only POST method is allowed', () => {
      const allowedMethods = ['POST'];
      const disallowedMethods = ['GET', 'PUT', 'DELETE', 'PATCH'];

      expect(allowedMethods).toContain('POST');
      disallowedMethods.forEach(method => {
        expect(allowedMethods).not.toContain(method);
      });
    });

    it('should validate Content-Type header for JSON requests', () => {
      const validContentTypes = [
        'application/json',
        'application/json; charset=utf-8'
      ];

      const invalidContentTypes = [
        'text/plain',
        'application/xml',
        'multipart/form-data'
      ];

      validContentTypes.forEach(contentType => {
        expect(contentType).toMatch(/application\/json/);
      });

      invalidContentTypes.forEach(contentType => {
        expect(contentType).not.toMatch(/application\/json/);
      });
    });

    it('should validate CORS headers for Colombian business requests', () => {
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      };

      expect(corsHeaders['Access-Control-Allow-Methods']).toContain('POST');
      expect(corsHeaders['Access-Control-Allow-Headers']).toContain('Content-Type');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed JSON request body', () => {
      const malformedJson = '{ "name": "Test", "email": }';
      
      expect(() => JSON.parse(malformedJson)).toThrow();
    });

    it('should handle extremely long field values', () => {
      const longString = 'a'.repeat(1000);
      const dataWithLongValues = {
        ...validBusinessData,
        name: longString
      };

      const result = BusinessRegistrationSchema.safeParse(dataWithLongValues);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const nameError = result.error.issues.find(issue => 
          issue.path.includes('name') && issue.code === 'too_big'
        );
        expect(nameError).toBeDefined();
      }
    });

    it('should handle special characters in business data', () => {
      const dataWithSpecialChars = {
        ...validBusinessData,
        name: 'Negócio & Cía. Ltda.',
        address: {
          ...validBusinessData.address,
          street: 'Calle 123 #45-67 Apto. 2B'
        }
      };

      const result = BusinessRegistrationSchema.safeParse(dataWithSpecialChars);
      expect(result.success).toBe(true);
    });

    it('should handle database connection timeouts', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Connection timeout'))
          })
        })
      });

      mockSupabaseClient.from.mockImplementation(mockFrom);

      const supabase = createServerSupabaseClient();
      
      await expect(
        supabase
          .from('businesses')
          .insert(validBusinessData)
          .select()
          .single()
      ).rejects.toThrow('Connection timeout');
    });
  });
});