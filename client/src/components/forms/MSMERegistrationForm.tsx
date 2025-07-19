import React, { useState, useCallback, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormField, Textarea } from '@/components/ui/form-field';
import { Modal } from '@/components/ui/modal';
import { useToastHelpers } from '@/lib/toast';
import { msmeRegistrationSchema, type MSMERegistration } from '@/lib/validation';
import { api, queryKeys } from '@/lib/api';
import { cn } from '@/lib/utils';
import { 
  Building2, 
  FileText, 
  MapPin, 
  CreditCard, 
  Upload, 
  CheckCircle2, 
  AlertTriangle,

  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

interface MSMERegistrationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msme: any) => void;
}

const steps = [
  {
    id: 'basic',
    title: 'Basic Information',
    description: 'Company details and business type',
    icon: Building2,
  },
  {
    id: 'registration',
    title: 'Registration Details',
    description: 'Legal documents and registrations',
    icon: FileText,
  },
  {
    id: 'contact',
    title: 'Contact & Address',
    description: 'Business address and contact information',
    icon: MapPin,
  },
  {
    id: 'financial',
    title: 'Financial Information',
    description: 'Turnover, employees, and bank details',
    icon: CreditCard,
  },
  {
    id: 'documents',
    title: 'Documents',
    description: 'Upload required documents',
    icon: Upload,
  },
];

