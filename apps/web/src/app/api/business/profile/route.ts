import { NextRequest, NextResponse } from 'next/server';
import { businessDb } from '@/lib/database';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { Business } from '@appointments-demo/types';
import { validateColombianPhone, isValidColombianDepartment } from '@appointments-demo/utils';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business ID from business context
    const { data: businessId, error: contextError } = await supabase.rpc('get_current_business_id');
    
    if (contextError || !businessId) {
      return NextResponse.json({ error: 'Business context not found' }, { status: 404 });
    }

    // Set business context for RLS
    await businessDb.setBusinessContext(businessId);

    // Get business profile
    const business = await businessDb.getById(businessId);
    
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    return NextResponse.json({ business });
  } catch (error) {
    console.error('Error fetching business profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business ID from business context
    const { data: businessId, error: contextError } = await supabase.rpc('get_current_business_id');
    
    if (contextError || !businessId) {
      return NextResponse.json({ error: 'Business context not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const businessUpdates: Partial<Business> = body;

    // Validate required fields
    const validationErrors: string[] = [];

    if (businessUpdates.name !== undefined && !businessUpdates.name.trim()) {
      validationErrors.push('Business name is required');
    }

    if (businessUpdates.phone !== undefined && !validateColombianPhone(businessUpdates.phone)) {
      validationErrors.push('Invalid Colombian phone number format');
    }

    if (businessUpdates.whatsappNumber !== undefined && businessUpdates.whatsappNumber && !validateColombianPhone(businessUpdates.whatsappNumber)) {
      validationErrors.push('Invalid Colombian WhatsApp number format');
    }

    if (businessUpdates.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessUpdates.email)) {
      validationErrors.push('Invalid email format');
    }

    if (businessUpdates.address?.department !== undefined && !isValidColombianDepartment(businessUpdates.address.department)) {
      validationErrors.push('Invalid Colombian department');
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    // Set business context for RLS
    await businessDb.setBusinessContext(businessId);

    // Update business profile
    await businessDb.update(businessId, businessUpdates);

    // Return updated business
    const business = await businessDb.getById(businessId);

    return NextResponse.json({ business });
  } catch (error) {
    console.error('Error updating business profile:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}