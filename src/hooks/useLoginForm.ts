import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { requestPasswordReset } from '../api/authApi'
import { validateEmail, validateRequired } from '../utils/validation'

interface LoginFormState {
  email: string
  password: string
  showPassword: boolean
  isLoading: boolean
  localError: string | null
}

interface ForgotPasswordState {
  isLoading: boolean
  message: string | null
  error: string | null
}

interface UseLoginFormReturn {
  // Form state
  email: string
  password: string
  showPassword: boolean
  isLoading: boolean
  displayedError: string | null

  // Forgot password state
  forgotLoading: boolean
  forgotMessage: string | null
  forgotError: string | null

  // Actions
  setEmail: (email: string) => void
  setPassword: (password: string) => void
  toggleShowPassword: () => void
  handleSubmit: (e: React.FormEvent) => Promise<void>
  handleForgotPassword: () => Promise<void>
}

export function useLoginForm(): UseLoginFormReturn {
  const navigate = useNavigate()
  const { token, login, error: authError } = useAuth()

  const [formState, setFormState] = useState<LoginFormState>({
    email: '',
    password: '',
    showPassword: false,
    isLoading: false,
    localError: null,
  })

  const [forgotState, setForgotState] = useState<ForgotPasswordState>({
    isLoading: false,
    message: null,
    error: null,
  })

  // Redirect if already authenticated
  useEffect(() => {
    if (token) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate, token])

  const setEmail = useCallback((email: string) => {
    setFormState(prev => ({ ...prev, email, localError: null }))
  }, [])

  const setPassword = useCallback((password: string) => {
    setFormState(prev => ({ ...prev, password, localError: null }))
  }, [])

  const toggleShowPassword = useCallback(() => {
    setFormState(prev => ({ ...prev, showPassword: !prev.showPassword }))
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      // Validation
      const emailError = validateRequired(formState.email, 'البريد الإلكتروني')
      const passwordError = validateRequired(formState.password, 'كلمة المرور')

      if (emailError || passwordError) {
        setFormState(prev => ({
          ...prev,
          localError: 'يرجى إدخال البريد الإلكتروني وكلمة المرور.',
        }))
        return
      }

      if (!validateEmail(formState.email)) {
        setFormState(prev => ({
          ...prev,
          localError: 'يرجى إدخال بريد إلكتروني صحيح.',
        }))
        return
      }

      setFormState(prev => ({ ...prev, isLoading: true, localError: null }))

      try {
        // Clear existing token before logging in
        localStorage.removeItem('token')

        await login({ username: formState.email.trim(), password: formState.password })
        navigate('/dashboard', { replace: true })
      } catch {
        setFormState(prev => ({
          ...prev,
          localError: 'فشل تسجيل الدخول. تأكد من البريد الإلكتروني وكلمة المرور.',
        }))
      } finally {
        setFormState(prev => ({ ...prev, isLoading: false }))
      }
    },
    [formState.email, formState.password, login, navigate]
  )

  const handleForgotPassword = useCallback(async () => {
    setForgotState({ isLoading: false, message: null, error: null })

    const emailError = validateRequired(formState.email, 'البريد الإلكتروني')
    if (emailError) {
      setForgotState(prev => ({
        ...prev,
        error: 'يرجى إدخال البريد الإلكتروني أولاً.',
      }))
      return
    }

    if (!validateEmail(formState.email)) {
      setForgotState(prev => ({
        ...prev,
        error: 'يرجى إدخال بريد إلكتروني صحيح.',
      }))
      return
    }

    setForgotState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await requestPasswordReset(formState.email.trim())
      setForgotState(prev => ({
        ...prev,
        message: response.message || 'إذا كان البريد مسجلاً، سيتم إرسال رابط إعادة التعيين.',
      }))
    } catch (err) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setForgotState(prev => ({
        ...prev,
        error: message || 'تعذر إرسال رابط إعادة تعيين كلمة المرور.',
      }))
    } finally {
      setForgotState(prev => ({ ...prev, isLoading: false }))
    }
  }, [formState.email])

  const displayedError =
    formState.localError ??
    (authError ? 'فشل تسجيل الدخول. تأكد من البريد الإلكتروني وكلمة المرور.' : null)

  return {
    email: formState.email,
    password: formState.password,
    showPassword: formState.showPassword,
    isLoading: formState.isLoading,
    displayedError,
    forgotLoading: forgotState.isLoading,
    forgotMessage: forgotState.message,
    forgotError: forgotState.error,
    setEmail,
    setPassword,
    toggleShowPassword,
    handleSubmit,
    handleForgotPassword,
  }
}
