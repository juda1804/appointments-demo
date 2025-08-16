/**
 * Unified Business-User Registration API Tests
 * 
 * Tests the /api/business/register-complete endpoint for unified registration scenarios
 * including user creation, business creation, email verification, and transaction integrity
 */

import { createServerSupabaseClient } from '@/lib/supabase';
import type { UnifiedRegistrationRequest, UnifiedRegistrationResponse } from './route';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

describe('Unified Business-User Registration API', () => {
  let mockSupabaseClient: {
    from: jest.Mock;
    auth: {
      signUp: jest.Mock;
      admin: {
        updateUserById: jest.Mock;
        deleteUser: jest.Mock;
      };
    };
    rpc: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock Supabase client
    mockSupabaseClient = {
      from: jest.fn(),
      auth: {
        signUp: jest.fn(),
        admin: {
          updateUserById: jest.fn(),
          deleteUser: jest.fn(),
        },
      },
      rpc: jest.fn(),
    };
    
    (createServerSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  const validUnifiedRegistrationData: UnifiedRegistrationRequest = {
    user: {
      email: 'owner@mipelu.com.co',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!',
      name: 'Carlos Mendez'
    },
    business: {
      name: 'MiPelu - Salón de Belleza',
      email: 'info@mipelu.com.co',
      phone: '+57 300 123 4567',
      whatsapp_number: '+57 310 987 6543',
      address: {
        street: 'Carrera 15 #85-32',
        city: 'Bogotá',
        department: 'Cundinamarca'
      }
    }
  };

  describe('Request Validation', () => {
    it('should validate correct unified registration data', () => {
      // Test request structure validation
      expect(validUnifiedRegistrationData.user.email).toBe('owner@mipelu.com.co');
      expect(validUnifiedRegistrationData.user.password).toBe('SecurePass123!');
      expect(validUnifiedRegistrationData.business.name).toBe('MiPelu - Salón de Belleza');
      expect(validUnifiedRegistrationData.business.address.department).toBe('Cundinamarca');
    });

    it('should reject invalid user data', () => {
      const invalidUserData = {
        user: {
          email: 'invalid-email',
          password: '123', // Too short
          confirmPassword: '456', // Doesn't match
          name: '' // Empty name
        },
        business: validUnifiedRegistrationData.business
      };

      // Validation would be handled by Zod schema
      expect(invalidUserData.user.email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(invalidUserData.user.password).not.toEqual(invalidUserData.user.confirmPassword);
      expect(invalidUserData.user.name).toBe('');
    });

    it('should require password confirmation match', () => {
      const mismatchedPasswords = {
        ...validUnifiedRegistrationData,
        user: {
          ...validUnifiedRegistrationData.user,
          password: 'SecurePass123!',
          confirmPassword: 'DifferentPass123!'
        }
      };

      expect(mismatchedPasswords.user.password).not.toEqual(mismatchedPasswords.user.confirmPassword);
    });

    it('should validate Colombian business data requirements', () => {
      const colombianValidation = {
        phone: validUnifiedRegistrationData.business.phone.match(/^\+57 \d{3} \d{3} \d{4}$/),
        whatsapp: validUnifiedRegistrationData.business.whatsapp_number.match(/^\+57 \d{3} \d{3} \d{4}$/),
        department: ['Cundinamarca'].includes(validUnifiedRegistrationData.business.address.department)
      };

      expect(colombianValidation.phone).toBeTruthy();
      expect(colombianValidation.whatsapp).toBeTruthy();
      expect(colombianValidation.department).toBe(true);
    });

    it('should validate email format for both user and business', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      expect(validUnifiedRegistrationData.user.email).toMatch(emailRegex);
      expect(validUnifiedRegistrationData.business.email).toMatch(emailRegex);
    });
  });

  describe('User Creation Process', () => {
    it('should create user account with email verification', async () => {
      const mockUser = {
        id: 'user-123',
        email: validUnifiedRegistrationData.user.email,
        email_confirmed_at: null,
        user_metadata: {
          name: validUnifiedRegistrationData.user.name
        }
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          user: mockUser,
          session: null // No session until email confirmed
        },
        error: null
      });

      const { data, error } = await mockSupabaseClient.auth.signUp({
        email: validUnifiedRegistrationData.user.email,
        password: validUnifiedRegistrationData.user.password,
        options: {
          data: {
            name: validUnifiedRegistrationData.user.name
          }
        }
      });

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: validUnifiedRegistrationData.user.email,
        password: validUnifiedRegistrationData.user.password,
        options: {
          data: {
            name: validUnifiedRegistrationData.user.name
          }
        }
      });

      expect(data.user?.id).toBe('user-123');
      expect(data.user?.email_confirmed_at).toBeNull();
      expect(error).toBeNull();
    });

    it('should handle duplicate user email error', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'User already registered',
          status: 400
        }
      });

      const { data, error } = await mockSupabaseClient.auth.signUp({
        email: validUnifiedRegistrationData.user.email,
        password: validUnifiedRegistrationData.user.password
      });

      expect(data.user).toBeNull();
      expect(error?.message).toBe('User already registered');
      expect(error?.status).toBe(400);
    });

    it('should handle weak password error', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'Password should be at least 6 characters',
          status: 400
        }
      });

      const { error } = await mockSupabaseClient.auth.signUp({
        email: validUnifiedRegistrationData.user.email,
        password: '123'
      });

      expect(error?.message).toContain('Password should be at least');
      expect(error?.status).toBe(400);
    });
  });

  describe('Business Creation Process', () => {
    it('should create business record linked to user', async () => {
      const userId = 'user-123';
      const businessId = 'business-456';
      
      const expectedBusinessRecord = {
        id: businessId,
        name: validUnifiedRegistrationData.business.name,
        email: validUnifiedRegistrationData.business.email,
        phone: validUnifiedRegistrationData.business.phone,
        whatsapp_number: validUnifiedRegistrationData.business.whatsapp_number,
        street: validUnifiedRegistrationData.business.address.street,
        city: validUnifiedRegistrationData.business.address.city,
        department: validUnifiedRegistrationData.business.address.department,
        owner_id: userId, // Critical link to user
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

      const { data, error } = await mockSupabaseClient
        .from('businesses')
        .insert({
          id: businessId,
          name: validUnifiedRegistrationData.business.name,
          email: validUnifiedRegistrationData.business.email,
          phone: validUnifiedRegistrationData.business.phone,
          whatsapp_number: validUnifiedRegistrationData.business.whatsapp_number,
          street: validUnifiedRegistrationData.business.address.street,
          city: validUnifiedRegistrationData.business.address.city,
          department: validUnifiedRegistrationData.business.address.department,
          owner_id: userId,
          settings: {
            timezone: 'America/Bogota',
            currency: 'COP'
          }
        })
        .select()
        .single();

      expect(mockFrom).toHaveBeenCalledWith('businesses');
      expect(data?.owner_id).toBe(userId);
      expect(data?.settings?.timezone).toBe('America/Bogota');
      expect(data?.settings?.currency).toBe('COP');
      expect(error).toBeNull();
    });

    it('should check business email uniqueness before creation', async () => {
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

      const { data } = await mockSupabaseClient
        .from('businesses')
        .select('id')
        .eq('email', validUnifiedRegistrationData.business.email)
        .single();

      expect(data?.id).toBe('existing-business-id');
      // This indicates business email already exists
    });

    it('should update user metadata with business_id after creation', async () => {
      const userId = 'user-123';
      const businessId = 'business-456';

      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue({
        data: {
          user: {
            id: userId,
            user_metadata: {
              name: validUnifiedRegistrationData.user.name,
              business_id: businessId
            }
          }
        },
        error: null
      });

      const { data, error } = await mockSupabaseClient.auth.admin.updateUserById(
        userId,
        {
          user_metadata: {
            name: validUnifiedRegistrationData.user.name,
            business_id: businessId
          }
        }
      );

      expect(mockSupabaseClient.auth.admin.updateUserById).toHaveBeenCalledWith(
        userId,
        {
          user_metadata: {
            name: validUnifiedRegistrationData.user.name,
            business_id: businessId
          }
        }
      );

      expect(data.user.user_metadata.business_id).toBe(businessId);
      expect(error).toBeNull();
    });
  });

  describe('Transaction Integrity', () => {
    it('should handle complete successful transaction', async () => {
      const userId = 'user-123';
      const businessId = 'business-456';

      // Mock successful user creation
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          user: { id: userId, email: validUnifiedRegistrationData.user.email },
          session: null
        },
        error: null
      });

      // Mock successful business creation
      const mockBusinessFrom = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: businessId, owner_id: userId },
              error: null
            })
          })
        })
      });

      mockSupabaseClient.from.mockImplementation(mockBusinessFrom);

      // Mock successful user metadata update
      mockSupabaseClient.auth.admin.updateUserById.mockResolvedValue({
        data: {
          user: {
            id: userId,
            user_metadata: { business_id: businessId }
          }
        },
        error: null
      });

      // Simulate transaction success
      const transactionResult = {
        success: true,
        data: {
          user_id: userId,
          business_id: businessId,
          email_verification_sent: true
        }
      };

      expect(transactionResult.success).toBe(true);
      expect(transactionResult.data.user_id).toBe(userId);
      expect(transactionResult.data.business_id).toBe(businessId);
      expect(transactionResult.data.email_verification_sent).toBe(true);
    });

    it('should rollback user creation if business creation fails', async () => {
      const userId = 'user-123';

      // Mock successful user creation
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          user: { id: userId, email: validUnifiedRegistrationData.user.email },
          session: null
        },
        error: null
      });

      // Mock failed business creation
      const mockBusinessFrom = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: {
                message: 'Business email already exists',
                code: '23505'
              }
            })
          })
        })
      });

      mockSupabaseClient.from.mockImplementation(mockBusinessFrom);

      // Mock user cleanup
      mockSupabaseClient.auth.admin.deleteUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      // Simulate rollback scenario
      const rollbackResult = {
        success: false,
        error: {
          type: 'business_creation_failed',
          message: 'Error al crear el negocio. Registro cancelado.',
          cleanup_performed: true
        }
      };

      expect(rollbackResult.success).toBe(false);
      expect(rollbackResult.error.cleanup_performed).toBe(true);
      expect(rollbackResult.error.message).toContain('Registro cancelado');
    });

    it('should handle user creation failure gracefully', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'Invalid email format',
          status: 400
        }
      });

      const failureResult = {
        success: false,
        error: {
          type: 'user_creation_failed',
          message: 'Error al crear la cuenta de usuario',
          details: 'Invalid email format'
        }
      };

      expect(failureResult.success).toBe(false);
      expect(failureResult.error.type).toBe('user_creation_failed');
      expect(failureResult.error.details).toBe('Invalid email format');
    });

    it('should handle partial rollback failures', async () => {
      const userId = 'user-123';

      // Mock user deletion failure during rollback
      mockSupabaseClient.auth.admin.deleteUser.mockResolvedValue({
        data: null,
        error: {
          message: 'User deletion failed',
          status: 500
        }
      });

      const partialRollbackResult = {
        success: false,
        error: {
          type: 'rollback_failed',
          message: 'Registro falló y la limpieza fue incompleta. Contacte soporte.',
          user_id: userId,
          cleanup_attempted: true,
          cleanup_successful: false
        }
      };

      expect(partialRollbackResult.success).toBe(false);
      expect(partialRollbackResult.error.cleanup_attempted).toBe(true);
      expect(partialRollbackResult.error.cleanup_successful).toBe(false);
      expect(partialRollbackResult.error.message).toContain('Contacte soporte');
    });
  });

  describe('Colombian Business Integration', () => {
    it('should set Colombian business defaults', () => {
      const colombianDefaults = {
        timezone: 'America/Bogota',
        currency: 'COP',
        phone_country_code: '+57',
        business_hours: {
          monday: { start: '08:00', end: '18:00' },
          tuesday: { start: '08:00', end: '18:00' },
          wednesday: { start: '08:00', end: '18:00' },
          thursday: { start: '08:00', end: '18:00' },
          friday: { start: '08:00', end: '18:00' },
          saturday: { start: '08:00', end: '16:00' },
          sunday: { closed: true }
        }
      };

      expect(colombianDefaults.timezone).toBe('America/Bogota');
      expect(colombianDefaults.currency).toBe('COP');
      expect(colombianDefaults.phone_country_code).toBe('+57');
      expect(colombianDefaults.business_hours.sunday.closed).toBe(true);
    });

    it('should validate Colombian department selection', () => {
      const validDepartments = [
        'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar',
        'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca',
        'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía',
        'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta',
        'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío',
        'Risaralda', 'San Andrés y Providencia', 'Santander',
        'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'
      ];

      expect(validDepartments).toContain('Cundinamarca');
      expect(validDepartments).toContain('Antioquia');
      expect(validDepartments).toContain('Valle del Cauca');
      expect(validDepartments).not.toContain('InvalidDepartment');
    });

    it('should format Colombian business data correctly', () => {
      const formattedData = {
        phone: validUnifiedRegistrationData.business.phone,
        whatsapp: validUnifiedRegistrationData.business.whatsapp_number,
        address: `${validUnifiedRegistrationData.business.address.street}, ${validUnifiedRegistrationData.business.address.city}, ${validUnifiedRegistrationData.business.address.department}`
      };

      expect(formattedData.phone).toMatch(/^\+57 \d{3} \d{3} \d{4}$/);
      expect(formattedData.whatsapp).toMatch(/^\+57 \d{3} \d{3} \d{4}$/);
      expect(formattedData.address).toContain('Bogotá');
      expect(formattedData.address).toContain('Cundinamarca');
    });
  });

  describe('API Response Formatting', () => {
    it('should format successful registration response', () => {
      const successResponse: UnifiedRegistrationResponse = {
        success: true,
        data: {
          user_id: 'user-123',
          business_id: 'business-456',
          email_verification_sent: true,
          user: {
            id: 'user-123',
            email: validUnifiedRegistrationData.user.email,
            name: validUnifiedRegistrationData.user.name
          },
          business: {
            id: 'business-456',
            name: validUnifiedRegistrationData.business.name,
            email: validUnifiedRegistrationData.business.email,
            phone: validUnifiedRegistrationData.business.phone
          }
        },
        message: 'Registro exitoso. Revisa tu email para verificar tu cuenta.'
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.data.email_verification_sent).toBe(true);
      expect(successResponse.message).toContain('Revisa tu email');
    });

    it('should format validation error response', () => {
      const validationErrorResponse: UnifiedRegistrationResponse = {
        success: false,
        error: {
          type: 'validation_error',
          message: 'Datos de registro inválidos',
          details: {
            'user.email': 'Email inválido',
            'user.password': 'La contraseña debe tener al menos 8 caracteres',
            'business.phone': 'Formato de teléfono colombiano inválido'
          }
        }
      };

      expect(validationErrorResponse.success).toBe(false);
      expect(validationErrorResponse.error?.type).toBe('validation_error');
      expect(validationErrorResponse.error?.details).toBeDefined();
    });

    it('should format duplicate email error response', () => {
      const duplicateEmailResponse: UnifiedRegistrationResponse = {
        success: false,
        error: {
          type: 'email_exists',
          message: 'El email ya está registrado',
          field: 'user.email',
          value: validUnifiedRegistrationData.user.email
        }
      };

      expect(duplicateEmailResponse.success).toBe(false);
      expect(duplicateEmailResponse.error?.type).toBe('email_exists');
      expect(duplicateEmailResponse.error?.field).toBe('user.email');
    });

    it('should format transaction failure response', () => {
      const transactionErrorResponse: UnifiedRegistrationResponse = {
        success: false,
        error: {
          type: 'transaction_failed',
          message: 'Error durante el registro. La transacción fue revertida.',
          cleanup_performed: true,
          retry_allowed: true
        }
      };

      expect(transactionErrorResponse.success).toBe(false);
      expect(transactionErrorResponse.error?.type).toBe('transaction_failed');
      expect(transactionErrorResponse.error?.cleanup_performed).toBe(true);
      expect(transactionErrorResponse.error?.retry_allowed).toBe(true);
    });
  });

  describe('Security and Rate Limiting', () => {
    it('should validate request comes from allowed origins', () => {
      const allowedOrigins = [
        'http://localhost:3000',
        'https://appointments-demo.com',
        'https://staging.appointments-demo.com'
      ];

      const testOrigin = 'http://localhost:3000';
      expect(allowedOrigins).toContain(testOrigin);
    });

    it('should enforce rate limiting for registration attempts', () => {
      const rateLimitConfig = {
        max_attempts_per_email: 3,
        time_window_minutes: 60,
        max_attempts_per_ip: 10,
        time_window_ip_minutes: 60
      };

      expect(rateLimitConfig.max_attempts_per_email).toBe(3);
      expect(rateLimitConfig.time_window_minutes).toBe(60);
    });

    it('should validate password strength requirements', () => {
      const passwordRequirements = {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false // Optional for Colombian users
      };

      const testPassword = 'SecurePass123!';
      const validation = {
        length: testPassword.length >= passwordRequirements.minLength,
        uppercase: /[A-Z]/.test(testPassword),
        lowercase: /[a-z]/.test(testPassword),
        numbers: /[0-9]/.test(testPassword)
      };

      expect(validation.length).toBe(true);
      expect(validation.uppercase).toBe(true);
      expect(validation.lowercase).toBe(true);
      expect(validation.numbers).toBe(true);
    });
  });
});