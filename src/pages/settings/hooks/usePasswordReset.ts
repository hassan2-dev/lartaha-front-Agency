import { useState, useCallback } from 'react'
import { requestPasswordReset } from '../../../api/authApi'

export interface UsePasswordResetReturn {
  loading: boolean
  message: string
  error: string
  requestReset: (email: string) => Promise<void>
  clearMessages: () => void
}

export const usePasswordReset = (): UsePasswordResetReturn => {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const requestReset = useCallback(async (email: string) => {
    if (!email) {
      setError('لا يوجد بريد إلكتروني مرتبط بالحساب.')
      return
    }

    setError('')
    setMessage('')

    try {
      setLoading(true)
      const response = await requestPasswordReset(email)
      setMessage(response.message || 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.')
    } catch (err) {
      const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data
        ?.error
      setError(errorMessage || 'تعذر إرسال رابط إعادة تعيين كلمة المرور.')
    } finally {
      setLoading(false)
    }
  }, [])

  const clearMessages = useCallback(() => {
    setMessage('')
    setError('')
  }, [])

  return {
    loading,
    message,
    error,
    requestReset,
    clearMessages,
  }
}
