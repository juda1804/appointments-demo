#!/usr/bin/env tsx
/**
 * Development User Seeding Script
 * 
 * Creates sample users and businesses for development testing
 * DO NOT RUN IN PRODUCTION
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') });

// Development environment check
if (process.env.NODE_ENV === 'production') {
  console.error('❌ This script should not be run in production!');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface DevUser {
  email: string;
  password: string;
  name: string;
  business: {
    name: string;
    description: string;
    phone: string;
    whatsapp_number: string;
    address: {
      street: string;
      city: string;
      department: string;
    };
    businessType: string;
  };
}

const devUsers: DevUser[] = [
  {
    email: 'maria.gonzalez@salonmaria.com',
    password: 'DevPassword123!',
    name: 'María González',
    business: {
      name: 'Salón de Belleza María',
      description: 'Salón de belleza especializado en cortes modernos y tratamientos capilares en el corazón de Bogotá',
      phone: '+57 301 234 5678',
      whatsapp_number: '+57 301 234 5678',
      address: {
        street: 'Carrera 15 # 93-47',
        city: 'Bogotá',
        department: 'Cundinamarca'
      },
      businessType: 'Salón de Belleza'
    }
  },
  {
    email: 'carlos.rodriguez@clinicasonrisas.com',
    password: 'DevPassword123!',
    name: 'Dr. Carlos Rodríguez',
    business: {
      name: 'Clínica Dental Sonrisas',
      description: 'Clínica dental integral con tecnología de punta y atención personalizada en Medellín',
      phone: '+57 314 567 8901',
      whatsapp_number: '+57 314 567 8901',
      address: {
        street: 'Calle 70 # 52-20',
        city: 'Medellín',
        department: 'Antioquia'
      },
      businessType: 'Clínica Dental'
    }
  },
  {
    email: 'ana.martinez@fitlifecali.com',
    password: 'DevPassword123!',
    name: 'Ana Martínez',
    business: {
      name: 'Gimnasio FitLife',
      description: 'Centro de acondicionamiento físico con equipos modernos y entrenadores certificados',
      phone: '+57 318 901 2345',
      whatsapp_number: '+57 318 901 2345',
      address: {
        street: 'Avenida 6N # 28-10',
        city: 'Cali',
        department: 'Valle del Cauca'
      },
      businessType: 'Gimnasio'
    }
  }
];

async function createDevUser(userData: DevUser) {
  console.log(`\n🔄 Creating user: ${userData.name} (${userData.email})`);
  
  try {
    // 1. Create user through Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true, // Auto-confirm for development
      user_metadata: {
        name: userData.name
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(`⚠️  User ${userData.email} already exists, skipping...`);
        return;
      }
      throw authError;
    }

    if (!authData.user) {
      throw new Error('User creation failed - no user returned');
    }

    console.log(`✅ User created: ${authData.user.id}`);

    // 2. Create business linked to user
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .insert({
        name: userData.business.name,
        description: userData.business.description,
        email: userData.email, // Use same email as user
        phone: userData.business.phone,
        whatsapp_number: userData.business.whatsapp_number,
        street: userData.business.address.street,
        city: userData.business.address.city,
        department: userData.business.address.department,
        user_id: authData.user.id, // Link to created user
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
          },
          business_type: userData.business.businessType
        }
      })
      .select()
      .single();

    if (businessError) {
      console.error(`❌ Business creation failed:`, businessError);
      // Clean up user if business creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw businessError;
    }

    console.log(`✅ Business created: ${businessData.id}`);

    // 3. Update user metadata with business_id
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      authData.user.id,
      {
        user_metadata: {
          name: userData.name,
          business_id: businessData.id
        }
      }
    );

    if (updateError) {
      console.warn(`⚠️  Failed to update user metadata:`, updateError);
    } else {
      console.log(`✅ User metadata updated with business_id`);
    }

    console.log(`🎉 Successfully created ${userData.name} with business ${userData.business.name}`);

  } catch (error) {
    console.error(`❌ Failed to create user ${userData.email}:`, error);
    throw error;
  }
}

async function seedDevUsers() {
  console.log('🌱 Starting development user seeding...');
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Supabase URL: ${supabaseUrl}`);
  
  let successCount = 0;
  let errorCount = 0;

  for (const userData of devUsers) {
    try {
      await createDevUser(userData);
      successCount++;
    } catch (error) {
      errorCount++;
      console.error(`Failed to create ${userData.email}:`, error);
    }
  }

  console.log('\n📊 Seeding Summary:');
  console.log(`✅ Successfully created: ${successCount} users`);
  console.log(`❌ Failed: ${errorCount} users`);
  
  if (errorCount === 0) {
    console.log('\n🎉 All development users created successfully!');
    console.log('\n📝 You can now login with:');
    devUsers.forEach(user => {
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log(`   Business: ${user.business.name}\n`);
    });
  }
}

// Run the seeding
seedDevUsers()
  .then(() => {
    console.log('✅ Seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });