import { NextRequest, NextResponse } from 'next/server';
import { businessDb } from '@/lib/database';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { BusinessSettings } from '@appointments-demo/types';

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
    const settingsUpdates: Partial<BusinessSettings> = body;

    // Validate business hours if provided
    if (settingsUpdates.businessHours) {
      const validationErrors: string[] = [];
      
      settingsUpdates.businessHours.forEach((hour, index) => {
        // Validate day of week
        if (hour.dayOfWeek < 0 || hour.dayOfWeek > 6) {
          validationErrors.push(`Invalid day of week for hour ${index}`);
        }

        // Validate time format
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(hour.openTime)) {
          validationErrors.push(`Invalid open time format for day ${hour.dayOfWeek}`);
        }
        if (!timeRegex.test(hour.closeTime)) {
          validationErrors.push(`Invalid close time format for day ${hour.dayOfWeek}`);
        }

        // Validate that open time is before close time
        if (hour.isOpen && timeRegex.test(hour.openTime) && timeRegex.test(hour.closeTime)) {
          const openMinutes = parseInt(hour.openTime.split(':')[0]) * 60 + parseInt(hour.openTime.split(':')[1]);
          const closeMinutes = parseInt(hour.closeTime.split(':')[0]) * 60 + parseInt(hour.closeTime.split(':')[1]);
          
          if (openMinutes >= closeMinutes) {
            validationErrors.push(`Close time must be after open time for day ${hour.dayOfWeek}`);
          }
        }
      });

      if (validationErrors.length > 0) {
        return NextResponse.json(
          { error: 'Business hours validation failed', details: validationErrors },
          { status: 400 }
        );
      }
    }

    // Validate timezone if provided
    if (settingsUpdates.timezone) {
      const validTimezones = [
        'America/Bogota',
        'America/New_York', 
        'America/Los_Angeles',
        'Europe/Madrid',
        'UTC'
      ];
      
      if (!validTimezones.includes(settingsUpdates.timezone)) {
        return NextResponse.json(
          { error: 'Invalid timezone' },
          { status: 400 }
        );
      }
    }

    // Validate currency (should be COP for Colombian businesses)
    if (settingsUpdates.currency && settingsUpdates.currency !== 'COP') {
      return NextResponse.json(
        { error: 'Only COP currency is supported for Colombian businesses' },
        { status: 400 }
      );
    }

    // Set business context for RLS
    await businessDb.setBusinessContext(businessId);

    // Update business settings
    await businessDb.updateSettings(businessId, settingsUpdates);

    // Get updated business to return complete settings
    const business = await businessDb.getById(businessId);
    
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    return NextResponse.json({ settings: business.settings });
  } catch (error) {
    console.error('Error updating business settings:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}