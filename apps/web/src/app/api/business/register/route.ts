import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { BusinessRegistrationSchema, extractValidationErrors } from '@/components/forms/validation-schemas';

// Response type definitions

interface SuccessResponse {
  success: true;
  data: {
    business: {
      id: string;
      name: string;
      email: string;
      phone: string;
      whatsapp_number: string;
      address: {
        street: string;
        city: string;
        department: string;
      };
    };
  };
  message: string;
}

interface ErrorResponse {
  success: false;
  error: {
    type: 'validation_error' | 'email_exists' | 'server_error';
    message: string;
    details?: Record<string, string>;
    field?: string;
  };
}

type ApiResponse = SuccessResponse | ErrorResponse;

/**
 * Colombian Business Registration API Endpoint
 * 
 * Handles business registration with Colombian-specific validation,
 * email uniqueness checks, and multi-tenant setup.
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    // Validate Content-Type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: {
            type: 'validation_error',
            message: 'Content-Type debe ser application/json'
          }
        },
        { status: 400 }
      );
    }

    // Parse request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: {
            type: 'validation_error',
            message: 'JSON inválido en el cuerpo de la solicitud'
          }
        },
        { status: 400 }
      );
    }

    // Validate business registration data
    const validationResult = BusinessRegistrationSchema.safeParse(requestBody);
    if (!validationResult.success) {
      const validationErrors = extractValidationErrors(validationResult.error);
      
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: {
            type: 'validation_error',
            message: 'Datos de registro inválidos',
            details: validationErrors
          }
        },
        { status: 400 }
      );
    }

    const businessData = validationResult.data;

    // Initialize Supabase client
    const supabase = createServerSupabaseClient();

    // Check email uniqueness
    const { data: existingBusiness, error: checkError } = await supabase
      .from('businesses')
      .select('id')
      .eq('email', businessData.email)
      .single();

    // Handle email uniqueness check
    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is what we want
      console.error('Email uniqueness check error:', checkError);
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: {
            type: 'server_error',
            message: 'Error interno del servidor. Intente nuevamente.'
          }
        },
        { status: 500 }
      );
    }

    // If existingBusiness is not null, email already exists
    if (existingBusiness) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: {
            type: 'email_exists',
            message: 'Este email ya está registrado',
            field: 'email'
          }
        },
        { status: 409 }
      );
    }

    // Generate UUID for business
    const businessId = crypto.randomUUID();

    // Prepare business record for insertion
    const businessRecord = {
      id: businessId,
      name: businessData.name,
      email: businessData.email,
      phone: businessData.phone,
      whatsapp_number: businessData.whatsapp_number,
      street: businessData.address.street,
      city: businessData.address.city,
      department: businessData.address.department,
      settings: {
        timezone: 'America/Bogota',
        currency: 'COP'
      }
    };

    // Create business record
    const { data: createdBusiness, error: insertError } = await supabase
      .from('businesses')
      .insert(businessRecord)
      .select()
      .single();

    if (insertError) {
      console.error('Business creation error:', insertError);
      
      // Handle specific database errors
      if (insertError.code === '23505') {
        // Unique constraint violation (email already exists)
        return NextResponse.json<ErrorResponse>(
          {
            success: false,
            error: {
              type: 'email_exists',
              message: 'Este email ya está registrado',
              field: 'email'
            }
          },
          { status: 409 }
        );
      }

      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: {
            type: 'server_error',
            message: 'Error interno del servidor. Intente nuevamente.'
          }
        },
        { status: 500 }
      );
    }

    // Format successful response
    const response: SuccessResponse = {
      success: true,
      data: {
        business: {
          id: createdBusiness.id,
          name: createdBusiness.name,
          email: createdBusiness.email,
          phone: createdBusiness.phone,
          whatsapp_number: createdBusiness.whatsapp_number,
          address: {
            street: createdBusiness.street,
            city: createdBusiness.city,
            department: createdBusiness.department
          }
        }
      },
      message: 'Negocio registrado exitosamente'
    };

    return NextResponse.json<SuccessResponse>(response, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in business registration:', error);
    
    return NextResponse.json<ErrorResponse>(
      {
        success: false,
        error: {
          type: 'server_error',
          message: 'Error interno del servidor. Intente nuevamente.'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Reject all other HTTP methods
 */
export async function GET(): Promise<NextResponse<ErrorResponse>> {
  return NextResponse.json<ErrorResponse>(
    {
      success: false,
      error: {
        type: 'validation_error',
        message: 'Método no permitido. Use POST para registrar un negocio.'
      }
    },
    { status: 405 }
  );
}

export async function PUT(): Promise<NextResponse<ErrorResponse>> {
  return NextResponse.json<ErrorResponse>(
    {
      success: false,
      error: {
        type: 'validation_error',
        message: 'Método no permitido. Use POST para registrar un negocio.'
      }
    },
    { status: 405 }
  );
}

export async function DELETE(): Promise<NextResponse<ErrorResponse>> {
  return NextResponse.json<ErrorResponse>(
    {
      success: false,
      error: {
        type: 'validation_error',
        message: 'Método no permitido. Use POST para registrar un negocio.'
      }
    },
    { status: 405 }
  );
}

export async function PATCH(): Promise<NextResponse<ErrorResponse>> {
  return NextResponse.json<ErrorResponse>(
    {
      success: false,
      error: {
        type: 'validation_error',
        message: 'Método no permitido. Use POST para registrar un negocio.'
      }
    },
    { status: 405 }
  );
}