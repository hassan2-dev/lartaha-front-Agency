import { useState, useCallback } from 'react'
import { validateLogoFile, readFileAsDataUrl } from '../utils/settingsUtils'

export interface UseLogoUploadReturn {
  logoFile: File | null
  logoPreview: string
  error: string | null
  handleLogoChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  clearLogo: () => void
  setLogoPreview: (preview: string) => void
}

export const useLogoUpload = (initialPreview = ''): UseLogoUploadReturn => {
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState(initialPreview)
  const [error, setError] = useState<string | null>(null)

  const handleLogoChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    const validation = validateLogoFile(file)
    if (!validation.isValid) {
      setError(validation.error || 'ملف غير صالح')
      return
    }

    setError(null)
    setLogoFile(file)

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setLogoPreview(dataUrl)
    } catch (err) {
      setError('فشل قراءة الملف')
      console.error('Failed to read file:', err)
    }
  }, [])

  const clearLogo = useCallback(() => {
    setLogoFile(null)
    setLogoPreview('')
    setError(null)
  }, [])

  return {
    logoFile,
    logoPreview,
    error,
    handleLogoChange,
    clearLogo,
    setLogoPreview,
  }
}
