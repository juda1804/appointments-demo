// Common types used across the application
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ColombianAddress {
  street: string;
  city: string;
  department: string;
  postalCode?: string;
}

export type ColombianPhoneNumber = string; // +57 XXX XXX XXXX format