export const MSMERegistrationForm: React.FC<MSMERegistrationFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const queryClient = useQueryClient();
  const { success, error, loading } = useToastHelpers();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    trigger,
    watch,
    setValue,
    getValues,
  } = useForm<MSMERegistration>({
    resolver: zodResolver(msmeRegistrationSchema),
    mode: 'onChange',
    defaultValues: {
      country: 'India',
      keyProducts: [''],
      documents: {
        gstCertificate: false,
        panCard: false,
        incorporationCertificate: false,
        auditedFinancials: false,
        bankStatement: false,
        msmeUdyogCertificate: false,
      },
    },
  });

  // Mutation for creating MSME
  const createMSMEMutation = useMutation({
    mutationFn: (data: MSMERegistration) => api.msmes.create(data),
    onSuccess: (response) => {
      success('MSME Registration Successful', 'Your MSME has been registered successfully!');
      queryClient.invalidateQueries({ queryKey: queryKeys.msmes() });
      onSuccess?.(response.data);
      onClose();
    },
    onError: (error: any) => {
      error('Registration Failed', error.message || 'Please try again');
    },
  });

  // File upload mutation
  const uploadFileMutation = useMutation({
    mutationFn: ({ file, category }: { file: File; category: string }) =>
      api.files.upload(file, category),
  });

  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = useCallback(async () => {
    const stepFields = getStepFields(currentStep);
    const isStepValid = await trigger(stepFields);
    
    if (isStepValid) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  }, [currentStep, trigger]);

  const handlePrevious = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleFileUpload = useCallback((file: File, category: string) => {
    setUploadedFiles(prev => ({ ...prev, [category]: file }));
    setValue(`documents.${category}` as any, true);
  }, [setValue]);

  const removeFile = useCallback((category: string) => {
    setUploadedFiles(prev => {
      const { [category]: removed, ...rest } = prev;
      return rest;
    });
    setValue(`documents.${category}` as any, false);
  }, [setValue]);

  const onSubmit = useCallback(async (data: MSMERegistration) => {
    loading('Registering MSME...', 'Please wait while we process your registration');
    
    try {
      // Upload files first
      const fileUploads = Object.entries(uploadedFiles).map(async ([category, file]) => {
        const result = await uploadFileMutation.mutateAsync({ file, category });
        return { category, url: result.data.url };
      });

      const uploadResults = await Promise.all(fileUploads);
      
      // Add file URLs to the data
      const formDataWithFiles = {
        ...data,
        documentUrls: uploadResults.reduce((acc, { category, url }) => {
          acc[category] = url;
          return acc;
        }, {} as Record<string, string>),
      };

      await createMSMEMutation.mutateAsync(formDataWithFiles);
    } catch (err) {
      error('Registration Failed', 'Please check your information and try again');
    }
  }, [uploadedFiles, uploadFileMutation, createMSMEMutation, loading, error]);

  const addProduct = useCallback(() => {
    const products = getValues('keyProducts');
    setValue('keyProducts', [...products, '']);
  }, [getValues, setValue]);

  const removeProduct = useCallback((index: number) => {
    const products = getValues('keyProducts');
    setValue('keyProducts', products.filter((_, i) => i !== index));
  }, [getValues, setValue]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic Information
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="companyName"
                control={control}
                render={({ field }) => (
                  <FormField
                    label="Company Name"
                    required
                    error={errors.companyName?.message || ""}
                    {...field}
                  />
                )}
              />

              <Controller
                name="businessType"
                control={control}
                render={({ field }) => (
                  <div className="form-field">
                    <label className="form-label block mb-2">
                      Business Type <span className="text-destructive">*</span>
                    </label>
                    <select
                      {...field}
                      className={cn(
                        'input-base w-full',
                        errors.businessType && 'input-error'
                      )}
                    >
                      <option value="">Select business type</option>
                      <option value="proprietorship">Proprietorship</option>
                      <option value="partnership">Partnership</option>
                      <option value="private_limited">Private Limited</option>
                      <option value="public_limited">Public Limited</option>
                      <option value="llp">Limited Liability Partnership</option>
                      <option value="section_8">Section 8 Company</option>
                      <option value="cooperative">Cooperative</option>
                    </select>
                    {errors.businessType && (
                      <p className="form-error mt-1">{errors.businessType.message}</p>
                    )}
                  </div>
                )}
              />
            </div>

            <Controller
              name="industryCategory"
              control={control}
              render={({ field }) => (
                <div className="form-field">
                  <label className="form-label block mb-2">
                    Industry Category <span className="text-destructive">*</span>
                  </label>
                  <select
                    {...field}
                    className={cn(
                      'input-base w-full',
                      errors.industryCategory && 'input-error'
                    )}
                  >
                    <option value="">Select industry</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="services">Services</option>
                    <option value="trading">Trading</option>
                    <option value="agriculture">Agriculture</option>
                    <option value="technology">Technology</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="education">Education</option>
                    <option value="retail">Retail</option>
                    <option value="construction">Construction</option>
                    <option value="transport">Transport</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.industryCategory && (
                    <p className="form-error mt-1">{errors.industryCategory.message}</p>
                  )}
                </div>
              )}
            />

            <Controller
              name="businessDescription"
              control={control}
              render={({ field }) => (
                <Textarea
                  label="Business Description"
                  description="Describe your business activities, products, and services"
                  required
                  maxLength={1000}
                  showCharCount
                  minRows={4}
                  error={errors.businessDescription?.message || ""}
                  {...field}
                />
              )}
            />

            <Controller
              name="yearOfEstablishment"
              control={control}
              render={({ field: { onChange, ...field } }) => (
                <FormField
                  label="Year of Establishment"
                  type="number"
                  required
                  mask="year"
                  onChange={(value) => onChange(parseInt(value) || 0)}
                  error={errors.yearOfEstablishment?.message || ""}
                  {...field}
                  value={field.value?.toString() || ''}
                />
              )}
            />
          </div>
        );

      case 1: // Registration Details
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="gstin"
                control={control}
                render={({ field }) => (
                  <FormField
                    label="GSTIN"
                    required
                    mask="gstin"
                    error={errors.gstin?.message || ""}
                    {...field}
                  />
                )}
              />

              <Controller
                name="pan"
                control={control}
                render={({ field }) => (
                  <FormField
                    label="PAN"
                    required
                    mask="pan"
                    error={errors.pan?.message || ""}
                    {...field}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="udhyamNumber"
                control={control}
                render={({ field }) => (
                  <FormField
                    label="Udhyam Registration Number"
                    description="Leave blank if not registered"
                    mask="udhyam"
                    error={errors.udhyamNumber?.message || ""}
                    {...field}
                    value={field.value || ""}
                  />
                )}
              />

              <Controller
                name="cinNumber"
                control={control}
                render={({ field }) => (
                  <FormField
                    label="CIN Number"
                    description="For companies only"
                    mask="cin"
                    error={errors.cinNumber?.message || ""}
                    {...field}
                    value={field.value || ""}
                  />
                )}
              />
            </div>

            <Controller
              name="incorporationDate"
              control={control}
              render={({ field }) => (
                <FormField
                  label="Incorporation Date"
                  type="date"
                  required
                  error={errors.incorporationDate?.message || ""}
                  {...field}
                />
              )}
            />
          </div>
        );

      case 2: // Contact & Address
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <FormField
                    label="Business Email"
                    type="email"
                    required
                    error={errors.email?.message || ""}
                    {...field}
                  />
                )}
              />

              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <FormField
                    label="Phone Number"
                    required
                    mask="phone"
                    error={errors.phone?.message || ""}
                    {...field}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="alternatePhone"
                control={control}
                render={({ field }) => (
                  <FormField
                    label="Alternate Phone"
                    mask="phone"
                    error={errors.alternatePhone?.message || ""}
                    {...field}
                    value={field.value || ""}
                  />
                )}
              />

              <Controller
                name="website"
                control={control}
                render={({ field }) => (
                  <FormField
                    label="Website"
                    placeholder="https://www.example.com"
                    error={errors.website?.message || ""}
                    {...field}
                    value={field.value || ""}
                  />
                )}
              />
            </div>

            <Controller
              name="address"
              control={control}
              render={({ field }) => (
                <Textarea
                  label="Business Address"
                  required
                  minRows={3}
                  error={errors.address?.message || ""}
                  {...field}
                />
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Controller
                name="city"
                control={control}
                render={({ field }) => (
                  <FormField
                    label="City"
                    required
                    error={errors.city?.message || ""}
                    {...field}
                  />
                )}
              />

              <Controller
                name="state"
                control={control}
                render={({ field }) => (
                  <FormField
                    label="State"
                    required
                    error={errors.state?.message || ""}
                    {...field}
                  />
                )}
              />

              <Controller
                name="pincode"
                control={control}
                render={({ field }) => (
                  <FormField
                    label="PIN Code"
                    required
                    mask="pincode"
                    error={errors.pincode?.message || ""}
                    {...field}
                  />
                )}
              />
            </div>
          </div>
        );

      case 3: // Financial Information
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="annualTurnover"
                control={control}
                render={({ field: { onChange, ...field } }) => (
                  <FormField
                    label="Annual Turnover (₹)"
                    required
                    mask="currency"
                    onChange={(_, rawValue) => onChange(parseFloat(rawValue || '0'))}
                    error={errors.annualTurnover?.message || ""}
                    {...field}
                    value={field.value?.toString() || ''}
                  />
                )}
              />

              <Controller
                name="employeeCount"
                control={control}
                render={({ field: { onChange, ...field } }) => (
                  <FormField
                    label="Number of Employees"
                    type="number"
                    required
                    onChange={(value) => onChange(parseInt(value) || 0)}
                    error={errors.employeeCount?.message || ""}
                    {...field}
                    value={field.value?.toString() || ''}
                  />
                )}
              />
            </div>

            <Controller
              name="exportTurnover"
              control={control}
              render={({ field: { onChange, ...field } }) => (
                <FormField
                  label="Export Turnover (₹)"
                  description="Leave blank if not applicable"
                  mask="currency"
                  onChange={(_, rawValue) => onChange(parseFloat(rawValue || '0') || undefined)}
                  error={errors.exportTurnover?.message || ""}
                  {...field}
                  value={field.value?.toString() || ''}
                />
              )}
            />

            {/* Bank Details */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Bank Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name="bankName"
                  control={control}
                  render={({ field }) => (
                    <FormField
                      label="Bank Name"
                      required
                      error={errors.bankName?.message || ""}
                      {...field}
                    />
                  )}
                />

                <Controller
                  name="ifscCode"
                  control={control}
                  render={({ field }) => (
                    <FormField
                      label="IFSC Code"
                      required
                      mask="ifsc"
                      error={errors.ifscCode?.message || ""}
                      {...field}
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Controller
                  name="accountNumber"
                  control={control}
                  render={({ field }) => (
                    <FormField
                      label="Account Number"
                      required
                      mask="accountNumber"
                      error={errors.accountNumber?.message || ""}
                      {...field}
                    />
                  )}
                />

                <Controller
                  name="accountHolderName"
                  control={control}
                  render={({ field }) => (
                    <FormField
                      label="Account Holder Name"
                      required
                      error={errors.accountHolderName?.message || ""}
                      {...field}
                    />
                  )}
                />
              </div>
            </div>

            {/* Key Products */}
            <div>
              <label className="form-label block mb-2">
                Key Products/Services <span className="text-destructive">*</span>
              </label>
              
              {watch('keyProducts')?.map((_, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Controller
                    name={`keyProducts.${index}`}
                    control={control}
                    render={({ field }) => (
                      <FormField
                        placeholder={`Product/Service ${index + 1}`}
                        fullWidth
                        {...field}
                      />
                    )}
                  />
                  {watch('keyProducts')!.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProduct(index)}
                      className="btn-icon btn-ghost text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              
              {watch('keyProducts')!.length < 10 && (
                <button
                  type="button"
                  onClick={addProduct}
                  className="btn-ghost text-sm mt-2"
                >
                  + Add Product/Service
                </button>
              )}
              
              {errors.keyProducts && (
                <p className="form-error mt-1">{errors.keyProducts.message}</p>
              )}
            </div>
          </div>
        );

      case 4: // Documents
        return (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Upload the required documents. All files should be in PDF, JPG, or PNG format and less than 5MB.
            </p>
            
            <DocumentUploadSection
              title="Required Documents"
              documents={[
                { key: 'gstCertificate', label: 'GST Certificate', required: true },
                { key: 'panCard', label: 'PAN Card', required: true },
                { key: 'incorporationCertificate', label: 'Incorporation Certificate', required: true },
              ]}
              uploadedFiles={uploadedFiles}
              onFileUpload={handleFileUpload}
              onFileRemove={removeFile}
              errors={errors.documents}
            />

            <DocumentUploadSection
              title="Optional Documents"
              documents={[
                { key: 'auditedFinancials', label: 'Audited Financial Statements', required: false },
                { key: 'bankStatement', label: 'Bank Statement (Last 6 months)', required: false },
                { key: 'msmeUdyogCertificate', label: 'MSME/Udyog Certificate', required: false },
              ]}
              uploadedFiles={uploadedFiles}
              onFileUpload={handleFileUpload}
              onFileRemove={removeFile}
              errors={errors.documents}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="MSME Registration"
      description="Complete your MSME registration to access our services"
      size="xl"
      closeOnOverlayClick={false}
      showCloseButton={false}
    >
      <div className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors',
                    isActive && 'border-primary bg-primary text-primary-foreground',
                    isCompleted && 'border-success bg-success text-success-foreground',
                    !isActive && !isCompleted && 'border-muted bg-background text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'w-12 h-0.5 mx-2 transition-colors',
                      isCompleted ? 'bg-success' : 'bg-muted'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Current Step Info */}
        <div className="text-center">
          <h3 className="text-xl font-semibold">{steps[currentStep]?.title}</h3>
          <p className="text-muted-foreground">{steps[currentStep]?.description}</p>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={isFirstStep}
              className={cn(
                'btn-outline flex items-center gap-2',
                isFirstStep && 'invisible'
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost"
              >
                Cancel
              </button>

              {isLastStep ? (
                <button
                  type="submit"
                  disabled={createMSMEMutation.isPending || !isValid}
                  className="btn-primary flex items-center gap-2"
                >
                  {createMSMEMutation.isPending && (
                    <div className="loading-spinner h-4 w-4" />
                  )}
                  Register MSME
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};

// Helper component for document upload
interface DocumentUploadSectionProps {
  title: string;
  documents: Array<{ key: string; label: string; required: boolean }>;
  uploadedFiles: Record<string, File>;
  onFileUpload: (file: File, category: string) => void;
  onFileRemove: (category: string) => void;
  errors?: any;
}

const DocumentUploadSection: React.FC<DocumentUploadSectionProps> = ({
  title,
  documents,
  uploadedFiles,
  onFileUpload,
  onFileRemove,
  errors,
}) => {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, category: string) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload PDF, JPG, or PNG files only');
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      onFileUpload(file, category);
    }
  };

  return (
    <div>
      <h4 className="text-base font-medium mb-3">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.map(({ key, label, required }) => (
          <div key={key} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
              </span>
              {uploadedFiles[key] ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : required ? (
                <AlertTriangle className="h-5 w-5 text-warning" />
              ) : null}
            </div>

            {uploadedFiles[key] ? (
              <div className="flex items-center justify-between bg-muted rounded p-2">
                <span className="text-sm truncate">{uploadedFiles[key].name}</span>
                <button
                  type="button"
                  onClick={() => onFileRemove(key)}
                  className="text-destructive hover:text-destructive/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div>
                <input
                  ref={(el) => (fileInputRefs.current[key] = el)}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, key)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[key]?.click()}
                  className="w-full border-2 border-dashed border-muted-foreground/25 rounded p-4 text-center hover:border-primary/50 transition-colors"
                >
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload {label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, JPG, PNG (max 5MB)
                  </p>
                </button>
              </div>
            )}

            {errors?.[key] && (
              <p className="text-sm text-destructive mt-1">{errors[key].message}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function to get fields for each step
const getStepFields = (step: number): (keyof MSMERegistration)[] => {
  switch (step) {
    case 0:
      return ['companyName', 'businessType', 'industryCategory', 'businessDescription', 'yearOfEstablishment'];
    case 1:
      return ['gstin', 'pan', 'incorporationDate'];
    case 2:
      return ['email', 'phone', 'address', 'city', 'state', 'pincode'];
    case 3:
      return ['annualTurnover', 'employeeCount', 'bankName', 'accountNumber', 'ifscCode', 'accountHolderName', 'keyProducts'];
    case 4:
      return ['documents'];
    default:
      return [];
  }
};