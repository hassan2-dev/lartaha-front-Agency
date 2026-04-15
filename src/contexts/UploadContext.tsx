/**
 * Upload Context - Global upload state for persistent minimized toast
 * 
 * This context allows the upload progress to be visible across all dashboard pages
 * by storing upload state at the layout level (SideNav) rather than page level.
 */

import React, { createContext, useContext, useState, useCallback } from 'react'

export type UploadItemState = {
  fileKey: string
  fileId: string
  relativePath?: string
  source?: 'uppy' | 'external'
  status: 'idle' | 'uploading' | 'paused' | 'completed' | 'error'
  progress: number
  speed?: number // bytes per second
  bytesUploaded?: number
  totalBytes?: number
  thumbnailPreviewUrl?: string // Preview URL for thumbnail display
  'has-thumbnail'?: boolean // Flag indicating thumbnail is available
}

interface UploadContextType {
  // Upload items state
  uploadItems: Record<string, UploadItemState>
  setUploadItems: React.Dispatch<React.SetStateAction<Record<string, UploadItemState>>>
  updateUploadItem: (fileKey: string, updates: Partial<UploadItemState>) => void
  removeUploadItem: (fileKey: string) => void
  clearUploadItems: () => void

  // Modal visibility state
  showUploadModal: boolean
  setShowUploadModal: React.Dispatch<React.SetStateAction<boolean>>
  isMinimized: boolean
  setIsMinimized: React.Dispatch<React.SetStateAction<boolean>>

  // Success state
  showSuccess: boolean
  setShowSuccess: React.Dispatch<React.SetStateAction<boolean>>

  // Helper to check if all uploads are complete
  checkAllComplete: () => boolean

  // Active uploads count
  activeUploadsCount: number
  completedUploadsCount: number
  totalUploadsCount: number
}

const UploadContext = createContext<UploadContextType | undefined>(undefined)

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [uploadItems, setUploadItems] = useState<Record<string, UploadItemState>>({})
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const updateUploadItem = useCallback((fileKey: string, updates: Partial<UploadItemState>) => {
    setUploadItems((prev) => {
      const existing = prev[fileKey]
      if (!existing) return prev
      return {
        ...prev,
        [fileKey]: { ...existing, ...updates },
      }
    })
  }, [])

  const removeUploadItem = useCallback((fileKey: string) => {
    setUploadItems((prev) => {
      const next = { ...prev }
      delete next[fileKey]
      return next
    })
  }, [])

  const clearUploadItems = useCallback(() => {
    setUploadItems({})
    setShowSuccess(false)
  }, [])

  const checkAllComplete = useCallback(() => {
    const items = Object.values(uploadItems)
    const nonIdleItems = items.filter(item => item.status !== 'idle')
    if (nonIdleItems.length === 0) return false
    return nonIdleItems.every(item => item.status === 'completed')
  }, [uploadItems])

  const activeUploadsCount = Object.values(uploadItems).filter(
    item => item.status === 'uploading' || item.status === 'paused'
  ).length

  const completedUploadsCount = Object.values(uploadItems).filter(
    item => item.status === 'completed'
  ).length

  const totalUploadsCount = Object.values(uploadItems).filter(
    item => item.status !== 'idle'
  ).length

  return (
    <UploadContext.Provider
      value={{
        uploadItems,
        setUploadItems,
        updateUploadItem,
        removeUploadItem,
        clearUploadItems,
        showUploadModal,
        setShowUploadModal,
        isMinimized,
        setIsMinimized,
        showSuccess,
        setShowSuccess,
        checkAllComplete,
        activeUploadsCount,
        completedUploadsCount,
        totalUploadsCount,
      }}
    >
      {children}
    </UploadContext.Provider>
  )
}

export function useUpload() {
  const context = useContext(UploadContext)
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider')
  }
  return context
}
