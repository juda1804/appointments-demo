import { z } from 'zod';

// Colombian phone number validation schema
export const ColombianPhoneSchema = z
  .string()
  .min(1, 'El teléfono es requerido')
  .regex(
    /^\+57 \d{3} \d{3} \d{4}$/,
    'Formato de teléfono colombiano inválido'
  );

// Colombian address validation schema
export const ColombianAddressSchema = z.object({
  street: z
    .string()
    .min(1, 'La dirección es requerida')
    .max(255, 'La dirección es muy larga'),
  city: z
    .string()
    .min(1, 'La ciudad es requerida')
    .max(100, 'El nombre de la ciudad es muy largo'),
  department: z
    .string()
    .min(1, 'Seleccione un departamento')
    .refine(
      (dept) => [
        'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá',
        'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba',
        'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena',
        'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda',
        'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca',
        'Vaupés', 'Vichada'
      ].includes(dept),
      'Seleccione un departamento'
    )
});

// Password validation schema
export const PasswordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128, 'La contraseña es muy larga')
  .regex(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula')
  .regex(/[a-z]/, 'La contraseña debe contener al menos una letra minúscula')
  .regex(/[0-9]/, 'La contraseña debe contener al menos un número')
  .regex(/[^A-Za-z0-9]/, 'La contraseña debe contener al menos un carácter especial');

// Email validation schema for authentication
export const EmailSchema = z
  .string()
  .min(1, 'El email es requerido')
  .trim()
  .toLowerCase()
  .email('Email inválido')
  .max(255, 'El email es muy largo');

// User registration validation schema
export const UserRegistrationSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
});

// Login validation schema
export const LoginSchema = z.object({
  email: EmailSchema,
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
});

// Business registration form validation schema
export const BusinessRegistrationSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(255, 'El nombre es muy largo')
    .trim(),
  email: EmailSchema,
  phone: ColombianPhoneSchema,
  whatsapp_number: ColombianPhoneSchema,
  address: ColombianAddressSchema
});

// Type definitions
export type UserRegistrationData = z.infer<typeof UserRegistrationSchema>;
export type LoginData = z.infer<typeof LoginSchema>;
export type BusinessRegistrationData = z.infer<typeof BusinessRegistrationSchema>;
export type ColombianAddress = z.infer<typeof ColombianAddressSchema>;
export type ColombianPhone = z.infer<typeof ColombianPhoneSchema>;

// Additional validation helpers
export const validateEmail = (email: string): boolean => {
  try {
    EmailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
};

export const validatePassword = (password: string): boolean => {
  try {
    PasswordSchema.parse(password);
    return true;
  } catch {
    return false;
  }
};

export const validateBusinessEmail = (email: string): boolean => {
  try {
    EmailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
};

export const validateColombianPhone = (phone: string): boolean => {
  try {
    ColombianPhoneSchema.parse(phone);
    return true;
  } catch {
    return false;
  }
};

export const validateColombianAddress = (address: ColombianAddress): boolean => {
  try {
    ColombianAddressSchema.parse(address);
    return true;
  } catch {
    return false;
  }
};

// Error message extraction helper
export const extractValidationErrors = (error: z.ZodError): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  error.issues.forEach((err) => {
    const field = err.path.join('.');
    errors[field] = err.message;
  });
  
  return errors;
};

// Business registration form field validation (for real-time validation)
export const validateBusinessFormField = (field: string, value: unknown): { isValid: boolean; error?: string } => {
  try {
    switch (field) {
      case 'name':
        BusinessRegistrationSchema.shape.name.parse(value);
        break;
      case 'email':
        BusinessRegistrationSchema.shape.email.parse(value);
        break;
      case 'phone':
      case 'whatsapp_number':
        ColombianPhoneSchema.parse(value);
        break;
      case 'address':
        ColombianAddressSchema.parse(value);
        break;
      default:
        throw new Error('Campo desconocido');
    }
    return { isValid: true };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.issues[0]?.message || 'Error de validación';
      return { isValid: false, error: errorMessage };
    }
    return { isValid: false, error: 'Error de validación' };
  }
};