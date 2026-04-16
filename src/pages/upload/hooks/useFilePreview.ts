/**
 * useFilePreview Hook
 * Manages file preview modal state and encrypted file viewer
 */

import { useState, useCallback } from 'react'
import type { FileObject, PreviewFile, EncryptedViewerFile } from '../types'
import { filenameFromKey, getFileType } from '../utils/fileUtils'

interface UseFilePreviewOptions {
  files: FileObject[]
}

export function useFilePreview(options: UseFilePreviewOptions) {
  const { files } = options

  // Preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null)

  // Encrypted viewer state
  const [encryptedViewerOpen, setEncryptedViewerOpen] = useState(false)
  const [encryptedViewerFile, setEncryptedViewerFile] = useState<EncryptedViewerFile | null>(null)

  // Handle preview
  const handlePreview = useCallback(
    (key: string, url: string) => {
      const filename = filenameFromKey(key)
      const fileType = getFileType(filename)

      const fileMeta = files.find(file => file.key === key)
      if (
        fileMeta?.encryptionEnabled &&
        fileMeta.fileId &&
        fileMeta.encryptionIv &&
        fileMeta.encryptionSalt
      ) {
        setEncryptedViewerFile({
          fileId: fileMeta.fileId,
          filename,
          mimeType: fileMeta.mimeType,
          size: fileMeta.size,
          encryptionEnabled: fileMeta.encryptionEnabled,
          encryptionIv: fileMeta.encryptionIv,
          encryptionSalt: fileMeta.encryptionSalt,
        })
        setEncryptedViewerOpen(true)
        return
      }

      setPreviewFile({ key, url, filename, type: fileType })
      setPreviewModalOpen(true)
    },
    [files]
  )

  // Close preview
  const handleClosePreview = useCallback(() => {
    setPreviewModalOpen(false)
    setPreviewFile(null)
  }, [])

  // Close encrypted viewer
  const handleCloseEncryptedViewer = useCallback(() => {
    setEncryptedViewerOpen(false)
    setEncryptedViewerFile(null)
  }, [])

  return {
    // State
    previewModalOpen,
    previewFile,
    encryptedViewerOpen,
    encryptedViewerFile,

    // Actions
    handlePreview,
    handleClosePreview,
    handleCloseEncryptedViewer,
  }
}
