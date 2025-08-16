import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase';
import { 
  COLOMBIAN_DEPARTMENTS 
} from '@appointments-demo/utils';

// Validation Schemas
const UserRegistrationSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .min(1, 'El email es requerido')
    .max(255, 'El email es demasiado largo')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña es demasiado larga')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula')
    .regex(/[a-z]/, 'La contraseña debe contener al menos una letra minúscula')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
  confirmPassword: z.string(),
  name: z.string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre es demasiado largo')
    .trim()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
});

const BusinessRegistrationSchema = z.object({
  name: z.string()
    .min(1, 'El nombre del negocio es requerido')
    .max(200, 'El nombre del negocio es demasiado largo')
    .trim(),
  email: z.string()
    .email('Email del negocio inválido')
    .min(1, 'El email del negocio es requerido')
    .max(255, 'El email del negocio es demasiado largo')
    .toLowerCase()
    .trim(),
  phone: z.string()
    .regex(/^\+57 \d{3} \d{3} \d{4}$/, 'Formato de teléfono colombiano inválido (+57 XXX XXX XXXX)')
    .transform((phone) => phone.trim()),
  whatsapp_number: z.string()
    .regex(/^\+57 \d{3} \d{3} \d{4}$/, 'Formato de WhatsApp colombiano inválido (+57 XXX XXX XXXX)')
    .transform((phone) => phone.trim()),
  address: z.object({
    street: z.string()
      .min(1, 'La dirección es requerida')
      .max(200, 'La dirección es demasiado larga')
      .trim(),
    city: z.string()
      .min(1, 'La ciudad es requerida')
      .max(100, 'La ciudad es demasiado larga')
      .trim(),
    department: z.enum([...COLOMBIAN_DEPARTMENTS] as [string, ...string[]], {
      message: 'Departamento colombiano inválido'
    })
  })
});

const UnifiedRegistrationSchema = z.object({
  user: UserRegistrationSchema,
  business: BusinessRegistrationSchema
});

// TypeScript Types
export type UnifiedRegistrationRequest = z.infer<typeof UnifiedRegistrationSchema>;

export interface UnifiedRegistrationResponse {
  success: boolean;
  data?: {
    user_id: string;
    business_id: string;
    email_verification_sent: boolean;
    user: {
      id: string;
      email: string;
      name: string;
    };
    business: {
      id: string;
      name: string;
      email: string;
      phone: string;
    };
  };
  error?: {
    type: 'validation_error' | 'email_exists' | 'business_email_exists' | 'user_creation_failed' | 'business_creation_failed' | 'transaction_failed' | 'rollback_failed' | 'server_error';
    message: string;
    details?: Record<string, string>;
    field?: string;
    value?: string;
    cleanup_performed?: boolean;
    retry_allowed?: boolean;
    user_id?: string;
    cleanup_attempted?: boolean;
    cleanup_successful?: boolean;
  };
  message?: string;
}

// Helper Functions
async function checkEmailUniqueness(email: string, type: 'user' | 'business') {
  const supabase = createServerSupabaseClient();
  
  if (type === 'user') {
    // Check user email in auth.users via admin API
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      throw new Error('Error checking user email uniqueness');
    }
    
    const existingUser = data.users.find(user => user.email === email);
    return !existingUser;
  } else {
    // Check business email in businesses table
    const { data, error } = await supabase
      .from('businesses')
      .select('id')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw new Error('Error checking business email uniqueness');
    }
    
    return !data; // No data means email is unique
  }
}

async function createUserAccount(userData: z.infer<typeof UserRegistrationSchema>) {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
    options: {
      data: {
        name: userData.name
      }
    }
  });
  
  if (error) {
    throw new Error(`User creation failed: ${error.message}`);
  }
  
  if (!data.user) {
    throw new Error('User creation failed: No user returned');
  }
  
  return data.user;
}

