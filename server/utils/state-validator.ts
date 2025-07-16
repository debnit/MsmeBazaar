// Server-side state validation utilities

import { safeGet, safeArray, safeString, safeNumber, safeBoolean, safeObject } from './null-safe-server';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized: any;
}

export function validateUserState(data: any): ValidationResult {
  const errors: string[] = [];
  const sanitized: any = {};

  try {
    // Validate required fields
    if (!data) {
      errors.push('User data is required');
      return { isValid: false, errors, sanitized: null };
    }

    // Validate email
    const email = safeString(safeGet(data, 'email', ''));
    if (!email) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Invalid email format');
    } else {
      sanitized.email = email;
    }

    // Validate role
    const role = safeString(safeGet(data, 'role', ''));
    const validRoles = ['seller', 'buyer', 'agent', 'admin', 'nbfc'];
    if (!role) {
      errors.push('Role is required');
    } else if (!validRoles.includes(role)) {
      errors.push('Invalid role');
    } else {
      sanitized.role = role;
    }

    // Optional fields with validation
    const firstName = safeString(safeGet(data, 'firstName', ''));
    if (firstName) {
      sanitized.firstName = firstName;
    }

    const lastName = safeString(safeGet(data, 'lastName', ''));
    if (lastName) {
      sanitized.lastName = lastName;
    }

    const phone = safeString(safeGet(data, 'phone', ''));
    if (phone) {
      // Basic phone validation
      if (!/^\+?[\d\s\-\(\)]+$/.test(phone)) {
        errors.push('Invalid phone format');
      } else {
        sanitized.phone = phone;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    };
  } catch (error) {
    console.warn('User state validation failed:', error);
    return {
      isValid: false,
      errors: ['Validation failed'],
      sanitized: null
    };
  }
}

export function validateMSMEState(data: any): ValidationResult {
  const errors: string[] = [];
  const sanitized: any = {};

  try {
    if (!data) {
      errors.push('MSME data is required');
      return { isValid: false, errors, sanitized: null };
    }

    // Validate required fields
    const businessName = safeString(safeGet(data, 'businessName', ''));
    if (!businessName) {
      errors.push('Business name is required');
    } else {
      sanitized.businessName = businessName;
    }

    const industry = safeString(safeGet(data, 'industry', ''));
    if (!industry) {
      errors.push('Industry is required');
    } else {
      sanitized.industry = industry;
    }

    const location = safeString(safeGet(data, 'location', ''));
    if (!location) {
      errors.push('Location is required');
    } else {
      sanitized.location = location;
    }

    const askingPrice = safeNumber(safeGet(data, 'askingPrice', 0));
    if (askingPrice <= 0) {
      errors.push('Asking price must be greater than 0');
    } else {
      sanitized.askingPrice = askingPrice;
    }

    // Optional fields with validation
    const description = safeString(safeGet(data, 'description', ''));
    if (description) {
      sanitized.description = description;
    }

    const employees = safeNumber(safeGet(data, 'employees', 0));
    if (employees >= 0) {
      sanitized.employees = employees;
    }

    const revenue = safeNumber(safeGet(data, 'revenue', 0));
    if (revenue >= 0) {
      sanitized.revenue = revenue;
    }

    const assets = safeArray(safeGet(data, 'assets', []));
    sanitized.assets = assets.filter(asset => asset && typeof asset === 'string');

    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    };
  } catch (error) {
    console.warn('MSME state validation failed:', error);
    return {
      isValid: false,
      errors: ['Validation failed'],
      sanitized: null
    };
  }
}

export function validateLoanApplicationState(data: any): ValidationResult {
  const errors: string[] = [];
  const sanitized: any = {};

  try {
    if (!data) {
      errors.push('Loan application data is required');
      return { isValid: false, errors, sanitized: null };
    }

    // Validate required fields
    const msmeId = safeNumber(safeGet(data, 'msmeId', 0));
    if (msmeId <= 0) {
      errors.push('Valid MSME ID is required');
    } else {
      sanitized.msmeId = msmeId;
    }

    const loanAmount = safeNumber(safeGet(data, 'loanAmount', 0));
    if (loanAmount <= 0) {
      errors.push('Loan amount must be greater than 0');
    } else {
      sanitized.loanAmount = loanAmount;
    }

    const purpose = safeString(safeGet(data, 'purpose', ''));
    if (!purpose) {
      errors.push('Loan purpose is required');
    } else {
      sanitized.purpose = purpose;
    }

    // Optional fields
    const tenure = safeNumber(safeGet(data, 'tenure', 0));
    if (tenure > 0) {
      sanitized.tenure = tenure;
    }

    const documents = safeArray(safeGet(data, 'documents', []));
    sanitized.documents = documents.filter(doc => doc && typeof doc === 'string');

    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    };
  } catch (error) {
    console.warn('Loan application state validation failed:', error);
    return {
      isValid: false,
      errors: ['Validation failed'],
      sanitized: null
    };
  }
}

export function validateRequestBody(data: any, requiredFields: string[]): ValidationResult {
  const errors: string[] = [];
  const sanitized: any = {};

  try {
    if (!data) {
      errors.push('Request body is required');
      return { isValid: false, errors, sanitized: null };
    }

    // Check required fields
    for (const field of requiredFields) {
      const value = safeGet(data, field, null);
      if (value === null || value === undefined || value === '') {
        errors.push(`${field} is required`);
      } else {
        sanitized[field] = value;
      }
    }

    // Copy optional fields safely
    Object.keys(data).forEach(key => {
      if (!requiredFields.includes(key)) {
        const value = safeGet(data, key, null);
        if (value !== null && value !== undefined) {
          sanitized[key] = value;
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    };
  } catch (error) {
    console.warn('Request body validation failed:', error);
    return {
      isValid: false,
      errors: ['Validation failed'],
      sanitized: null
    };
  }
}

export function sanitizeOutput(data: any): any {
  try {
    if (!data) {
      return null;
    }

    if (Array.isArray(data)) {
      return data.map(item => sanitizeOutput(item));
    }

    if (typeof data === 'object') {
      const sanitized: any = {};
      Object.keys(data).forEach(key => {
        const value = data[key];
        if (value !== null && value !== undefined) {
          sanitized[key] = sanitizeOutput(value);
        }
      });
      return sanitized;
    }

    return data;
  } catch (error) {
    console.warn('Output sanitization failed:', error);
    return null;
  }
}

export function validatePagination(query: any): { page: number; limit: number; offset: number } {
  const page = Math.max(1, safeNumber(safeGet(query, 'page', 1)));
  const limit = Math.min(100, Math.max(1, safeNumber(safeGet(query, 'limit', 10))));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function validateSortOptions(query: any, allowedFields: string[]): { sortBy: string; sortOrder: 'asc' | 'desc' } {
  const sortBy = safeString(safeGet(query, 'sortBy', 'id'));
  const sortOrder = safeString(safeGet(query, 'sortOrder', 'asc'));

  return {
    sortBy: allowedFields.includes(sortBy) ? sortBy : 'id',
    sortOrder: sortOrder === 'desc' ? 'desc' : 'asc'
  };
}