/**
 * Colombian departments and geographical data
 * Complete list of all Colombian departments for address validation
 */

/**
 * All 32 departments plus Bogotá D.C. (Capital District)
 * Ordered alphabetically for easy reference
 */
export const COLOMBIAN_DEPARTMENTS = [
  'Amazonas',
  'Antioquia', 
  'Arauca',
  'Atlántico',
  'Bogotá D.C.', // Capital District
  'Bolívar',
  'Boyacá',
  'Caldas',
  'Caquetá',
  'Casanare',
  'Cauca',
  'Cesar',
  'Chocó',
  'Córdoba',
  'Cundinamarca',
  'Guainía',
  'Guaviare',
  'Huila',
  'La Guajira',
  'Magdalena',
  'Meta',
  'Nariño',
  'Norte de Santander',
  'Putumayo',
  'Quindío',
  'Risaralda',
  'San Andrés y Providencia',
  'Santander',
  'Sucre',
  'Tolima',
  'Valle del Cauca',
  'Vaupés',
  'Vichada'
] as const;

/**
 * Type for Colombian departments
 */
export type ColombianDepartment = typeof COLOMBIAN_DEPARTMENTS[number];

/**
 * Major cities by department for enhanced address validation
 */
export const MAJOR_CITIES_BY_DEPARTMENT: Record<ColombianDepartment, string[]> = {
  'Amazonas': ['Leticia', 'Puerto Nariño'],
  'Antioquia': ['Medellín', 'Bello', 'Itagüí', 'Envigado', 'Apartadó', 'Turbo', 'Rionegro'],
  'Arauca': ['Arauca', 'Saravena', 'Tame'],
  'Atlántico': ['Barranquilla', 'Soledad', 'Malambo', 'Sabanagrande'],
  'Bogotá D.C.': ['Bogotá'],
  'Bolívar': ['Cartagena', 'Magangué', 'Turbaco', 'Arjona'],
  'Boyacá': ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá'],
  'Caldas': ['Manizales', 'Chinchiná', 'La Dorada', 'Riosucio'],
  'Caquetá': ['Florencia', 'San Vicente del Caguán', 'Puerto Rico'],
  'Casanare': ['Yopal', 'Aguazul', 'Villanueva', 'Monterrey'],
  'Cauca': ['Popayán', 'Santander de Quilichao', 'Puerto Tejada', 'Guapi'],
  'Cesar': ['Valledupar', 'Aguachica', 'Bosconia', 'Codazzi'],
  'Chocó': ['Quibdó', 'Istmina', 'Condoto', 'Tadó'],
  'Córdoba': ['Montería', 'Cereté', 'Lorica', 'Sahagún'],
  'Cundinamarca': ['Soacha', 'Girardot', 'Zipaquirá', 'Chía', 'Facatativá', 'Fusagasugá'],
  'Guainía': ['Inírida'],
  'Guaviare': ['San José del Guaviare', 'Calamar'],
  'Huila': ['Neiva', 'Pitalito', 'Garzón', 'La Plata'],
  'La Guajira': ['Riohacha', 'Maicao', 'San Juan del Cesar', 'Fonseca'],
  'Magdalena': ['Santa Marta', 'Ciénaga', 'Fundación', 'El Banco'],
  'Meta': ['Villavicencio', 'Acacías', 'Granada', 'Puerto López'],
  'Nariño': ['Pasto', 'Tumaco', 'Ipiales', 'Túquerres'],
  'Norte de Santander': ['Cúcuta', 'Ocaña', 'Pamplona', 'Villa del Rosario'],
  'Putumayo': ['Mocoa', 'Puerto Asís', 'Orito', 'Sibundoy'],
  'Quindío': ['Armenia', 'Calarcá', 'La Tebaida', 'Montenegro'],
  'Risaralda': ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia'],
  'San Andrés y Providencia': ['San Andrés', 'Providencia'],
  'Santander': ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja'],
  'Sucre': ['Sincelejo', 'Corozal', 'Sampués', 'San Marcos'],
  'Tolima': ['Ibagué', 'Espinal', 'Girardot', 'Melgar'],
  'Valle del Cauca': ['Cali', 'Palmira', 'Buenaventura', 'Tuluá', 'Cartago', 'Buga'],
  'Vaupés': ['Mitú'],
  'Vichada': ['Puerto Carreño', 'La Primavera']
};

/**
 * Validates if a department name is a valid Colombian department
 * @param department - Department name to validate
 * @returns true if valid Colombian department
 */
export function isValidColombianDepartment(department: string): department is ColombianDepartment {
  return COLOMBIAN_DEPARTMENTS.includes(department as ColombianDepartment);
}

/**
 * Gets all cities for a given department
 * @param department - Colombian department
 * @returns Array of cities or empty array if department not found
 */
export function getCitiesByDepartment(department: ColombianDepartment): string[] {
  return MAJOR_CITIES_BY_DEPARTMENT[department] || [];
}

/**
 * Finds the department for a given city (first match)
 * @param city - City name
 * @returns Department name or null if city not found
 */
export function findDepartmentByCity(city: string): ColombianDepartment | null {
  for (const [department, cities] of Object.entries(MAJOR_CITIES_BY_DEPARTMENT)) {
    if (cities.includes(city)) {
      return department as ColombianDepartment;
    }
  }
  return null;
}

/**
 * Validates a Colombian address by checking department and city combination
 * @param department - Department name
 * @param city - City name
 * @returns true if valid combination
 */
export function validateColombianAddress(department: string, city: string): boolean {
  if (!isValidColombianDepartment(department)) {
    return false;
  }

  const validCities = getCitiesByDepartment(department);
  return validCities.includes(city);
}

/**
 * Gets departments by region for organizational purposes
 */
export const DEPARTMENTS_BY_REGION = {
  ANDINA: [
    'Antioquia', 'Boyacá', 'Caldas', 'Cundinamarca', 'Huila', 
    'Norte de Santander', 'Quindío', 'Risaralda', 'Santander', 'Tolima'
  ],
  CARIBE: [
    'Atlántico', 'Bolívar', 'Cesar', 'Córdoba', 'La Guajira', 
    'Magdalena', 'San Andrés y Providencia', 'Sucre'
  ],
  PACIFICA: ['Cauca', 'Chocó', 'Nariño', 'Valle del Cauca'],
  ORINOQUIA: ['Arauca', 'Casanare', 'Meta', 'Vichada'],
  AMAZONIA: ['Amazonas', 'Caquetá', 'Guainía', 'Guaviare', 'Putumayo', 'Vaupés'],
  CAPITAL: ['Bogotá D.C.']
} as const;

/**
 * Type for Colombian regions
 */
export type ColombianRegion = keyof typeof DEPARTMENTS_BY_REGION;

/**
 * Gets the region for a given department
 * @param department - Colombian department
 * @returns Region name or null if not found
 */
export function getRegionByDepartment(department: ColombianDepartment): ColombianRegion | null {
  for (const [region, departments] of Object.entries(DEPARTMENTS_BY_REGION)) {
    if ((departments as readonly ColombianDepartment[]).includes(department)) {
      return region as ColombianRegion;
    }
  }
  return null;
}