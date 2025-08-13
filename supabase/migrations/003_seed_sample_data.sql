-- Migration: Seed sample data for testing multi-tenant isolation
-- Description: Add sample Colombian businesses for testing purposes

-- Sample business 1: Bogotá beauty salon
INSERT INTO businesses (
    id,
    name,
    description,
    street,
    city,
    department,
    postal_code,
    phone,
    whatsapp_number,
    email,
    settings
) VALUES (
    '12345678-1234-5678-9abc-123456789012',
    'Salón de Belleza María',
    'Salón de belleza especializado en cortes modernos y tratamientos capilares',
    'Carrera 15 # 93-47',
    'Bogotá',
    'Bogotá D.C.',
    '110221',
    '+57 301 234 5678',
    '+57 301 234 5678',
    'contacto@salonmaria.com',
    '{
        "timezone": "America/Bogota",
        "currency": "COP",
        "businessHours": [
            {"dayOfWeek": 1, "openTime": "09:00", "closeTime": "19:00", "isOpen": true},
            {"dayOfWeek": 2, "openTime": "09:00", "closeTime": "19:00", "isOpen": true},
            {"dayOfWeek": 3, "openTime": "09:00", "closeTime": "19:00", "isOpen": true},
            {"dayOfWeek": 4, "openTime": "09:00", "closeTime": "19:00", "isOpen": true},
            {"dayOfWeek": 5, "openTime": "09:00", "closeTime": "19:00", "isOpen": true},
            {"dayOfWeek": 6, "openTime": "08:00", "closeTime": "17:00", "isOpen": true},
            {"dayOfWeek": 0, "openTime": "10:00", "closeTime": "15:00", "isOpen": false}
        ],
        "services": ["Corte", "Peinado", "Tinte", "Tratamientos"],
        "priceRange": "50000-150000"
    }'::JSONB
);

-- Sample business 2: Medellín dental clinic
INSERT INTO businesses (
    id,
    name,
    description,
    street,
    city,
    department,
    postal_code,
    phone,
    whatsapp_number,
    email,
    settings
) VALUES (
    '23456789-2345-6789-abcd-234567890123',
    'Clínica Dental Sonrisas',
    'Clínica dental integral con tecnología de punta y atención personalizada',
    'Calle 70 # 52-20',
    'Medellín',
    'Antioquia',
    '050010',
    '+57 314 567 8901',
    '+57 314 567 8901',
    'citas@clinicasonrisas.com',
    '{
        "timezone": "America/Bogota",
        "currency": "COP",
        "businessHours": [
            {"dayOfWeek": 1, "openTime": "07:00", "closeTime": "17:00", "isOpen": true},
            {"dayOfWeek": 2, "openTime": "07:00", "closeTime": "17:00", "isOpen": true},
            {"dayOfWeek": 3, "openTime": "07:00", "closeTime": "17:00", "isOpen": true},
            {"dayOfWeek": 4, "openTime": "07:00", "closeTime": "17:00", "isOpen": true},
            {"dayOfWeek": 5, "openTime": "07:00", "closeTime": "17:00", "isOpen": true},
            {"dayOfWeek": 6, "openTime": "08:00", "closeTime": "12:00", "isOpen": true},
            {"dayOfWeek": 0, "openTime": "08:00", "closeTime": "12:00", "isOpen": false}
        ],
        "services": ["Limpieza", "Ortodoncia", "Implantes", "Endodoncia"],
        "priceRange": "80000-500000"
    }'::JSONB
);

-- Sample business 3: Cali fitness center
INSERT INTO businesses (
    id,
    name,
    description,
    street,
    city,
    department,
    postal_code,
    phone,
    email,
    settings
) VALUES (
    '34567890-3456-7890-bcde-345678901234',
    'Gimnasio FitLife',
    'Centro de acondicionamiento físico con equipos modernos y entrenadores certificados',
    'Avenida 6N # 28-10',
    'Cali',
    'Valle del Cauca',
    '760001',
    '+57 318 901 2345',
    'info@fitlifecali.com',
    '{
        "timezone": "America/Bogota",
        "currency": "COP",
        "businessHours": [
            {"dayOfWeek": 1, "openTime": "05:00", "closeTime": "22:00", "isOpen": true},
            {"dayOfWeek": 2, "openTime": "05:00", "closeTime": "22:00", "isOpen": true},
            {"dayOfWeek": 3, "openTime": "05:00", "closeTime": "22:00", "isOpen": true},
            {"dayOfWeek": 4, "openTime": "05:00", "closeTime": "22:00", "isOpen": true},
            {"dayOfWeek": 5, "openTime": "05:00", "closeTime": "22:00", "isOpen": true},
            {"dayOfWeek": 6, "openTime": "06:00", "closeTime": "20:00", "isOpen": true},
            {"dayOfWeek": 0, "openTime": "08:00", "closeTime": "18:00", "isOpen": true}
        ],
        "services": ["Entrenamiento Personal", "Clases Grupales", "Nutrición"],
        "priceRange": "120000-300000"
    }'::JSONB
);

-- Add comments
COMMENT ON COLUMN businesses.settings IS 'Extended with sample Colombian service pricing and business-specific data';