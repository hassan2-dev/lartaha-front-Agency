/**
 * useToast Hook
 * Manages toast notification state and actions
 */

import { useState, useCallback } from 'react'

export interface ToastState {
  show: boolean
  message: string
  type: 'error' | 'success' | 'info'
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    type: 'error',
  })

  const showToast = useCallback((message: string, type: 'error' | 'success' | 'info' = 'error') => {
    setToast({ show: true, message, type })
  }, [])

  const closeToast = useCallback(() => {
    setToast(prev => ({ ...prev, show: false, message: '' }))
  }, [])

  return {
    toast,
    showToast,
    closeToast,
  }
}
