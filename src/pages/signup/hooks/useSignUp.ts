import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../../api/http'
import { useAuth } from '../../../contexts/AuthContext'
import type { AdminData, WorkspaceData } from '../types'
import {
  validateAdminData,
  validateWorkspaceData,
  validateLogoFile,
  buildLogoUrl,
  createFilePreview,
  revokeFilePreview,
} from '../utils'

const STEPS_COUNT = 3

export const useSignUp = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [adminData, setAdminData] = useState<AdminData>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  })

  const [workspaceData, setWorkspaceData] = useState<WorkspaceData>({
    name: '',
    industry: '',
    logo: '',
    logoFile: null,
  })

  // Track preview URL for cleanup
  const previewUrlRef = useRef<string>('')

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        revokeFilePreview(previewUrlRef.current)
      }
    }
  }, [])

  const clearError = useCallback(() => setError(''), [])

  const nextStep = useCallback(() => {
    setActiveStep(prev => Math.min(prev + 1, STEPS_COUNT - 1))
    clearError()
  }, [clearError])

  const prevStep = useCallback(() => {
    setActiveStep(prev => Math.max(prev - 1, 0))
    clearError()
  }, [clearError])

  const updateAdminData = useCallback(
    (field: keyof AdminData, value: string) => {
      setAdminData(prev => ({ ...prev, [field]: value }))
      if (error) clearError()
    },
    [error, clearError]
  )

  const updateWorkspaceData = useCallback(
    (field: keyof WorkspaceData, value: string) => {
      setWorkspaceData(prev => ({ ...prev, [field]: value }))
      if (error) clearError()
    },
    [error, clearError]
  )

  const handleLogoUpload = useCallback(
    (file: File) => {
      const validation = validateLogoFile(file)
      if (!validation.isValid) {
        setError(validation.error)
        return
      }

      // Revoke old preview if exists
      if (previewUrlRef.current) {
        revokeFilePreview(previewUrlRef.current)
      }

      const previewUrl = createFilePreview(file)
      previewUrlRef.current = previewUrl

      setWorkspaceData(prev => ({
        ...prev,
        logoFile: file,
        logo: previewUrl,
      }))
      clearError()
    },
    [clearError]
  )

  const handleLogoRemove = useCallback(() => {
    if (previewUrlRef.current) {
      revokeFilePreview(previewUrlRef.current)
      previewUrlRef.current = ''
    }

    setWorkspaceData(prev => ({
      ...prev,
      logoFile: null,
      logo: '',
    }))
  }, [])

  const uploadLogo = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('files', file)
    formData.append('batchName', 'workspace-logo')

    const response = await api.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    const logoKey = response.data.uploaded?.[0]?.key || ''
    return logoKey ? buildLogoUrl(logoKey) : ''
  }

  const createAdminAccount = async (): Promise<void> => {
    await api.post('/api/auth/signup', {
      email: adminData.email.trim(),
      password: adminData.password,
      name: adminData.name.trim(),
    })

    await login({
      username: adminData.email.trim(),
      password: adminData.password,
    })
  }

  const createWorkspace = async (): Promise<void> => {
    let logoUrl = ''

    if (workspaceData.logoFile) {
      try {
        logoUrl = await uploadLogo(workspaceData.logoFile)
      } catch (uploadError) {
        console.error('Logo upload failed:', uploadError)
        // Continue without logo if upload fails
      }
    }

    await api.post('/api/workspaces', {
      name: workspaceData.name.trim(),
      industry: workspaceData.industry.trim() || undefined,
      logo: logoUrl || undefined,
    })
  }

  const handleAdminSubmit = async (): Promise<void> => {
    const validation = validateAdminData(adminData)
    if (!validation.isValid) {
      setError(validation.error)
      return
    }

    setLoading(true)
    setError('')

    try {
      await createAdminAccount()
      nextStep()
    } catch (err: any) {
      setError(err.response?.data?.message || 'فشل في إنشاء الحساب')
    } finally {
      setLoading(false)
    }
  }

  const handleWorkspaceSubmit = async (): Promise<void> => {
    const validation = validateWorkspaceData(workspaceData)
    if (!validation.isValid) {
      setError(validation.error)
      return
    }

    setLoading(true)
    setError('')

    try {
      await createWorkspace()
      nextStep()
    } catch (err: any) {
      console.error('Workspace creation error:', err)
      setError(err.response?.data?.message || 'فشل في إنشاء مساحة العمل')
    } finally {
      setLoading(false)
    }
  }

  const handleFinish = useCallback(() => {
    navigate('/dashboard/teams')
  }, [navigate])

  const togglePassword = useCallback(() => {
    setShowPassword(prev => !prev)
  }, [])

  const toggleConfirmPassword = useCallback(() => {
    setShowConfirmPassword(prev => !prev)
  }, [])

  return {
    // State
    activeStep,
    loading,
    error,
    showPassword,
    showConfirmPassword,
    adminData,
    workspaceData,

    // Actions
    setActiveStep,
    nextStep,
    prevStep,
    clearError,
    updateAdminData,
    updateWorkspaceData,
    handleLogoUpload,
    handleLogoRemove,
    handleAdminSubmit,
    handleWorkspaceSubmit,
    handleFinish,
    togglePassword,
    toggleConfirmPassword,
  }
}
