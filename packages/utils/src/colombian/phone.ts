/**
 * Colombian phone number utilities
 * Handles formatting and validation of Colombian phone numbers
 */

// Colombian phone number regex pattern: +57 XXX XXX XXXX
const COLOMBIAN_PHONE_REGEX = /^\+57 [0-9]{3} [0-9]{3} [0-9]{4}$/;
const DIGITS_ONLY_REGEX = /^\d{10}$/;

/**
 * Formats a Colombian phone number to the standard format: +57 XXX XXX XXXX
 * @param phone - Phone number string (can be various formats)
 * @returns Formatted phone number or null if invalid
 */
export function formatColombianPhone(phone: string): string | null {
  if (!phone) return null;

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');

  // Handle different input formats
  let cleanDigits: string;

  if (digitsOnly.length === 10) {
    // Local format: 3012345678
    cleanDigits = digitsOnly;
  } else if (digitsOnly.length === 12 && digitsOnly.startsWith('57')) {
    // International format without +: 573012345678
    cleanDigits = digitsOnly.substring(2);
  } else if (digitsOnly.length === 14 && digitsOnly.startsWith('0557')) {
    // International format with leading zero: 05573012345678
    cleanDigits = digitsOnly.substring(4);
  } else {
    // Invalid length
    return null;
  }

  // Validate that we have exactly 10 digits
  if (!DIGITS_ONLY_REGEX.test(cleanDigits)) {
    return null;
  }

  // Validate Colombian mobile prefixes (301-305, 310-321, 350-353)
  const prefix = cleanDigits.substring(0, 3);
  if (!isValidColombianPrefix(prefix)) {
    return null;
  }

  // Format as +57 XXX XXX XXXX
  return `+57 ${cleanDigits.substring(0, 3)} ${cleanDigits.substring(3, 6)} ${cleanDigits.substring(6)}`;
}

/**
 * Validates if a Colombian phone number is in the correct format
 * @param phone - Phone number to validate
 * @returns true if valid, false otherwise
 */
export function validateColombianPhone(phone: string): boolean {
  if (!phone) return false;
  
  // First check if it matches the exact format
  if (COLOMBIAN_PHONE_REGEX.test(phone)) {
    // Extract the 3-digit prefix for additional validation
    const prefix = phone.substring(4, 7); // Skip '+57 ' to get first 3 digits
    return isValidColombianPrefix(prefix);
  }

  return false;
}

/**
 * Validates Colombian mobile phone prefixes
 * @param prefix - 3-digit prefix
 * @returns true if valid Colombian mobile prefix
 */
function isValidColombianPrefix(prefix: string): boolean {
  const prefixNum = parseInt(prefix, 10);
  
  return (
    // 301-305 (Comcel/Tigo)
    (prefixNum >= 301 && prefixNum <= 305) ||
    // 310-321 (Movistar/Claro)
    (prefixNum >= 310 && prefixNum <= 321) ||
    // 350-353 (Avantel)
    (prefixNum >= 350 && prefixNum <= 353)
  );
}

/**
 * Extracts just the mobile number without country code
 * @param phone - Formatted Colombian phone number
 * @returns 10-digit mobile number or null
 */
export function getColombianMobileNumber(phone: string): string | null {
  if (!validateColombianPhone(phone)) {
    return null;
  }

  // Extract digits after +57 and spaces
  return phone.replace(/\+57\s/g, '').replace(/\s/g, '');
}

/**
 * Formats a phone number for display (with or without country code)
 * @param phone - Phone number string
 * @param includeCountryCode - Whether to include +57
 * @returns Formatted display string or null
 */
export function formatPhoneForDisplay(phone: string, includeCountryCode: boolean = true): string | null {
  const formatted = formatColombianPhone(phone);
  
  if (!formatted) return null;

  if (includeCountryCode) {
    return formatted;
  }

  // Remove +57 and format as XXX XXX XXXX
  const digits = getColombianMobileNumber(formatted);
  if (!digits) return null;

  return `${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`;
}