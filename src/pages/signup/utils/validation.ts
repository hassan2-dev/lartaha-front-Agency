import type { AdminData, WorkspaceData, ValidationResult } from '../types'

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

export const validatePassword = (password: string): ValidationResult => {
  if (password.length < 6) {
    return {
      isValid: false,
      error: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل',
    }
  }
  return { isValid: true, error: '' }
}

export const validatePasswordMatch = (
  password: string,
  confirmPassword: string
): ValidationResult => {
  if (password !== confirmPassword) {
    return {
      isValid: false,
      error: 'كلمات المرور غير متطابقة',
    }
  }
  return { isValid: true, error: '' }
}

export const validateAdminData = (data: AdminData): ValidationResult => {
  if (!data.name.trim()) {
    return {
      isValid: false,
      error: 'الاسم الكامل مطلوب',
    }
  }

  if (!data.email.trim()) {
    return {
      isValid: false,
      error: 'البريد الإلكتروني مطلوب',
    }
  }

  if (!validateEmail(data.email)) {
    return {
      isValid: false,
      error: 'يرجى إدخال بريد إلكتروني صالح',
    }
  }

  const passwordValidation = validatePassword(data.password)
  if (!passwordValidation.isValid) {
    return passwordValidation
  }

  const passwordMatchValidation = validatePasswordMatch(data.password, data.confirmPassword)
  if (!passwordMatchValidation.isValid) {
    return passwordMatchValidation
  }

  return { isValid: true, error: '' }
}

export const validateWorkspaceData = (data: WorkspaceData): ValidationResult => {
  if (!data.name.trim()) {
    return {
      isValid: false,
      error: 'اسم مساحة العمل مطلوب',
    }
  }

  return { isValid: true, error: '' }
}

export const validateLogoFile = (file: File): ValidationResult => {
  if (!file.type.startsWith('image/')) {
    return {
      isValid: false,
      error: 'يرجى اختيار ملف صورة صالح',
    }
  }

  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'حجم الملف يجب ألا يتجاوز 5 ميجابايت',
    }
  }

  return { isValid: true, error: '' }
}
