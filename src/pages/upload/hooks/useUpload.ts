/**
 * useUpload Hook
 * Manages file upload state and operations
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  uploadFilesStreamed,
  createImageThumbnailBlob,
  createVideoThumbnailBlob,
} from '../../../api/uploadApi'
import { encryptThumbnailBlob } from '../../../lib/encryption'
import { useAuth } from '../../../contexts/AuthContext'
import type { SelectedUploadFile, UploadItemState } from '../types'
import { validateFileQuality, getFileType, filenameFromKey } from '../utils/fileUtils'
import { setClientEncryptionKey } from '../utils/encryptionStorage'

interface UseUploadOptions {
  onError: (message: string) => void
  onSuccess: (message: string) => void
  refreshExplorer: () => Promise<void>
  explorerPrefix: string
}

export function useUpload(options: UseUploadOptions) {
  const { onError, onSuccess, refreshExplorer, explorerPrefix } = options
  const { user } = useAuth()

  // Upload state
  const [selectedFiles, setSelectedFiles] = useState<SelectedUploadFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [encryptionPassword, setEncryptionPassword] = useState('')
  const [uploadItemStates, setUploadItemStates] = useState<Record<string, UploadItemState>>({})
  const [completedUploadedFiles, setCompletedUploadedFiles] = useState<Set<string>>(new Set())
  const [hasTriggeredUpload, setHasTriggeredUpload] = useState(false)

  const useStreamUpload = false
  const canUpload = useMemo(
    () => selectedFiles.length > 0 && !uploading,
    [selectedFiles, uploading]
  )

  // Initialize encryption password from workspace
  useEffect(() => {
    const workspaceId = user?.workspaceId?.trim()
    if (workspaceId) {
      setClientEncryptionKey(workspaceId)
      setEncryptionPassword(workspaceId)
      return
    }
  }, [user?.workspaceId])

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (!useStreamUpload) return

    if (selectedFiles.length === 0) {
      onError('يرجى اختيار ملفات أو مجلد للرفع.')
      return
    }

    // Validate file quality
    const qualityWarnings: string[] = []
    selectedFiles.forEach(sf => {
      const validation = validateFileQuality(sf.file)
      if (!validation.isValid) {
        qualityWarnings.push(...validation.warnings)
      }
    })

    if (qualityWarnings.length > 0) {
      const warningMessage = `تحذيرات الجودة:\n${qualityWarnings.join('\n')}\n\nهل تريد المتابعة في الرفع؟`
      if (!confirm(warningMessage)) {
        return
      }
    }

    setUploading(true)

    // Initialize upload item states
    const initialStates: Record<string, UploadItemState> = {}
    selectedFiles.forEach(sf => {
      const fileKey = `${sf.relativePath}_${sf.file.size}`
      initialStates[fileKey] = {
        fileKey,
        fileId: '',
        status: 'uploading',
        progress: 0,
        speed: 0,
        bytesUploaded: 0,
        totalBytes: sf.file.size,
      }
    })
    setUploadItemStates(initialStates)

    try {
      const hasFolderStructure = selectedFiles.some(sf => sf.relativePath.includes('/'))
      let rootFolderName = ''

      if (hasFolderStructure) {
        const firstFileWithPath = selectedFiles.find(sf => sf.relativePath.includes('/'))
        if (firstFileWithPath) {
          rootFolderName = firstFileWithPath.relativePath.split('/')[0]
        }
      }

      // Prepare files for upload
      const filesToUpload = selectedFiles
        .filter(sf => !completedUploadedFiles.has(sf.file.name))
        .map(async sf => {
          const encryptionResult = sf.encryptionResult
          const hasEncryption = !!encryptionResult
          const iv = encryptionResult?.iv
          const salt = encryptionResult?.salt
          const thumbnailUploadFile = sf.thumbnailUploadFile || null

          if (!thumbnailUploadFile) {
            try {
              const filename = filenameFromKey(sf.relativePath)
              const fileType = getFileType(filename)
              if (fileType === 'image') {
                const thumb = await createImageThumbnailBlob(sf.file)
                if (thumb) {
                  const encryptedThumb = await encryptThumbnailBlob(thumb, encryptionPassword)
                  return {
                    file: sf.uploadFile ?? sf.file,
                    relativePath: sf.relativePath,
                    encryptionEnabled: hasEncryption,
                    encryptionIv: iv,
                    encryptionSalt: salt,
                    thumbnailUploadFile: new File(
                      [encryptedThumb],
                      `thumb_${sf.relativePath}.bin`,
                      { type: 'application/octet-stream' }
                    ),
                  }
                }
              } else if (fileType === 'video') {
                const thumb = await createVideoThumbnailBlob(sf.file)
                if (thumb) {
                  const encryptedThumb = await encryptThumbnailBlob(thumb, encryptionPassword)
                  return {
                    file: sf.uploadFile ?? sf.file,
                    relativePath: sf.relativePath,
                    encryptionEnabled: hasEncryption,
                    encryptionIv: iv,
                    encryptionSalt: salt,
                    thumbnailUploadFile: new File(
                      [encryptedThumb],
                      `thumb_${sf.relativePath}.bin`,
                      { type: 'application/octet-stream' }
                    ),
                  }
                }
              }
            } catch {
              // ignore thumbnail errors
            }
          }

          return {
            file: sf.uploadFile ?? sf.file,
            relativePath: sf.relativePath,
            encryptionEnabled: hasEncryption,
            encryptionIv: iv,
            encryptionSalt: salt,
            thumbnailUploadFile,
          }
        })

      const resolvedFilesToUpload = await Promise.all(filesToUpload)

      const res = await uploadFilesStreamed(resolvedFilesToUpload, {
        batchName: explorerPrefix,
        ...(rootFolderName ? { folderName: rootFolderName } : {}),
        skipFiles: completedUploadedFiles,
        onUploadProgress: progress => {
          const { currentFileIndex, progressPercent, bytesUploaded, totalBytes, uploadSpeed } =
            progress
          resolvedFilesToUpload.forEach((file, idx) => {
            const fileKey = `${file.relativePath}_${file.file.size}`
            if (idx < currentFileIndex - 1) {
              setUploadItemStates(prev => ({
                ...prev,
                [fileKey]: {
                  ...prev[fileKey],
                  status: 'completed',
                  progress: 100,
                  speed: 0,
                  bytesUploaded: file.file.size,
                  totalBytes: file.file.size,
                },
              }))
            } else if (idx === currentFileIndex - 1) {
              setUploadItemStates(prev => ({
                ...prev,
                [fileKey]: {
                  ...prev[fileKey],
                  status: 'uploading',
                  progress: progressPercent,
                  speed: uploadSpeed,
                  bytesUploaded,
                  totalBytes,
                },
              }))
            }
          })
        },
      })

      const uploaded = res.uploaded ?? []
      uploaded.forEach(item => {
        setCompletedUploadedFiles(prev => new Set(prev).add(item.key))
      })

      onSuccess(`تم الرفع بنجاح. عدد الملفات: ${uploaded.length}`)
      setSelectedFiles([])
      setCompletedUploadedFiles(new Set())
      await refreshExplorer()
    } catch (e: unknown) {
      const err = e as {
        message?: string
        response?: { data?: { message?: string; error?: string }; status?: number }
      }
      const backendMsg = err.response?.data?.message ?? err.response?.data?.error

      if (err.response?.status === 409) {
        onError('مجلد بهذا الاسم موجود بالفعل. يرجى استخدام اسم مختلف.')
      } else {
        onError(backendMsg ?? err.message ?? 'خطأ غير معروف')
      }
    } finally {
      setUploading(false)
      setHasTriggeredUpload(false)
    }
  }, [
    selectedFiles,
    completedUploadedFiles,
    encryptionPassword,
    explorerPrefix,
    onError,
    onSuccess,
    refreshExplorer,
  ])

  // Auto-upload effect
  useEffect(() => {
    // useStreamUpload is a constant flag for future feature
    const shouldAutoUpload = false
    if (shouldAutoUpload && canUpload && selectedFiles.length > 0 && !hasTriggeredUpload) {
      setHasTriggeredUpload(true)
      void handleUpload()
    } else if (selectedFiles.length === 0) {
      setHasTriggeredUpload(false)
    }
  }, [canUpload, selectedFiles.length, hasTriggeredUpload, handleUpload])

  return {
    // State
    selectedFiles,
    setSelectedFiles,
    uploading,
    encryptionPassword,
    uploadItemStates,
    canUpload,

    // Actions
    handleUpload,
  }
}
