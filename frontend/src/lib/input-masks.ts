/**
 * Input masking utilities for Indian business forms
 * Provides formatting and masking for phone numbers, GSTIN, PAN, IFSC, etc.
 */

// Phone number mask: +91 XXXXX XXXXX
export const phoneMask = (value: string): string => {
  // Remove all non-numeric characters
  const numbers = value.replace(/\D/g, '');
  
  // Limit to 10 digits (Indian mobile number)
  const limitedNumbers = numbers.slice(0, 10);
  
  // Apply formatting
  if (limitedNumbers.length <= 5) {
    return limitedNumbers;
  } else if (limitedNumbers.length <= 10) {
    return `${limitedNumbers.slice(0, 5)} ${limitedNumbers.slice(5)}`;
  }
  
  return limitedNumbers;
};

// GSTIN mask: XX XXXXX XXXX XAX ZXXX
export const gstinMask = (value: string): string => {
  // Remove all non-alphanumeric characters and convert to uppercase
  const alphanumeric = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  // Limit to 15 characters
  const limited = alphanumeric.slice(0, 15);
  
  // Apply GSTIN formatting
  if (limited.length <= 2) {
    return limited;
  } else if (limited.length <= 7) {
    return `${limited.slice(0, 2)} ${limited.slice(2)}`;
  } else if (limited.length <= 11) {
    return `${limited.slice(0, 2)} ${limited.slice(2, 7)} ${limited.slice(7)}`;
  } else if (limited.length <= 12) {
    return `${limited.slice(0, 2)} ${limited.slice(2, 7)} ${limited.slice(7, 11)} ${limited.slice(11)}`;
  } else if (limited.length <= 14) {
    return `${limited.slice(0, 2)} ${limited.slice(2, 7)} ${limited.slice(7, 11)} ${limited.slice(11, 12)} ${limited.slice(12)}`;
  } else {
    return `${limited.slice(0, 2)} ${limited.slice(2, 7)} ${limited.slice(7, 11)} ${limited.slice(11, 12)} ${limited.slice(12, 14)} ${limited.slice(14)}`;
  }
};

// PAN mask: XXXXX XXXX X
export const panMask = (value: string): string => {
  // Remove all non-alphanumeric characters and convert to uppercase
  const alphanumeric = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  // Limit to 10 characters
  const limited = alphanumeric.slice(0, 10);
  
  // Apply PAN formatting
  if (limited.length <= 5) {
    return limited;
  } else if (limited.length <= 9) {
    return `${limited.slice(0, 5)} ${limited.slice(5)}`;
  } else {
    return `${limited.slice(0, 5)} ${limited.slice(5, 9)} ${limited.slice(9)}`;
  }
};

// IFSC mask: XXXX XXXXXXX
export const ifscMask = (value: string): string => {
  // Remove all non-alphanumeric characters and convert to uppercase
  const alphanumeric = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  // Limit to 11 characters
  const limited = alphanumeric.slice(0, 11);
  
  // Apply IFSC formatting
  if (limited.length <= 4) {
    return limited;
  } else {
    return `${limited.slice(0, 4)} ${limited.slice(4)}`;
  }
};

// Pincode mask: XXX XXX
export const pincodeMask = (value: string): string => {
  // Remove all non-numeric characters
  const numbers = value.replace(/\D/g, '');
  
  // Limit to 6 digits
  const limited = numbers.slice(0, 6);
  
  // Apply pincode formatting
  if (limited.length <= 3) {
    return limited;
  } else {
    return `${limited.slice(0, 3)} ${limited.slice(3)}`;
  }
};

// Account number mask: XXXX XXXX XXXX XXXX
export const accountNumberMask = (value: string): string => {
  // Remove all non-numeric characters
  const numbers = value.replace(/\D/g, '');
  
  // Limit to 18 digits (max for Indian bank accounts)
  const limited = numbers.slice(0, 18);
  
  // Apply formatting in groups of 4
  return limited.replace(/(.{4})/g, '$1 ').trim();
};

// Udhyam registration mask: UDYAM-XX-XX-XXXXXXX
export const udhyamMask = (value: string): string => {
  // Remove UDYAM prefix if user types it
  let processedValue = value.replace(/^UDYAM-?/i, '');
  
  // Remove all non-alphanumeric characters and convert to uppercase
  const alphanumeric = processedValue.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  // Limit to 11 characters (2+2+7)
  const limited = alphanumeric.slice(0, 11);
  
  // Apply Udhyam formatting
  if (limited.length === 0) {
    return 'UDYAM-';
  } else if (limited.length <= 2) {
    return `UDYAM-${limited}`;
  } else if (limited.length <= 4) {
    return `UDYAM-${limited.slice(0, 2)}-${limited.slice(2)}`;
  } else {
    return `UDYAM-${limited.slice(0, 2)}-${limited.slice(2, 4)}-${limited.slice(4)}`;
  }
};

