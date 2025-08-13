/**
 * Tests for Colombian departments and geographical utilities
 */

import {
  COLOMBIAN_DEPARTMENTS,
  MAJOR_CITIES_BY_DEPARTMENT,
  DEPARTMENTS_BY_REGION,
  isValidColombianDepartment,
  getCitiesByDepartment,
  findDepartmentByCity,
  validateColombianAddress,
  getRegionByDepartment,
  type ColombianDepartment,
  type ColombianRegion
} from './departments';

describe('Colombian Departments Utilities', () => {
  describe('COLOMBIAN_DEPARTMENTS constant', () => {
    test('should contain all 32 departments plus Bogotá D.C.', () => {
      expect(COLOMBIAN_DEPARTMENTS).toHaveLength(33);
    });

    test('should include major departments', () => {
      expect(COLOMBIAN_DEPARTMENTS).toContain('Antioquia');
      expect(COLOMBIAN_DEPARTMENTS).toContain('Cundinamarca');
      expect(COLOMBIAN_DEPARTMENTS).toContain('Valle del Cauca');
      expect(COLOMBIAN_DEPARTMENTS).toContain('Atlántico');
      expect(COLOMBIAN_DEPARTMENTS).toContain('Bogotá D.C.');
    });

    test('should be sorted alphabetically', () => {
      const sorted = [...COLOMBIAN_DEPARTMENTS].sort((a, b) => 
        a.localeCompare(b, 'es', { sensitivity: 'accent' })
      );
      expect(COLOMBIAN_DEPARTMENTS).toEqual(sorted);
    });

    test('should not contain duplicates', () => {
      const unique = [...new Set(COLOMBIAN_DEPARTMENTS)];
      expect(COLOMBIAN_DEPARTMENTS).toHaveLength(unique.length);
    });
  });

  describe('MAJOR_CITIES_BY_DEPARTMENT', () => {
    test('should have cities for each department', () => {
      COLOMBIAN_DEPARTMENTS.forEach(department => {
        expect(MAJOR_CITIES_BY_DEPARTMENT[department]).toBeDefined();
        expect(Array.isArray(MAJOR_CITIES_BY_DEPARTMENT[department])).toBe(true);
        expect(MAJOR_CITIES_BY_DEPARTMENT[department].length).toBeGreaterThan(0);
      });
    });

    test('should include major cities', () => {
      expect(MAJOR_CITIES_BY_DEPARTMENT['Antioquia']).toContain('Medellín');
      expect(MAJOR_CITIES_BY_DEPARTMENT['Valle del Cauca']).toContain('Cali');
      expect(MAJOR_CITIES_BY_DEPARTMENT['Atlántico']).toContain('Barranquilla');
      expect(MAJOR_CITIES_BY_DEPARTMENT['Bogotá D.C.']).toContain('Bogotá');
      expect(MAJOR_CITIES_BY_DEPARTMENT['Santander']).toContain('Bucaramanga');
    });

    test('should not have empty city arrays', () => {
      Object.values(MAJOR_CITIES_BY_DEPARTMENT).forEach(cities => {
        expect(cities.length).toBeGreaterThan(0);
      });
    });
  });

  describe('DEPARTMENTS_BY_REGION', () => {
    test('should contain all expected regions', () => {
      expect(DEPARTMENTS_BY_REGION.ANDINA).toBeDefined();
      expect(DEPARTMENTS_BY_REGION.CARIBE).toBeDefined();
      expect(DEPARTMENTS_BY_REGION.PACIFICA).toBeDefined();
      expect(DEPARTMENTS_BY_REGION.ORINOQUIA).toBeDefined();
      expect(DEPARTMENTS_BY_REGION.AMAZONIA).toBeDefined();
      expect(DEPARTMENTS_BY_REGION.CAPITAL).toBeDefined();
    });

    test('should include major departments in correct regions', () => {
      expect(DEPARTMENTS_BY_REGION.ANDINA).toContain('Antioquia');
      expect(DEPARTMENTS_BY_REGION.CARIBE).toContain('Atlántico');
      expect(DEPARTMENTS_BY_REGION.PACIFICA).toContain('Valle del Cauca');
      expect(DEPARTMENTS_BY_REGION.CAPITAL).toContain('Bogotá D.C.');
    });

    test('should account for all departments across all regions', () => {
      const allDepartmentsInRegions = Object.values(DEPARTMENTS_BY_REGION).flat();
      expect(allDepartmentsInRegions).toHaveLength(33);
      
      // Check that every department is in exactly one region
      COLOMBIAN_DEPARTMENTS.forEach(department => {
        const regionsContaining = Object.values(DEPARTMENTS_BY_REGION)
          .filter(regionDepts => regionDepts.includes(department));
        expect(regionsContaining).toHaveLength(1);
      });
    });
  });

  describe('isValidColombianDepartment', () => {
    test('should validate correct department names', () => {
      expect(isValidColombianDepartment('Antioquia')).toBe(true);
      expect(isValidColombianDepartment('Valle del Cauca')).toBe(true);
      expect(isValidColombianDepartment('Bogotá D.C.')).toBe(true);
      expect(isValidColombianDepartment('San Andrés y Providencia')).toBe(true);
    });

    test('should reject invalid department names', () => {
      expect(isValidColombianDepartment('InvalidDepartment')).toBe(false);
      expect(isValidColombianDepartment('Texas')).toBe(false);
      expect(isValidColombianDepartment('')).toBe(false);
      expect(isValidColombianDepartment('antioquia')).toBe(false); // Case sensitive
    });

    test('should handle edge cases', () => {
      expect(isValidColombianDepartment(' Antioquia ')).toBe(false); // Whitespace
      expect(isValidColombianDepartment('Antioquía')).toBe(false); // Wrong accent
    });
  });

  describe('getCitiesByDepartment', () => {
    test('should return cities for valid departments', () => {
      const antioquiaCities = getCitiesByDepartment('Antioquia');
      expect(antioquiaCities).toContain('Medellín');
      expect(antioquiaCities.length).toBeGreaterThan(1);

      const valleCities = getCitiesByDepartment('Valle del Cauca');
      expect(valleCities).toContain('Cali');
      expect(valleCities).toContain('Palmira');
    });

    test('should return empty array for invalid departments', () => {
      const cities = getCitiesByDepartment('InvalidDepartment' as ColombianDepartment);
      expect(cities).toEqual([]);
    });

    test('should return arrays with at least one city per department', () => {
      COLOMBIAN_DEPARTMENTS.forEach(department => {
        const cities = getCitiesByDepartment(department);
        expect(cities.length).toBeGreaterThan(0);
      });
    });
  });

  describe('findDepartmentByCity', () => {
    test('should find correct department for major cities', () => {
      expect(findDepartmentByCity('Medellín')).toBe('Antioquia');
      expect(findDepartmentByCity('Cali')).toBe('Valle del Cauca');
      expect(findDepartmentByCity('Barranquilla')).toBe('Atlántico');
      expect(findDepartmentByCity('Bogotá')).toBe('Bogotá D.C.');
      expect(findDepartmentByCity('Bucaramanga')).toBe('Santander');
    });

    test('should return null for invalid cities', () => {
      expect(findDepartmentByCity('InvalidCity')).toBeNull();
      expect(findDepartmentByCity('New York')).toBeNull();
      expect(findDepartmentByCity('')).toBeNull();
    });

    test('should be case sensitive', () => {
      expect(findDepartmentByCity('medellín')).toBeNull(); // lowercase
      expect(findDepartmentByCity('MEDELLÍN')).toBeNull(); // uppercase
    });
  });

  describe('validateColombianAddress', () => {
    test('should validate correct department-city combinations', () => {
      expect(validateColombianAddress('Antioquia', 'Medellín')).toBe(true);
      expect(validateColombianAddress('Valle del Cauca', 'Cali')).toBe(true);
      expect(validateColombianAddress('Atlántico', 'Barranquilla')).toBe(true);
      expect(validateColombianAddress('Bogotá D.C.', 'Bogotá')).toBe(true);
    });

    test('should reject invalid department names', () => {
      expect(validateColombianAddress('InvalidDepartment', 'Medellín')).toBe(false);
      expect(validateColombianAddress('', 'Cali')).toBe(false);
    });

    test('should reject cities not in the specified department', () => {
      expect(validateColombianAddress('Antioquia', 'Cali')).toBe(false); // Cali is in Valle del Cauca
      expect(validateColombianAddress('Valle del Cauca', 'Medellín')).toBe(false); // Medellín is in Antioquia
    });

    test('should reject invalid city names', () => {
      expect(validateColombianAddress('Antioquia', 'InvalidCity')).toBe(false);
      expect(validateColombianAddress('Valle del Cauca', '')).toBe(false);
    });
  });

  describe('getRegionByDepartment', () => {
    test('should return correct regions for departments', () => {
      expect(getRegionByDepartment('Antioquia')).toBe('ANDINA');
      expect(getRegionByDepartment('Atlántico')).toBe('CARIBE');
      expect(getRegionByDepartment('Valle del Cauca')).toBe('PACIFICA');
      expect(getRegionByDepartment('Meta')).toBe('ORINOQUIA');
      expect(getRegionByDepartment('Amazonas')).toBe('AMAZONIA');
      expect(getRegionByDepartment('Bogotá D.C.')).toBe('CAPITAL');
    });

    test('should return null for invalid departments', () => {
      expect(getRegionByDepartment('InvalidDepartment' as ColombianDepartment)).toBeNull();
    });

    test('should handle all valid departments', () => {
      COLOMBIAN_DEPARTMENTS.forEach(department => {
        const region = getRegionByDepartment(department);
        expect(region).toBeDefined();
        expect(Object.keys(DEPARTMENTS_BY_REGION)).toContain(region!);
      });
    });
  });

  describe('data integrity and consistency', () => {
    test('should have consistent data between constants', () => {
      // Every department in COLOMBIAN_DEPARTMENTS should have cities
      COLOMBIAN_DEPARTMENTS.forEach(department => {
        expect(MAJOR_CITIES_BY_DEPARTMENT[department]).toBeDefined();
      });

      // Every department with cities should be in COLOMBIAN_DEPARTMENTS
      Object.keys(MAJOR_CITIES_BY_DEPARTMENT).forEach(department => {
        expect(COLOMBIAN_DEPARTMENTS).toContain(department as ColombianDepartment);
      });
    });

    test('should not have duplicate cities across different departments', () => {
      const allCities: string[] = [];
      const duplicates: string[] = [];

      Object.entries(MAJOR_CITIES_BY_DEPARTMENT).forEach(([department, cities]) => {
        cities.forEach(city => {
          if (allCities.includes(city)) {
            duplicates.push(city);
          } else {
            allCities.push(city);
          }
        });
      });

      // Allow some known duplicates (like Girardot which exists in multiple departments)
      const allowedDuplicates = ['Girardot']; // Girardot exists in both Cundinamarca and Tolima
      const unexpectedDuplicates = duplicates.filter(city => !allowedDuplicates.includes(city));
      
      expect(unexpectedDuplicates).toEqual([]);
    });

    test('should have proper Spanish accents and capitalization', () => {
      // Check for common accent patterns
      expect(COLOMBIAN_DEPARTMENTS).toContain('Atlántico'); // With accent
      expect(COLOMBIAN_DEPARTMENTS).toContain('Nariño'); // With ñ
      expect(COLOMBIAN_DEPARTMENTS).toContain('Quindío'); // With accent
      expect(COLOMBIAN_DEPARTMENTS).toContain('Bogotá D.C.'); // Capital district format

      // Should not contain lowercase versions
      expect(COLOMBIAN_DEPARTMENTS).not.toContain('atlántico');
      expect(COLOMBIAN_DEPARTMENTS).not.toContain('narino');
    });
  });
});