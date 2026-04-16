import { useRef, useState, useCallback } from 'react'
import { uploadFiles } from '../../api/uploadApi'
import { extractErrorMessage } from '../../utils/dashboard/errorHandling'
import type { ActionFeedback, UseFileUploadReturn } from '../../types/dashboard'

interface UseFileUploadOptions {
  onUploadComplete?: () => void
}

export const useFileUpload = (options: UseFileUploadOptions = {}): UseFileUploadReturn => {
  const { onUploadComplete } = options
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null)

  const clearFeedback = useCallback(() => {
    setFeedback(null)
  }, [])

  const openFilePicker = useCallback(() => {
    setFeedback(null)
    fileInputRef.current?.click()
  }, [])

  const handleUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? [])
      event.target.value = ''

      if (files.length === 0) return

      const formData = new FormData()
      for (const file of files) {
        formData.append('files', file, file.name)
      }

      setIsUploading(true)
      setProgress(0)
      setFeedback(null)

      try {
        const result = await uploadFiles(formData, progressPercent => {
          setProgress(progressPercent)
        })
        const uploadedCount = result.uploaded?.length ?? files.length
        setFeedback({
          type: 'success',
          message: `تم رفع ${uploadedCount} ملف بنجاح`,
        })
        onUploadComplete?.()
      } catch (err: unknown) {
        const message = extractErrorMessage(err, 'فشل رفع الملفات')
        setFeedback({ type: 'error', message })
      } finally {
        setIsUploading(false)
        setProgress(0)
      }
    },
    [onUploadComplete]
  )

  return {
    isUploading,
    progress,
    feedback,
    fileInputRef,
    openFilePicker,
    handleUpload,
    clearFeedback,
  }
}
