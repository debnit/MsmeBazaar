import { z } from "zod";

// Common validation patterns
const phoneRegex = /^[6-9]\d{9}$/;
const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const pincodeRegex = /^\d{6}$/;
const udhyamRegex = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;
const cinRegex = /^[LUF]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/;

// Custom validation messages
const validationMessages = {
  required: "This field is required",
  email: "Please enter a valid email address",
  phone: "Please enter a valid 10-digit mobile number",
  gstin: "Please enter a valid GSTIN (15 characters)",
  pan: "Please enter a valid PAN (10 characters)",
  ifsc: "Please enter a valid IFSC code",
  pincode: "Please enter a valid 6-digit PIN code",
  udhyam: "Please enter a valid Udhyam registration number",
  cin: "Please enter a valid CIN number",
  minLength: (min: number) => `Must be at least ${min} characters`,
  maxLength: (max: number) => `Must not exceed ${max} characters`,
  minValue: (min: number) => `Must be at least ${min}`,
  maxValue: (max: number) => `Must not exceed ${max}`,
  positiveNumber: "Must be a positive number",
  url: "Please enter a valid URL",
  dateInPast: "Date must be in the past",
  dateInFuture: "Date must be in the future",
  fileSize: "File size must be less than 5MB",
  fileType: "Invalid file type",
};

// Common field schemas
export const commonFields = {
  email: z
    .string()
    .min(1, validationMessages.required)
    .regex(emailRegex, validationMessages.email)
    .max(100, validationMessages.maxLength(100)),

  phone: z
    .string()
    .min(1, validationMessages.required)
    .regex(phoneRegex, validationMessages.phone),

  gstin: z
    .string()
    .min(1, validationMessages.required)
    .regex(gstinRegex, validationMessages.gstin),

  pan: z
    .string()
    .min(1, validationMessages.required)
    .regex(panRegex, validationMessages.pan),

  ifsc: z
    .string()
    .min(1, validationMessages.required)
    .regex(ifscRegex, validationMessages.ifsc),

  pincode: z
    .string()
    .min(1, validationMessages.required)
    .regex(pincodeRegex, validationMessages.pincode),

  udhyam: z
    .string()
    .optional()
    .refine((val) => !val || udhyamRegex.test(val), validationMessages.udhyam),

  cin: z
    .string()
    .optional()
    .refine((val) => !val || cinRegex.test(val), validationMessages.cin),

  name: z
    .string()
    .min(1, validationMessages.required)
    .min(2, validationMessages.minLength(2))
    .max(100, validationMessages.maxLength(100))
    .refine((val) => !/^\s|\s$/.test(val), "Name cannot start or end with spaces"),

  companyName: z
    .string()
    .min(1, validationMessages.required)
    .min(2, validationMessages.minLength(2))
    .max(200, validationMessages.maxLength(200)),

  address: z
    .string()
    .min(1, validationMessages.required)
    .min(10, validationMessages.minLength(10))
    .max(500, validationMessages.maxLength(500)),

  website: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^https?:\/\//.test(val),
      "Website must start with http:// or https://"
    ),

  amount: z
    .number()
    .positive(validationMessages.positiveNumber)
    .max(100000000000, validationMessages.maxValue(100000000000)), // 100 billion

  percentage: z
    .number()
    .min(0, validationMessages.minValue(0))
    .max(100, validationMessages.maxValue(100)),

  year: z
    .number()
    .min(1900, validationMessages.minValue(1900))
    .max(new Date().getFullYear(), validationMessages.maxValue(new Date().getFullYear())),

  password: z
    .string()
    .min(8, validationMessages.minLength(8))
    .max(100, validationMessages.maxLength(100))
    .refine(
      (val) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(val),
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
};

