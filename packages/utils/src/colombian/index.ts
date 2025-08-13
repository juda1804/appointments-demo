/**
 * Colombian market utilities for appointments system
 * Exports all Colombian-specific functions and constants
 */

// Phone number utilities
export {
  formatColombianPhone,
  validateColombianPhone,
  getColombianMobileNumber,
  formatPhoneForDisplay
} from './phone';

// Currency utilities  
export {
  formatPesoCOP,
  formatPesoShort,
  parsePesoString,
  isValidPesoString,
  formatPesoForInput,
  COMMON_PESO_AMOUNTS,
  type CurrencyFormatOptions,
  type ShortFormatOptions
} from './currency';

// Departments and geographical utilities
export {
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

// Holiday calendar utilities
export {
  type ColombianHoliday,
  type HolidayType,
  getColombianHolidays,
  isColombianHoliday,
  getNextHoliday,
  isWorkingDay
} from './holidays';