async function createBusinessRecord(businessData: z.infer<typeof BusinessRegistrationSchema>, userId: string) {
  const supabase = createServerSupabaseClient();
  const businessId = crypto.randomUUID();
  
  const { data, error } = await supabase
    .from('businesses')
    .insert({
      id: businessId,
      name: businessData.name,
      email: businessData.email,
      phone: businessData.phone,
      whatsapp_number: businessData.whatsapp_number,
      street: businessData.address.street,
      city: businessData.address.city,
      department: businessData.address.department,
      owner_id: userId,
      settings: {
        timezone: 'America/Bogota',
        currency: 'COP',
        business_hours: {
          monday: { start: '08:00', end: '18:00' },
          tuesday: { start: '08:00', end: '18:00' },
          wednesday: { start: '08:00', end: '18:00' },
          thursday: { start: '08:00', end: '18:00' },
          friday: { start: '08:00', end: '18:00' },
          saturday: { start: '08:00', end: '16:00' },
          sunday: { closed: true }
        }
      }
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Business creation failed: ${error.message}`);
  }
  
  if (!data) {
    throw new Error('Business creation failed: No business returned');
  }
  
  return data;
}

async function updateUserMetadata(userId: string, businessId: string, userName: string) {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase.auth.admin.updateUserById(
    userId,
    {
      user_metadata: {
        name: userName,
        business_id: businessId
      }
    }
  );
  
  if (error) {
    throw new Error(`User metadata update failed: ${error.message}`);
  }
  
  return data.user;
}

async function cleanupUser(userId: string): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient();
    
    const { error } = await supabase.auth.admin.deleteUser(userId);
    
    if (error) {
      console.error('User cleanup failed:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('User cleanup error:', err);
    return false;
  }
}

function formatValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  
  error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  });
  
  return errors;
}

// Main Handler
export async function POST(request: NextRequest): Promise<NextResponse<UnifiedRegistrationResponse>> {
  try {
    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      return NextResponse.json({
        success: false,
        error: {
          type: 'validation_error',
          message: 'Formato de solicitud inválido'
        }
      }, { status: 400 });
    }
    
    // Validate request data
    const validationResult = UnifiedRegistrationSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: {
          type: 'validation_error',
          message: 'Datos de registro inválidos',
          details: formatValidationErrors(validationResult.error)
        }
      }, { status: 400 });
    }
    
    const { user: userData, business: businessData } = validationResult.data;
    
    // Check email uniqueness
    try {
      const userEmailUnique = await checkEmailUniqueness(userData.email, 'user');
      if (!userEmailUnique) {
        return NextResponse.json({
          success: false,
          error: {
            type: 'email_exists',
            message: 'Este email de usuario ya está registrado',
            field: 'user.email',
            value: userData.email
          }
        }, { status: 409 });
      }
      
      const businessEmailUnique = await checkEmailUniqueness(businessData.email, 'business');
      if (!businessEmailUnique) {
        return NextResponse.json({
          success: false,
          error: {
            type: 'business_email_exists',
            message: 'Este email de negocio ya está registrado',
            field: 'business.email',
            value: businessData.email
          }
        }, { status: 409 });
      }
    } catch (err) {
      console.error('Email uniqueness check failed:', err);
      return NextResponse.json({
        success: false,
        error: {
          type: 'server_error',
          message: 'Error verificando la unicidad del email. Intente nuevamente.'
        }
      }, { status: 500 });
    }
    
    // Start transaction: Create user
    let user;
    try {
      user = await createUserAccount(userData);
    } catch (err) {
      console.error('User creation failed:', err);
      return NextResponse.json({
        success: false,
        error: {
          type: 'user_creation_failed',
          message: err instanceof Error ? err.message : 'Error al crear la cuenta de usuario'
        }
      }, { status: 500 });
    }
    
    // Create business record
    let business;
    try {
      business = await createBusinessRecord(businessData, user.id);
    } catch (err) {
      console.error('Business creation failed:', err);
      
      // Rollback: Clean up user
      const cleanupSuccessful = await cleanupUser(user.id);
      
      return NextResponse.json({
        success: false,
        error: {
          type: 'business_creation_failed',
          message: err instanceof Error ? err.message : 'Error al crear el negocio. Registro cancelado.',
          cleanup_performed: cleanupSuccessful,
          retry_allowed: true
        }
      }, { status: 500 });
    }
    
    // Update user metadata with business_id
    try {
      await updateUserMetadata(user.id, business.id, userData.name);
    } catch (err) {
      console.error('User metadata update failed:', err);
      
      // Note: We don't rollback here as the core registration succeeded
      // The business_id can be set later during email verification
      console.warn('User metadata update failed, but registration completed. business_id will be set during verification.');
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        user_id: user.id,
        business_id: business.id,
        email_verification_sent: true,
        user: {
          id: user.id,
          email: user.email || userData.email,
          name: userData.name
        },
        business: {
          id: business.id,
          name: business.name,
          email: business.email,
          phone: business.phone
        }
      },
      message: 'Registro exitoso. Revisa tu email para verificar tu cuenta.'
    }, { status: 201 });
    
  } catch (err) {
    console.error('Unified registration error:', err);
    
    return NextResponse.json({
      success: false,
      error: {
        type: 'server_error',
        message: 'Error interno del servidor. Intente nuevamente.',
        retry_allowed: true
      }
    }, { status: 500 });
  }
}

// Only allow POST method
export async function GET() {
  return NextResponse.json({
    success: false,
    error: {
      type: 'method_not_allowed',
      message: 'Método no permitido. Use POST para registrar.'
    }
  }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({
    success: false,
    error: {
      type: 'method_not_allowed',
      message: 'Método no permitido. Use POST para registrar.'
    }
  }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({
    success: false,
    error: {
      type: 'method_not_allowed',
      message: 'Método no permitido. Use POST para registrar.'
    }
  }, { status: 405 });
}