// CIN mask: LXXXXX XXXXXXX XXXXXX
export const cinMask = (value: string): string => {
  // Convert to uppercase and remove non-alphanumeric characters
  const alphanumeric = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  // Limit to 21 characters
  const limited = alphanumeric.slice(0, 21);
  
  // Apply CIN formatting
  if (limited.length <= 1) {
    return limited;
  } else if (limited.length <= 6) {
    return `${limited.slice(0, 1)}${limited.slice(1)}`;
  } else if (limited.length <= 8) {
    return `${limited.slice(0, 6)} ${limited.slice(6)}`;
  } else if (limited.length <= 12) {
    return `${limited.slice(0, 6)} ${limited.slice(6, 8)} ${limited.slice(8)}`;
  } else if (limited.length <= 15) {
    return `${limited.slice(0, 6)} ${limited.slice(6, 8)} ${limited.slice(8, 12)} ${limited.slice(12)}`;
  } else {
    return `${limited.slice(0, 6)} ${limited.slice(6, 8)} ${limited.slice(8, 12)} ${limited.slice(12, 15)} ${limited.slice(15)}`;
  }
};

// Amount/Currency mask with Indian formatting
export const currencyMask = (value: string): string => {
  // Remove all non-numeric characters except decimal point
  const numbers = value.replace(/[^\d.]/g, '');
  
  // Handle decimal point
  const parts = numbers.split('.');
  let integerPart = parts[0] || '';
  let decimalPart = parts[1] || '';
  
  // Limit decimal places to 2
  if (decimalPart.length > 2) {
    decimalPart = decimalPart.slice(0, 2);
  }
  
  // Apply Indian number formatting (lakhs and crores)
  if (integerPart.length > 3) {
    // Indian formatting: XX,XX,XXX
    integerPart = integerPart.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    // For the last group, use standard formatting
    integerPart = integerPart.replace(/^(\d+),(\d{2},)*(\d{3})$/, (match, p1, p2, p3) => {
      return p1.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ',' + (p2 || '') + p3;
    });
  }
  
  // Combine parts
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
};

// Percentage mask
export const percentageMask = (value: string): string => {
  // Remove all non-numeric characters except decimal point
  const numbers = value.replace(/[^\d.]/g, '');
  
  // Handle decimal point
  const parts = numbers.split('.');
  let integerPart = parts[0] || '';
  let decimalPart = parts[1] || '';
  
  // Limit to 100 for percentage
  if (parseInt(integerPart) > 100) {
    integerPart = '100';
    decimalPart = '';
  }
  
  // Limit decimal places to 2
  if (decimalPart.length > 2) {
    decimalPart = decimalPart.slice(0, 2);
  }
  
  // Combine parts
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
};

// Year mask
export const yearMask = (value: string): string => {
  // Remove all non-numeric characters
  const numbers = value.replace(/\D/g, '');
  
  // Limit to 4 digits
  return numbers.slice(0, 4);
};

// Credit card mask: XXXX XXXX XXXX XXXX
export const creditCardMask = (value: string): string => {
  // Remove all non-numeric characters
  const numbers = value.replace(/\D/g, '');
  
  // Limit to 16 digits
  const limited = numbers.slice(0, 16);
  
  // Apply credit card formatting
  return limited.replace(/(.{4})/g, '$1 ').trim();
};

// Mask type definitions
export type MaskType = 
  | 'phone'
  | 'gstin'
  | 'pan'
  | 'ifsc'
  | 'pincode'
  | 'accountNumber'
  | 'udhyam'
  | 'cin'
  | 'currency'
  | 'percentage'
  | 'year'
  | 'creditCard';

// Main masking function
export const applyMask = (value: string, maskType: MaskType): string => {
  switch (maskType) {
    case 'phone':
      return phoneMask(value);
    case 'gstin':
      return gstinMask(value);
    case 'pan':
      return panMask(value);
    case 'ifsc':
      return ifscMask(value);
    case 'pincode':
      return pincodeMask(value);
    case 'accountNumber':
      return accountNumberMask(value);
    case 'udhyam':
      return udhyamMask(value);
    case 'cin':
      return cinMask(value);
    case 'currency':
      return currencyMask(value);
    case 'percentage':
      return percentageMask(value);
    case 'year':
      return yearMask(value);
    case 'creditCard':
      return creditCardMask(value);
    default:
      return value;
  }
};

