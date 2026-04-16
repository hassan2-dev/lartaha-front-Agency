/**
 * useTrash Hook
 * Manages trash/recycle bin state and operations
 */

import { useState, useCallback } from 'react'
import {
  listTrashFiles,
  moveFileToTrash,
  restoreFileFromTrash,
  bulkMoveToTrash,
  bulkRestoreFromTrash,
} from '../../../api/uploadApi'
import type { TrashedFile } from '../types'

interface UseTrashOptions {
  onError: (message: string) => void
  onSuccess: (message: string) => void
  refreshExplorer: () => Promise<void>
}

export function useTrash(options: UseTrashOptions) {
  const { onError, onSuccess, refreshExplorer } = options

  const [showTrash, setShowTrash] = useState(false)
  const [trashFiles, setTrashFiles] = useState<TrashedFile[]>([])
  const [loadingTrash, setLoadingTrash] = useState(false)

  // Fetch trash files
  const fetchTrashFiles = useCallback(async () => {
    setLoadingTrash(true)
    try {
      const res = await listTrashFiles()
      setTrashFiles(res.files || [])
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      onError(err.response?.data?.message || err.message || 'خطأ غير معروف')
    } finally {
      setLoadingTrash(false)
    }
  }, [onError])

  // Delete file (move to trash)
  const handleDelete = useCallback(
    async (key: string) => {
      if (
        !confirm(
          'هل أنت متأكد من حذف هذا الملف؟ سيتم نقله إلى سلة المهملات وحذفه نهائياً بعد 7 أيام.'
        )
      ) {
        return false
      }

      try {
        await moveFileToTrash(key)
        onSuccess('تم نقل الملف إلى سلة المهملات بنجاح')
        await refreshExplorer()
        return true
      } catch (e: unknown) {
        const err = e as { message?: string; response?: { data?: { message?: string } } }
        onError(err.response?.data?.message || err.message || 'خطأ غير معروف')
        return false
      }
    },
    [onError, onSuccess, refreshExplorer]
  )

  // Restore file from trash
  const handleRestore = useCallback(
    async (key: string) => {
      if (!confirm('هل أنت متأكد من استعادة هذا الملف؟')) {
        return false
      }

      try {
        await restoreFileFromTrash(key)
        onSuccess('تم استعادة الملف بنجاح')
        await fetchTrashFiles()
        await refreshExplorer()
        return true
      } catch (e: unknown) {
        const err = e as { message?: string; response?: { data?: { message?: string } } }
        onError(err.response?.data?.message || err.message || 'خطأ غير معروف')
        return false
      }
    },
    [onError, onSuccess, fetchTrashFiles, refreshExplorer]
  )

  // Bulk delete
  const handleBulkDelete = useCallback(
    async (keys: string[]) => {
      if (keys.length === 0) return false
      if (!confirm(`هل أنت متأكد من حذف ${keys.length} ملفات؟ سيتم نقلها إلى سلة المهملات.`)) {
        return false
      }

      try {
        await bulkMoveToTrash(keys)
        onSuccess(`تم نقل ${keys.length} ملفات إلى سلة المهملات`)
        await refreshExplorer()
        return true
      } catch (e: unknown) {
        const err = e as { message?: string; response?: { data?: { message?: string } } }
        onError(err.response?.data?.message || err.message || 'خطأ غير معروف')
        return false
      }
    },
    [onError, onSuccess, refreshExplorer]
  )

  // Bulk restore
  const handleBulkRestore = useCallback(
    async (keys: string[]) => {
      if (keys.length === 0) return false
      if (!confirm(`هل أنت متأكد من استعادة ${keys.length} ملفات؟`)) {
        return false
      }

      try {
        await bulkRestoreFromTrash(keys)
        onSuccess(`تم استعادة ${keys.length} ملفات بنجاح`)
        await fetchTrashFiles()
        await refreshExplorer()
        return true
      } catch (e: unknown) {
        const err = e as { message?: string; response?: { data?: { message?: string } } }
        onError(err.response?.data?.message || err.message || 'خطأ غير معروف')
        return false
      }
    },
    [onError, onSuccess, fetchTrashFiles, refreshExplorer]
  )

  return {
    // State
    showTrash,
    setShowTrash,
    trashFiles,
    loadingTrash,

    // Actions
    fetchTrashFiles,
    handleDelete,
    handleRestore,
    handleBulkDelete,
    handleBulkRestore,
  }
}
