import { API_ENV } from '../../../config/api'

/**
 * Validates a logo file for upload
 * @param file - The file to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export const validateLogoFile = (file: File): { isValid: boolean; error?: string } => {
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'يجب اختيار ملف صورة' }
  }

  const MAX_SIZE_MB = 5
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return { isValid: false, error: `حجم الملف يجب أن يكون أقل من ${MAX_SIZE_MB} ميجابايت` }
  }

  return { isValid: true }
}

/**
 * Reads a file as a data URL for preview
 * @param file - The file to read
 * @returns Promise resolving to the data URL
 */
export const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Uploads a logo file to the server
 * @param file - The logo file to upload
 * @returns Promise resolving to the uploaded file URL
 */
export const uploadLogoFile = async (file: File): Promise<string> => {
  const formData = new FormData()
  formData.append('files', file)
  formData.append('batchName', 'workspace-assets')

  const token = localStorage.getItem('larthaa_auth_token')
  const response = await fetch(API_ENV.uploadPath, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Failed to upload logo')
  }

  const data = await response.json()

  if (!data.uploaded?.[0]?.key) {
    throw new Error('Invalid upload response')
  }

  const baseUrl = (API_ENV.r2PublicBaseUrl || '').replace(/\/+$/, '')
  const safeKey = data.uploaded[0].key.replace(/^\/+/, '')
  return `${baseUrl}/${safeKey}`
}

/**
 * Formats file size for display
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "2.5 GB")
 */
export const formatFileSize = (bytes: number): string => {
  const units = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت', 'تيرابايت']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}

/**
 * Calculates storage percentage
 * @param used - Used storage in bytes
 * @param total - Total storage in bytes
 * @returns Percentage (0-100)
 */
export const calculateStoragePercentage = (used: number, total: number): number => {
  if (total === 0) return 0
  return Math.min(100, Math.round((used / total) * 100))
}

/**
 * Debounces a function call
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */

export const debounce = <T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}