// User Registration Schema
export const userRegistrationSchema = z.object({
  email: commonFields.email,
  phone: commonFields.phone,
  password: commonFields.password,
  confirmPassword: z.string(),
  firstName: commonFields.name,
  lastName: commonFields.name,
  role: z.enum(["seller", "buyer", "agent", "nbfc"], {
    required_error: "Please select a role",
  }),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the terms and conditions",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type UserRegistration = z.infer<typeof userRegistrationSchema>;

// Login Schema
export const loginSchema = z.object({
  email: commonFields.email,
  password: z.string().min(1, validationMessages.required),
  rememberMe: z.boolean().optional(),
});

export type Login = z.infer<typeof loginSchema>;

// OTP Verification Schema
export const otpSchema = z.object({
  otp: z
    .string()
    .min(6, "OTP must be 6 digits")
    .max(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only numbers"),
  phone: commonFields.phone,
});

export type OTPVerification = z.infer<typeof otpSchema>;

// MSME Registration Schema
export const msmeRegistrationSchema = z.object({
  // Basic Information
  companyName: commonFields.companyName,
  businessType: z.enum([
    "proprietorship",
    "partnership",
    "private_limited",
    "public_limited",
    "llp",
    "section_8",
    "cooperative",
  ], {
    required_error: "Please select a business type",
  }),
  industryCategory: z.enum([
    "manufacturing",
    "services",
    "trading",
    "agriculture",
    "technology",
    "healthcare",
    "education",
    "retail",
    "construction",
    "transport",
    "other",
  ], {
    required_error: "Please select an industry category",
  }),
  businessDescription: z
    .string()
    .min(50, validationMessages.minLength(50))
    .max(1000, validationMessages.maxLength(1000)),

  // Registration Details
  gstin: commonFields.gstin,
  pan: commonFields.pan,
  udhyamNumber: commonFields.udhyam,
  cinNumber: commonFields.cin,
  incorporationDate: z
    .string()
    .min(1, validationMessages.required)
    .refine((date) => new Date(date) < new Date(), validationMessages.dateInPast),

  // Contact Information
  email: commonFields.email,
  phone: commonFields.phone,
  alternatePhone: z.string().optional(),
  website: commonFields.website,

  // Address Information
  address: commonFields.address,
  city: z.string().min(1, validationMessages.required),
  state: z.string().min(1, validationMessages.required),
  pincode: commonFields.pincode,
  country: z.string().default("India"),

  // Financial Information
  yearOfEstablishment: commonFields.year,
  annualTurnover: commonFields.amount,
  employeeCount: z
    .number()
    .min(1, validationMessages.minValue(1))
    .max(10000, validationMessages.maxValue(10000)),
  exportTurnover: z.number().optional(),

  // Bank Details
  bankName: z.string().min(1, validationMessages.required),
  accountNumber: z
    .string()
    .min(9, validationMessages.minLength(9))
    .max(18, validationMessages.maxLength(18))
    .regex(/^\d+$/, "Account number must contain only numbers"),
  ifscCode: commonFields.ifsc,
  accountHolderName: commonFields.name,

  // Additional Information
  awards: z.string().optional(),
  certifications: z.string().optional(),
  keyProducts: z
    .array(z.string().min(1))
    .min(1, "Please add at least one key product")
    .max(10, "Maximum 10 products allowed"),
  keyMarkets: z.array(z.string().min(1)).optional(),

  // Documents
  documents: z.object({
    gstCertificate: z.boolean().refine((val) => val === true, "GST certificate is required"),
    panCard: z.boolean().refine((val) => val === true, "PAN card is required"),
    incorporationCertificate: z.boolean().refine((val) => val === true, "Incorporation certificate is required"),
    auditedFinancials: z.boolean().optional(),
    bankStatement: z.boolean().optional(),
    msmeUdyogCertificate: z.boolean().optional(),
  }),
});

export type MSMERegistration = z.infer<typeof msmeRegistrationSchema>;

// Valuation Request Schema
export const valuationRequestSchema = z.object({
  msmeId: z.string().min(1, validationMessages.required),
  valuationPurpose: z.enum([
    "sale",
    "acquisition",
    "loan",
    "investment",
    "merger",
    "compliance",
    "insurance",
    "other",
  ], {
    required_error: "Please select valuation purpose",
  }),
  urgency: z.enum(["low", "medium", "high"], {
    required_error: "Please select urgency level",
  }),
  additionalNotes: z.string().max(500, validationMessages.maxLength(500)).optional(),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the valuation terms",
  }),
});

export type ValuationRequest = z.infer<typeof valuationRequestSchema>;

// Contact Form Schema
export const contactFormSchema = z.object({
  name: commonFields.name,
  email: commonFields.email,
  phone: commonFields.phone,
  company: z.string().optional(),
  subject: z
    .string()
    .min(1, validationMessages.required)
    .max(100, validationMessages.maxLength(100)),
  message: z
    .string()
    .min(10, validationMessages.minLength(10))
    .max(1000, validationMessages.maxLength(1000)),
  inquiry_type: z.enum([
    "general",
    "support",
    "sales",
    "partnership",
    "technical",
    "billing",
  ], {
    required_error: "Please select inquiry type",
  }),
});

export type ContactForm = z.infer<typeof contactFormSchema>;

// Search/Filter Schema
export const searchFiltersSchema = z.object({
  query: z.string().optional(),
  industry: z.string().optional(),
  location: z.string().optional(),
  turnoverRange: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
  }).optional(),
  employeeRange: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
  }).optional(),
  establishedYear: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
  }).optional(),
  sortBy: z.enum([
    "relevance",
    "turnover_asc",
    "turnover_desc",
    "established_asc",
    "established_desc",
    "employees_asc",
    "employees_desc",
  ]).optional(),
  verified: z.boolean().optional(),
});

