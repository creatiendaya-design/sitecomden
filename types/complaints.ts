// types/complaints.ts
export interface FormField {
  id: string;
  label: string;
  fieldType: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: string[];
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  section?: string;
  width?: string;
  otherLabel?: string;
  order: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplaintsConfig {
  prefix?: string;
  emailSubject?: string;
  emailMessage?: string;
  successMessage?: string;
  requireEmail?: boolean;
  autoIncrement?: number;
}