// Remove mask and get raw value
export const removeMask = (value: string, maskType: MaskType): string => {
  switch (maskType) {
    case 'phone':
    case 'pincode':
    case 'accountNumber':
    case 'year':
    case 'creditCard':
      return value.replace(/\D/g, '');
    case 'gstin':
    case 'pan':
    case 'ifsc':
    case 'cin':
      return value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    case 'udhyam':
      return value.replace(/^UDYAM-/, '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    case 'currency':
    case 'percentage':
      return value.replace(/[^\d.]/g, '');
    default:
      return value;
  }
};

// Placeholder text for different mask types
export const getMaskPlaceholder = (maskType: MaskType): string => {
  switch (maskType) {
    case 'phone':
      return '98765 43210';
    case 'gstin':
      return '22 AAAAA 0000 1A1 Z5A4';
    case 'pan':
      return 'ABCDE 1234 F';
    case 'ifsc':
      return 'SBIN 0001234';
    case 'pincode':
      return '110 001';
    case 'accountNumber':
      return 'Account number';
    case 'udhyam':
      return 'UDYAM-DL-03-1234567';
    case 'cin':
      return 'L17110DL1992PLC049780';
    case 'currency':
      return '1,00,000.00';
    case 'percentage':
      return '10.5';
    case 'year':
      return '2024';
    case 'creditCard':
      return '1234 5678 9012 3456';
    default:
      return '';
  }
};

// Validation helpers
export const validateMaskedInput = (value: string, maskType: MaskType): boolean => {
  const rawValue = removeMask(value, maskType);
  
  switch (maskType) {
    case 'phone':
      return /^[6-9]\d{9}$/.test(rawValue);
    case 'gstin':
      return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(rawValue);
    case 'pan':
      return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(rawValue);
    case 'ifsc':
      return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(rawValue);
    case 'pincode':
      return /^\d{6}$/.test(rawValue);
    case 'udhyam':
      return /^[A-Z]{2}\d{2}\d{7}$/.test(rawValue);
    case 'cin':
      return /^[LUF]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/.test(rawValue);
    case 'accountNumber':
      return /^\d{9,18}$/.test(rawValue);
    case 'year':
      const year = parseInt(rawValue);
      return year >= 1900 && year <= new Date().getFullYear();
    case 'percentage':
      const percentage = parseFloat(rawValue);
      return percentage >= 0 && percentage <= 100;
    case 'currency':
      return /^\d+(\.\d{1,2})?$/.test(rawValue);
    case 'creditCard':
      return /^\d{16}$/.test(rawValue);
    default:
      return true;
  }
};

// Format display value for readonly/display purposes
export const formatDisplayValue = (value: string, maskType: MaskType, hidePartial = false): string => {
  if (!value) return '';
  
  const maskedValue = applyMask(value, maskType);
  
  if (hidePartial) {
    switch (maskType) {
      case 'phone':
        return maskedValue.replace(/(\d{5})\s(\d{2})\d{3}/, '$1 $2XXX');
      case 'pan':
        return maskedValue.replace(/([A-Z]{5})\s(\d{2})\d{2}\s([A-Z])/, '$1 $2XX $3');
      case 'accountNumber':
        return maskedValue.replace(/(\d{4}\s\d{4}\s\d{4})\s\d{4}/, '$1 XXXX');
      case 'creditCard':
        return maskedValue.replace(/(\d{4}\s\d{4}\s\d{4})\s\d{4}/, '$1 XXXX');
      default:
        return maskedValue;
    }
  }
  
  return maskedValue;
};

// Get cursor position after masking
export const getCursorPosition = (
  oldValue: string,
  newValue: string,
  oldCursor: number,
  maskType: MaskType
): number => {
  // Calculate how many characters were added/removed
  const lengthDiff = newValue.length - oldValue.length;
  
  // For most masks, simply adjust by the length difference
  let newCursor = oldCursor + lengthDiff;
  
  // Ensure cursor is within bounds
  newCursor = Math.max(0, Math.min(newCursor, newValue.length));
  
  // For specific masks, we might need special handling
  switch (maskType) {
    case 'phone':
      // If cursor is at a space, move it past the space
      if (newValue[newCursor] === ' ') {
        newCursor++;
      }
      break;
    case 'gstin':
    case 'pan':
    case 'ifsc':
      // Similar handling for other spaced masks
      if (newValue[newCursor] === ' ') {
        newCursor++;
      }
      break;
  }
  
  return newCursor;
};