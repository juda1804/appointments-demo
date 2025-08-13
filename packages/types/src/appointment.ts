import { BaseEntity, ColombianPhoneNumber } from './common';

export interface Appointment extends BaseEntity {
  businessId: string;
  customerName: string;
  customerPhone: ColombianPhoneNumber;
  customerEmail?: string;
  serviceType: string;
  scheduledAt: Date;
  duration: number; // minutes
  status: AppointmentStatus;
  notes?: string;
}

export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show'
}