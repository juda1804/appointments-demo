import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { env } from '@/lib/env';

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'healthy' | 'unhealthy';
    supabase: 'healthy' | 'unhealthy';
  };
  version: string;
  environment: string;
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const timestamp = new Date().toISOString();
  
  // Initialize service status
  let databaseStatus: 'healthy' | 'unhealthy' = 'unhealthy';
  let supabaseStatus: 'healthy' | 'unhealthy' = 'unhealthy';
  
  try {
    // Test Supabase connection
    const supabase = createServerSupabaseClient();
    
    // Test database connectivity by querying the businesses table
    const { error } = await supabase
      .from('businesses')
      .select('id')
      .limit(1);
    
    if (!error) {
      databaseStatus = 'healthy';
      supabaseStatus = 'healthy';
    } else {
      console.error('Health check database error:', error);
    }
  } catch (error) {
    console.error('Health check connection error:', error);
  }
  
  // Determine overall health status
  const isHealthy = databaseStatus === 'healthy' && supabaseStatus === 'healthy';
  
  const healthResponse: HealthResponse = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp,
    services: {
      database: databaseStatus,
      supabase: supabaseStatus,
    },
    version: process.env.npm_package_version || '1.0.0',
    environment: env.app.env,
  };
  
  // Return appropriate HTTP status code
  const statusCode = isHealthy ? 200 : 503;
  
  return NextResponse.json(healthResponse, { status: statusCode });
}