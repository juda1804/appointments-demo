/**
 * Colombian peso (COP) currency formatting utilities
 * Handles proper formatting of Colombian pesos with locale support
 */

/**
 * Formats an amount in Colombian pesos using proper locale formatting
 * @param amount - Numeric amount in pesos
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatPesoCOP(
  amount: number,
  options: CurrencyFormatOptions = {}
): string {
  const {
    showDecimals = false,
    showSymbol = true,
    useShortFormat = false,
    locale = 'es-CO'
  } = options;

  // Handle large amounts with K/M notation if requested
  if (useShortFormat) {
    return formatPesoShort(amount, { showSymbol, locale });
  }

  // Use Intl.NumberFormat for proper Colombian locale formatting
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });

  let formatted = formatter.format(amount);

  // Remove currency symbol if not requested
  if (!showSymbol) {
    // Remove COP and $ symbols, keeping the formatted number
    formatted = formatted.replace(/COP|COL\$|\$/, '').trim();
  }

  return formatted;
}

/**
 * Formats large peso amounts with K/M notation
 * @param amount - Numeric amount in pesos
 * @param options - Short format options
 * @returns Formatted currency string with K/M notation
 */
export function formatPesoShort(
  amount: number,
  options: ShortFormatOptions = {}
): string {
  const { showSymbol = true, locale = 'es-CO' } = options;

  let value: number;
  let suffix: string;

  if (amount >= 1_000_000_000) {
    value = amount / 1_000_000_000;
    suffix = 'B';
  } else if (amount >= 1_000_000) {
    value = amount / 1_000_000;
    suffix = 'M';
  } else if (amount >= 1_000) {
    value = amount / 1_000;
    suffix = 'K';
  } else {
    return formatPesoCOP(amount, { showSymbol, locale });
  }

  // Format the shortened value
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: value < 10 ? 1 : 0,
  });

  const formattedValue = formatter.format(value);
  const currencySymbol = showSymbol ? '$ ' : '';

  return `${currencySymbol}${formattedValue}${suffix}`;
}

/**
 * Parses a Colombian peso string back to a numeric amount
 * @param pesoString - Formatted peso string
 * @returns Numeric amount or null if invalid
 */
export function parsePesoString(pesoString: string): number | null {
  if (!pesoString) return null;

  // Remove currency symbols and extra spaces
  let cleanString = pesoString
    .replace(/COP|COL\$|\$|peso|pesos/gi, '')
    .replace(/\s+/g, '')
    .trim();

  // Handle short format (K, M, B)
  const shortFormatMatch = cleanString.match(/^([\d,.]+)([KMB])$/i);
  if (shortFormatMatch) {
    const value = parseFloat(shortFormatMatch[1].replace(/,/g, '.'));
    const multiplier = getMultiplier(shortFormatMatch[2].toUpperCase());
    return value * multiplier;
  }

  // Handle regular format with Colombian thousand separators
  // Colombian format uses . for thousands and , for decimals
  const parts = cleanString.split(',');
  
  if (parts.length === 1) {
    // No decimal part, just remove thousand separators (dots)
    const integerPart = parts[0].replace(/\./g, '');
    return parseInt(integerPart, 10) || null;
  } else if (parts.length === 2) {
    // Has decimal part
    const integerPart = parts[0].replace(/\./g, '');
    const decimalPart = parts[1];
    const numberString = `${integerPart}.${decimalPart}`;
    return parseFloat(numberString) || null;
  }

  return null;
}

/**
 * Gets the multiplier for short format suffixes
 */
function getMultiplier(suffix: string): number {
  switch (suffix) {
    case 'K': return 1_000;
    case 'M': return 1_000_000;
    case 'B': return 1_000_000_000;
    default: return 1;
  }
}

/**
 * Validates if a string represents a valid peso amount
 * @param pesoString - String to validate
 * @returns true if valid peso format
 */
export function isValidPesoString(pesoString: string): boolean {
  return parsePesoString(pesoString) !== null;
}

/**
 * Formats peso amount for input fields (no currency symbols)
 * @param amount - Numeric amount
 * @returns Formatted string suitable for input fields
 */
export function formatPesoForInput(amount: number): string {
  return formatPesoCOP(amount, {
    showSymbol: false,
    showDecimals: false,
    locale: 'es-CO'
  });
}

// Type definitions
export interface CurrencyFormatOptions {
  showDecimals?: boolean;
  showSymbol?: boolean;
  useShortFormat?: boolean;
  locale?: string;
}

export interface ShortFormatOptions {
  showSymbol?: boolean;
  locale?: string;
}

// Common Colombian peso amounts for reference
export const COMMON_PESO_AMOUNTS = {
  MINIMUM_WAGE_2025: 1_400_000, // Approximate Colombian minimum wage
  TYPICAL_SERVICE_RANGE: {
    MIN: 50_000,
    MAX: 500_000
  },
  EXPENSIVE_SERVICE_THRESHOLD: 1_000_000
} as const;