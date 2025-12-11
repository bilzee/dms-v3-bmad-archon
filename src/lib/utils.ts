import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number with appropriate abbreviations and comma separators
 * @param value - The number to format
 * @param options - Formatting options
 * @returns Formatted string
 */
export function formatNumber(
  value: number | string | null | undefined,
  options: {
    useAbbreviation?: boolean;
    decimalPlaces?: number;
    locale?: string;
  } = {}
): string {
  const {
    useAbbreviation = true,
    decimalPlaces = 1,
    locale = 'en-US'
  } = options;

  // Handle null, undefined, or non-numeric values
  if (value == null || value === '') return 'N/A';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'N/A';

  // For very small numbers or zero
  if (num === 0) return '0';
  if (Math.abs(num) < 1 && Math.abs(num) > 0) {
    return num.toFixed(2);
  }

  if (useAbbreviation) {
    // Use abbreviations for large numbers
    const absNum = Math.abs(num);
    
    if (absNum >= 1_000_000_000) {
      return (num / 1_000_000_000).toFixed(decimalPlaces) + 'B';
    } else if (absNum >= 1_000_000) {
      return (num / 1_000_000).toFixed(decimalPlaces) + 'M';
    } else if (absNum >= 1_000) {
      return (num / 1_000).toFixed(decimalPlaces) + 'K';
    }
  }

  // Use browser's built-in number formatting with commas
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * Format an array value for display, handling different data types
 * @param value - The array or other value to format
 * @returns Formatted string
 */
export function formatArrayValue(value: any): string {
  if (value == null) return 'N/A';
  
  if (Array.isArray(value)) {
    if (value.length === 0) return 'None';
    
    // Clean up array items and join them
    const cleanedItems = value
      .map(item => {
        if (typeof item === 'string') {
          // Remove quotes and clean up string values
          return item.replace(/['"]/g, '').trim();
        }
        return String(item);
      })
      .filter(item => item && item !== 'null' && item !== 'undefined');
    
    return cleanedItems.join(', ');
  }
  
  // Handle object values
  if (typeof value === 'object') {
    return JSON.stringify(value).replace(/[{}"]/g, '').replace(/:/g, ': ').replace(/,/g, ', ');
  }
  
  // Handle string values that look like arrays
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return formatArrayValue(parsed);
      }
    } catch {
      // If it's not JSON, clean up the string
      return value.replace(/[\[\]"']/g, '').trim();
    }
  }
  
  return String(value);
}