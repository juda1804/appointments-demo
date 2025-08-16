import { BaseEntity, ColombianAddress, ColombianPhoneNumber } from './common';

export interface Business extends BaseEntity {
  name: string;
  description?: string;
  address: ColombianAddress;
  phone: ColombianPhoneNumber;
  whatsappNumber?: ColombianPhoneNumber;
  email: string;
  settings: BusinessSettings;
}

export interface BusinessSettings {
  timezone: string; // 'America/Bogota'
  currency: string; // 'COP'
  businessHours: BusinessHours[];
  [key: string]: unknown; // Allow additional settings
}

export interface BusinessHours {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  openTime: string; // HH:MM format
  closeTime: string; // HH:MM format
  isOpen: boolean;
}