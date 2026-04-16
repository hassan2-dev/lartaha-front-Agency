/**
 * Validation utilities for forms
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Validates that a value is not empty
 * @param value - The value to validate
 * @param fieldName - The name of the field (for error message)
 * @returns Error message or null if valid
 */
export function validateRequired(value: string, fieldName: string): string | null {
  if (!value.trim()) {
    return `يرجى إدخال ${fieldName}.`
  }
  return null
}

/**
 * Validates email format
 * @param email - The email to validate
 * @returns True if valid email format
 */
export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim())
}

/**
 * Validates password strength
 * @param password - The password to validate
 * @param minLength - Minimum password length (default: 8)
 * @returns Error message or null if valid
 */
export function validatePassword(password: string, minLength = 8): string | null {
  if (password.length < minLength) {
    return `يجب أن تكون كلمة المرور ${minLength} أحرف على الأقل.`
  }
  return null
}

/**
 * Validates that two passwords match
 * @param password - The original password
 * @param confirmPassword - The confirmation password
 * @returns Error message or null if valid
 */
export function validatePasswordMatch(password: string, confirmPassword: string): string | null {
  if (password !== confirmPassword) {
    return 'كلمتا المرور غير متطابقتين.'
  }
  return null
}

interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

/**
 * Validates multiple fields at once
 * @param fields - Object with field names and their validation functions
 * @returns Validation result with isValid flag and errors object
 */
export function validateFields(fields: Record<string, () => string | null>): ValidationResult {
  const errors: Record<string, string> = {}

  Object.entries(fields).forEach(([fieldName, validator]) => {
    const error = validator()
    if (error) {
      errors[fieldName] = error
    }
  })

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}
