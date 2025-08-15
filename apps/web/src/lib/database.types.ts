// Database types generated from Supabase schema
// This file provides type-safe access to database operations

import type { Business, BusinessSettings } from '@appointments-demo/types';

// Raw database record type (matches actual database schema)
export interface BusinessRecord {
  id: string;
  name: string;
  description: string | null;
  street: string;
  city: string;
  department: string;
  postal_code: string | null;
  phone: string;
  whatsapp_number: string | null;
  email: string;
  settings: BusinessSettings;
  created_at: string;
  updated_at: string;
}

// Database table definitions
export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: BusinessRecord;
        Insert: Omit<BusinessRecord, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<BusinessRecord, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      set_current_business_id: {
        Args: { business_uuid: string };
        Returns: void;
      };
      get_current_business_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
    };
    Enums: Record<string, never>;
  };
}

// Type helpers for common database operations
export type DatabaseTable = keyof Database['public']['Tables'];
export type DatabaseFunction = keyof Database['public']['Functions'];

// Helper to convert database record to domain object
export function toDomainBusiness(record: BusinessRecord): Business {
  return {
    id: record.id,
    name: record.name,
    description: record.description ?? undefined,
    address: {
      street: record.street,
      city: record.city,
      department: record.department,
      postalCode: record.postal_code ?? undefined,
    },
    phone: record.phone,
    whatsappNumber: record.whatsapp_number ?? undefined,
    email: record.email,
    settings: record.settings,
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at),
  };
}

// Helper to convert domain object to database record
export function toBusinessRecord(business: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>): 
  Database['public']['Tables']['businesses']['Insert'] {
  return {
    name: business.name,
    description: business.description || null,
    street: business.address.street,
    city: business.address.city,
    department: business.address.department,
    postal_code: business.address.postalCode || null,
    phone: business.phone,
    whatsapp_number: business.whatsappNumber || null,
    email: business.email,
    settings: business.settings,
  };
}