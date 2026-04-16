/**
 * useFolderOperations Hook
 * Manages folder creation, deletion, and download operations
 */

import { useState, useCallback } from 'react'
import { API_ENV, TOKEN_STORAGE_KEY } from '../../../config/api'
import { validateFolderName } from '../utils/fileUtils'

interface UseFolderOperationsOptions {
  onError: (message: string) => void
  onSuccess: (message: string) => void
  refreshExplorer: () => Promise<void>
  currentPath: string
  existingFolders: string[]
}

export function useFolderOperations(options: UseFolderOperationsOptions) {
  const { onError, onSuccess, refreshExplorer, currentPath, existingFolders } = options

  // Create folder state
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [folderNameError, setFolderNameError] = useState<string | null>(null)

  // Delete folder state
  const [deletingFolders, setDeletingFolders] = useState<Set<string>>(new Set())

  // Create folder
  const handleCreateFolder = useCallback(async () => {
    const trimmedName = newFolderName.trim()

    // Validate folder name
    const validation = validateFolderName(trimmedName, existingFolders)
    if (!validation.isValid) {
      setFolderNameError(validation.error || 'اسم المجلد غير صالح')
      return
    }

    setCreatingFolder(true)
    setFolderNameError(null)

    try {
      const folderPath = currentPath ? `${currentPath}/${trimmedName}` : trimmedName
      const token = localStorage.getItem('larthaa_auth_token')

      const response = await fetch(`${API_ENV.apiBaseUrl?.trim()}/api/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          name: trimmedName,
          path: folderPath,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          setFolderNameError('مجلد بهذا الاسم موجود بالفعل في هذا الموقع')
        } else {
          onError(data.message || 'فشل إنشاء المجلد')
        }
        return
      }

      onSuccess('تم إنشاء المجلد بنجاح')
      setNewFolderName('')
      setShowCreateFolderModal(false)
      await refreshExplorer()
    } catch (e: unknown) {
      const err = e as { message?: string }
      onError(err.message || 'خطأ غير معروف')
    } finally {
      setCreatingFolder(false)
    }
  }, [newFolderName, existingFolders, currentPath, onError, onSuccess, refreshExplorer])

  // Delete folder
  const handleDeleteFolder = useCallback(
    async (folderPath: string) => {
      if (!confirm('هل أنت متأكد من أنك تريد حذف هذا المجلد وجميع محتوياته؟')) {
        return false
      }

      setFolderNameError(null)
      setDeletingFolders(prev => new Set(prev).add(folderPath))

      try {
        const token = localStorage.getItem('larthaa_auth_token')

        const response = await fetch(`${API_ENV.apiBaseUrl?.trim()}/api/folders`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({ path: folderPath }),
        })

        if (!response.ok) {
          throw new Error('Failed to delete folder')
        }

        onSuccess('تم حذف المجلد بنجاح')
        await refreshExplorer()
        return true
      } catch (e: unknown) {
        const err = e as { message?: string }
        onError(err.message || 'خطأ غير معروف')
        return false
      } finally {
        setDeletingFolders(prev => {
          const next = new Set(prev)
          next.delete(folderPath)
          return next
        })
      }
    },
    [onError, onSuccess, refreshExplorer]
  )

  // Download folder as ZIP
  const handleDownloadFolder = useCallback(
    async (folderPath: string) => {
      try {
        const token = localStorage.getItem(TOKEN_STORAGE_KEY)
        const baseUrl = API_ENV.apiBaseUrl?.trim() || ''

        if (!token) {
          throw new Error('Missing auth token')
        }

        if (!baseUrl) {
          throw new Error('Missing API base URL')
        }

        const normalizedFolderPath = String(folderPath || '').replace(/^\/+|\/+$/g, '')
        const downloadUrl = `${baseUrl}/api/download/folder?path=${encodeURIComponent(normalizedFolderPath)}&token=${encodeURIComponent(token)}`

        // Poll for ZIP readiness
        let attempts = 0
        const maxAttempts = 30

        while (attempts < maxAttempts) {
          const response = await fetch(downloadUrl)

          if (response.status === 200) {
            const a = document.createElement('a')
            a.href = downloadUrl
            a.download = `${folderPath.split('/').pop() || 'folder'}.zip`
            a.rel = 'noreferrer'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            onSuccess('بدأ تنزيل المجلد')
            return true
          }

          if (response.status === 202) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            attempts++
            continue
          }

          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
          throw new Error(errorData.message || 'فشل في تحضير المجلد')
        }

        throw new Error('انتهت مهلة تحضير المجلد. يرجى المحاولة مرة أخرى.')
      } catch (error) {
        onError(error instanceof Error ? error.message : 'خطأ غير معروف')
        return false
      }
    },
    [onError, onSuccess]
  )

  return {
    // State
    showCreateFolderModal,
    setShowCreateFolderModal,
    newFolderName,
    setNewFolderName,
    creatingFolder,
    folderNameError,
    setFolderNameError,
    deletingFolders,

    // Actions
    handleCreateFolder,
    handleDeleteFolder,
    handleDownloadFolder,
  }
}