export type SearchFilters = z.infer<typeof searchFiltersSchema>;

// Profile Update Schema
export const profileUpdateSchema = z.object({
  firstName: commonFields.name,
  lastName: commonFields.name,
  email: commonFields.email,
  phone: commonFields.phone,
  company: z.string().optional(),
  designation: z.string().optional(),
  bio: z.string().max(500, validationMessages.maxLength(500)).optional(),
  website: commonFields.website,
  linkedinProfile: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    country: z.string().default("India"),
  }).optional(),
});

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

// File Upload Schema
export const fileUploadSchema = z.object({
  file: z.custom<File>().refine(
    (file) => file?.size <= 5 * 1024 * 1024, // 5MB
    validationMessages.fileSize
  ).refine(
    (file) => {
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      return allowedTypes.includes(file?.type);
    },
    "Only PDF, Word documents, and images are allowed"
  ),
  category: z.enum([
    "gst_certificate",
    "pan_card",
    "incorporation_certificate",
    "audited_financials",
    "bank_statement",
    "msme_udyog_certificate",
    "profile_photo",
    "company_logo",
    "other",
  ]),
  description: z.string().max(200, validationMessages.maxLength(200)).optional(),
});

export type FileUpload = z.infer<typeof fileUploadSchema>;

// Utility functions for form validation
export const validateField = (schema: z.ZodSchema, value: any) => {
  try {
    schema.parse(value);
    return { isValid: true, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message || "Invalid input" };
    }
    return { isValid: false, error: "Validation failed" };
  }
};

export const validateForm = <T>(schema: z.ZodSchema<T>, data: any) => {
  try {
    const validatedData = schema.parse(data);
    return { isValid: true, data: validatedData, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.reduce((acc, curr) => {
        const path = curr.path.join('.');
        acc[path] = curr.message;
        return acc;
      }, {} as Record<string, string>);
      return { isValid: false, data: null, errors };
    }
    return { isValid: false, data: null, errors: { general: "Validation failed" } };
  }
};

// Form state management helpers
export const createFormState = <T>(initialData: Partial<T> = {}) => {
  return {
    data: initialData,
    errors: {} as Record<string, string>,
    isSubmitting: false,
    isValid: false,
    touched: {} as Record<string, boolean>,
  };
};

export const updateFormField = <T>(
  formState: any,
  field: keyof T,
  value: any,
  schema?: z.ZodSchema
) => {
  const newData = { ...formState.data, [field]: value };
  const newTouched = { ...formState.touched, [field]: true };
  
  let newErrors = { ...formState.errors };
  
  // Validate field if schema provided
  if (schema) {
    const fieldSchema = schema.shape?.[field as string];
    if (fieldSchema) {
      const validation = validateField(fieldSchema, value);
      if (validation.isValid) {
        delete newErrors[field as string];
      } else {
        newErrors[field as string] = validation.error!;
      }
    }
  }
  
  return {
    ...formState,
    data: newData,
    errors: newErrors,
    touched: newTouched,
    isValid: Object.keys(newErrors).length === 0,
  };
};