/**
 * useFileExplorer Hook
 * Manages file and folder exploration state and operations
 */

import { useState, useCallback, useMemo, useRef } from 'react'
import { listUploadedObjects, fetchBulkPrivacySettings } from '../../../api/uploadApi'
import { subscribeRealtime } from '../../../api/realtimeApi'
import { useAuth } from '../../../contexts/AuthContext'
import type { FileObject, FilePrivacySettings } from '../types'
import {
  isHiddenChatUploadPath,
  isHiddenChatRootFolder,
  filterFiles,
  sortFiles,
  buildBreadcrumbs,
} from '../utils/fileUtils'

interface UseFileExplorerOptions {
  onError: (message: string) => void
  showTrash: boolean
}

export function useFileExplorer(options: UseFileExplorerOptions) {
  const { onError, showTrash } = options
  const { user } = useAuth()

  // Navigation state
  const [currentPath, setCurrentPath] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  // Data state
  const [foldersHere, setFoldersHere] = useState<string[]>([])
  const [filesHere, setFilesHere] = useState<FileObject[]>([])
  const [filePrivacySettings, setFilePrivacySettings] = useState<
    Record<string, FilePrivacySettings>
  >({})

  // Pagination state
  const [hasMoreFiles, setHasMoreFiles] = useState(true)
  const [nextContinuationToken, setNextContinuationToken] = useState<string | null>(null)
  const [isLoadingMoreFiles, setIsLoadingMoreFiles] = useState(false)
  const [totalFileCount, setTotalFileCount] = useState<number | null>(null)

  // Loading state
  const [loadingExplorer, setLoadingExplorer] = useState(false)

  // Filter and sort state
  const [fileFilter, setFileFilter] = useState<'all' | 'images' | 'videos' | 'documents'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date')
  const sortOrder = 'asc' as const

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Compute root prefix based on workspace
  const rootPrefix = useMemo(() => {
    const workspaceId = user?.workspaceId?.trim()
    return workspaceId ? `uploads/${workspaceId}` : 'uploads'
  }, [user?.workspaceId])

  // Compute explorer prefix
  const explorerPrefix = useMemo(() => {
    return currentPath.trim() ? `${rootPrefix}/${currentPath.trim()}` : rootPrefix
  }, [currentPath, rootPrefix])

  // Filtered and sorted files
  const filteredAndSortedFiles = useMemo(() => {
    const filtered = filterFiles(filesHere, fileFilter)
    return sortFiles(filtered, sortBy, sortOrder)
  }, [filesHere, fileFilter, sortBy, sortOrder])

  // Breadcrumbs
  const breadcrumbs = useMemo(() => buildBreadcrumbs(currentPath), [currentPath])

  // Fetch explorer data
  const fetchExplorer = useCallback(
    async (reset: boolean = true, continuationTokenOverride?: string | null) => {
      if (reset) {
        setLoadingExplorer(true)
        setFilesHere([])
        setHasMoreFiles(true)
        setNextContinuationToken(null)
        setTotalFileCount(null)
      } else {
        setIsLoadingMoreFiles(true)
      }

      try {
        const limit = 50
        const continuationToken = reset ? undefined : continuationTokenOverride || undefined
        const res = await listUploadedObjects(explorerPrefix, limit, true, continuationToken)
        const visibleObjects = (res.objects ?? []).filter(obj => !isHiddenChatUploadPath(obj.key))

        if (reset) {
          // Filter out system folders
          const filteredFolders = (res.folders ?? []).filter(folder => {
            const folderName = folder.split('/').filter(Boolean).pop()
            return (
              folderName !== 'workspace-assets' &&
              folderName !== 'workspace-logo' &&
              !isHiddenChatUploadPath(folder) &&
              !isHiddenChatRootFolder(folder, currentPath)
            )
          })
          setFoldersHere(filteredFolders)
          setFilesHere(visibleObjects)
        } else {
          setFilesHere(prev => [...prev, ...visibleObjects])
        }

        setHasMoreFiles(res.pagination?.hasMore ?? false)
        setNextContinuationToken(res.pagination?.nextContinuationToken ?? null)

        if (reset && res.pagination?.totalFileCount !== undefined) {
          setTotalFileCount(res.pagination.totalFileCount)
        }

        // Fetch privacy settings
        if (reset || (!continuationToken && res.objects)) {
          const fileKeys = visibleObjects.map(obj => obj.key)
          if (fileKeys.length > 0) {
            try {
              const privacyRes = await fetchBulkPrivacySettings(fileKeys)
              if (privacyRes.settings) {
                setFilePrivacySettings(prev => ({ ...prev, ...privacyRes.settings }))
              }
            } catch (privacyError) {
              console.error('Failed to fetch privacy settings:', privacyError)
            }
          }
        }
      } catch (e: unknown) {
        const err = e as { message?: string; response?: { data?: { message?: string } } }
        onError(err.response?.data?.message ?? err.message ?? 'فشل جلب الملفات')
      } finally {
        if (reset) {
          setLoadingExplorer(false)
        } else {
          setIsLoadingMoreFiles(false)
        }
      }
    },
    [currentPath, explorerPrefix, onError]
  )

  // Load more files
  const loadMoreFiles = useCallback(async () => {
    if (!hasMoreFiles || isLoadingMoreFiles || loadingExplorer) return
    await fetchExplorer(false, nextContinuationToken)
  }, [hasMoreFiles, isLoadingMoreFiles, loadingExplorer, fetchExplorer, nextContinuationToken])

  // Handle scroll for infinite loading
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
      if (scrollHeight - scrollTop - clientHeight < 200) {
        void loadMoreFiles()
      }
    },
    [loadMoreFiles]
  )

  // Check file access
  const canAccessFile = useCallback(
    (fileKey: string): boolean => {
      const privacy = filePrivacySettings[fileKey]
      if (!privacy) return true
      return privacy.canAccess !== false
    },
    [filePrivacySettings]
  )

  // Subscribe to realtime updates
  const subscribeToRealtime = useCallback(
    (fetchTrashFiles: () => Promise<void>) => {
      return subscribeRealtime(
        event => {
          if (event.scope !== 'files') return
          if (event.action === 'upload_progress') return
          void fetchExplorer(true)
          if (showTrash) {
            void fetchTrashFiles()
          }
        },
        () => {
          // page stays usable even if realtime stream reconnects
        }
      )
    },
    [fetchExplorer, showTrash]
  )

  return {
    // State
    currentPath,
    setCurrentPath,
    viewMode,
    setViewMode,
    foldersHere,
    filesHere,
    filePrivacySettings,
    setFilePrivacySettings,
    hasMoreFiles,
    isLoadingMoreFiles,
    totalFileCount,
    loadingExplorer,
    fileFilter,
    setFileFilter,
    sortBy,
    setSortBy,
    scrollContainerRef,

    // Computed
    rootPrefix,
    explorerPrefix,
    filteredAndSortedFiles,
    breadcrumbs,

    // Actions
    fetchExplorer,
    loadMoreFiles,
    handleScroll,
    canAccessFile,
    subscribeToRealtime,
  }
}
