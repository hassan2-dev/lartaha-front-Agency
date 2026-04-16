export interface AdminData {
  email: string
  password: string
  confirmPassword: string
  name: string
}

export interface WorkspaceData {
  name: string
  industry: string
  logo: string
  logoFile: File | null
}

export interface SignUpState {
  activeStep: number
  loading: boolean
  error: string
  showPassword: boolean
  showConfirmPassword: boolean
}

export interface SignUpActions {
  setActiveStep: (step: number) => void
  setLoading: (loading: boolean) => void
  setError: (error: string) => void
  setShowPassword: (show: boolean) => void
  setShowConfirmPassword: (show: boolean) => void
  nextStep: () => void
  prevStep: () => void
  clearError: () => void
}

export interface AdminStepProps {
  adminData: AdminData
  loading: boolean
  error: string
  showPassword: boolean
  showConfirmPassword: boolean
  onAdminChange: (field: keyof AdminData, value: string) => void
  onTogglePassword: () => void
  onToggleConfirmPassword: () => void
  onSubmit: () => void
  onBack: () => void
}

export interface WorkspaceStepProps {
  workspaceData: WorkspaceData
  loading: boolean
  error: string
  onWorkspaceChange: (field: keyof WorkspaceData, value: string) => void
  onLogoUpload: (file: File) => void
  onLogoRemove: () => void
  onSubmit: () => void
  onBack: () => void
}

export interface CompletionStepProps {
  onFinish: () => void
}

export interface ValidationResult {
  isValid: boolean
  error: string
}
