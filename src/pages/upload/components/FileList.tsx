/**
 * FileList Component
 * Displays files in list or grid view with infinite scroll
 */

import { Box, Typography, CircularProgress } from '@mui/material'
import { FileItem } from './FileItem'
import { FileItemGrid } from './FileItemGrid'
import { FolderItem } from './FolderItem'
import { FolderItemGrid } from './FolderItemGrid'
import { TrashFileItem } from './TrashFileItem'
import {
  FileItemSkeleton,
  FileItemGridSkeleton,
  FolderItemSkeleton,
  FolderItemGridSkeleton,
} from '../../../components/SkeletonLoaders'
import type { FileObject, TrashedFile, ViewMode, FilePrivacySettings } from '../types'
import { keyToPublicUrl } from '../utils/fileUtils'

interface FileListProps {
  // View mode
  viewMode: ViewMode
  showTrash: boolean

  // Data
  folders: string[]
  files: FileObject[]
  trashFiles: TrashedFile[]
  filePrivacySettings: Record<string, FilePrivacySettings>
  totalFileCount: number | null

  // Loading states
  loadingExplorer: boolean
  loadingTrash: boolean
  isLoadingMoreFiles: boolean
  hasMoreFiles: boolean

  // Selection
  selectedForBulk: Set<string>
  deletingFiles: Set<string>
  deletingFolders: Set<string>
  currentPath: string

  // Refs
  scrollContainerRef: React.RefObject<HTMLDivElement | null>

  // Handlers
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void
  onNavigate: (path: string) => void
  onDeleteFolder: (path: string) => void
  onDownloadFolder: (path: string) => void
  onDeleteFile: (key: string) => void
  onPreview: (key: string, url: string) => void
  onDownloadFile: (key: string, filename: string) => void
  onPrivacyToggle: (key: string, filename: string) => void
  onToggleSelect: (key: string) => void
  onRestore: (key: string) => void
  canAccessFile: (key: string) => boolean
}

export function FileList({
  viewMode,
  showTrash,
  folders,
  files,
  trashFiles,
  filePrivacySettings,
  totalFileCount,
  loadingExplorer,
  loadingTrash,
  isLoadingMoreFiles,
  hasMoreFiles,
  selectedForBulk,
  deletingFiles,
  deletingFolders,
  currentPath,
  scrollContainerRef,
  onScroll,
  onNavigate,
  onDeleteFolder,
  onDownloadFolder,
  onDeleteFile,
  onPreview,
  onDownloadFile,
  onPrivacyToggle,
  onToggleSelect,
  onRestore,
  canAccessFile,
}: FileListProps) {
  // Render trash view
  if (showTrash) {
    if (loadingTrash && trashFiles.length === 0) {
      return (
        <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
          <FileItemSkeleton />
          <FileItemSkeleton />
          <FileItemSkeleton />
          <FileItemSkeleton />
          <FileItemSkeleton />
        </Box>
      )
    }

    if (trashFiles.length === 0) {
      return (
        <Typography variant="body2" sx={{ opacity: 0.7 }}>
          سلة المهملات فارغة.
        </Typography>
      )
    }

    return (
      <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
        {trashFiles.map(file => (
          <TrashFileItem
            key={file.id}
            file={file}
            onRestore={onRestore}
            selected={selectedForBulk.has(file.originalKey)}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </Box>
    )
  }

  // Render loading skeletons
  if (loadingExplorer && files.length === 0) {
    return (
      <>
        {/* Skeleton for folders */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ opacity: 0.75, mb: 1, fontWeight: 600 }}>
            المجلدات
          </Typography>
          {viewMode === 'list' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <FolderItemSkeleton />
              <FolderItemSkeleton />
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(3, 1fr)',
                  md: 'repeat(4, 1fr)',
                  lg: 'repeat(5, 1fr)',
                },
                gap: 2,
              }}
            >
              <FolderItemGridSkeleton />
              <FolderItemGridSkeleton />
              <FolderItemGridSkeleton />
            </Box>
          )}
        </Box>
        {/* Skeleton for files */}
        <Box>
          <Typography variant="body2" sx={{ opacity: 0.75, mb: 1, fontWeight: 600 }}>
            الملفات
          </Typography>
          {viewMode === 'list' ? (
            <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
              <FileItemSkeleton />
              <FileItemSkeleton />
              <FileItemSkeleton />
              <FileItemSkeleton />
              <FileItemSkeleton />
              <FileItemSkeleton />
            </Box>
          ) : (
            <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(2, 1fr)',
                    sm: 'repeat(3, 1fr)',
                    md: 'repeat(4, 1fr)',
                    lg: 'repeat(5, 1fr)',
                  },
                  gap: 2,
                }}
              >
                <FileItemGridSkeleton />
                <FileItemGridSkeleton />
                <FileItemGridSkeleton />
                <FileItemGridSkeleton />
                <FileItemGridSkeleton />
                <FileItemGridSkeleton />
              </Box>
            </Box>
          )}
        </Box>
      </>
    )
  }

  // Empty state
  if (folders.length === 0 && files.length === 0) {
    return (
      <Typography variant="body2" sx={{ opacity: 0.7 }}>
        لا يوجد شيء هنا (0).
      </Typography>
    )
  }

  // Render folders and files
  return (
    <>
      {folders.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ opacity: 0.75, mb: 1, fontWeight: 600 }}>
            المجلدات ({folders.length})
          </Typography>
          {viewMode === 'list' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {folders.map(p => {
                const cleaned = p.endsWith('/') ? p.slice(0, -1) : p
                const fullPath = currentPath ? `${currentPath}/${cleaned}` : cleaned
                return (
                  <FolderItem
                    key={p}
                    folderPath={fullPath}
                    onClick={() => onNavigate(fullPath)}
                    onDelete={onDeleteFolder}
                    onDownload={onDownloadFolder}
                    isDeleting={deletingFolders.has(fullPath)}
                  />
                )
              })}
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(3, 1fr)',
                  md: 'repeat(4, 1fr)',
                  lg: 'repeat(5, 1fr)',
                },
                gap: 2,
              }}
            >
              {folders.map(p => {
                const cleaned = p.endsWith('/') ? p.slice(0, -1) : p
                const fullPath = currentPath ? `${currentPath}/${cleaned}` : cleaned
                return (
                  <FolderItemGrid
                    key={p}
                    folderPath={fullPath}
                    onClick={() => onNavigate(fullPath)}
                    onDelete={onDeleteFolder}
                    onDownload={onDownloadFolder}
                    isDeleting={deletingFolders.has(fullPath)}
                  />
                )
              })}
            </Box>
          )}
        </Box>
      )}

      {files.length > 0 && (
        <Box>
          <Typography variant="body2" sx={{ opacity: 0.75, mb: 1, fontWeight: 600 }}>
            الملفات ({totalFileCount !== null ? totalFileCount : files.length})
          </Typography>
          {viewMode === 'list' ? (
            <Box
              ref={scrollContainerRef}
              sx={{ maxHeight: 500, overflow: 'auto' }}
              onScroll={onScroll}
            >
              {files.map(obj => {
                const url = keyToPublicUrl(obj.key)
                const thumbnailUrl = obj.thumbnailKey ? keyToPublicUrl(obj.thumbnailKey) : ''
                return (
                  <FileItem
                    key={obj.key}
                    obj={obj}
                    url={url}
                    thumbnailUrl={thumbnailUrl}
                    onDelete={onDeleteFile}
                    onPreview={onPreview}
                    onDownload={onDownloadFile}
                    onPrivacyToggle={onPrivacyToggle}
                    filePrivacySettings={filePrivacySettings}
                    canAccessFile={canAccessFile}
                    isDeleting={deletingFiles.has(obj.key)}
                    selected={selectedForBulk.has(obj.key)}
                    onToggleSelect={onToggleSelect}
                  />
                )
              })}
              {isLoadingMoreFiles && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" sx={{ ml: 2, opacity: 0.7 }}>
                    جاري تحميل المزيد من الملفات...
                  </Typography>
                </Box>
              )}
              {!hasMoreFiles && files.length > 0 && (
                <Typography variant="body2" sx={{ textAlign: 'center', opacity: 0.5, p: 2 }}>
                  تم تحميل جميع الملفات
                </Typography>
              )}
            </Box>
          ) : (
            <Box
              ref={scrollContainerRef}
              sx={{ maxHeight: 500, overflow: 'auto' }}
              onScroll={onScroll}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(2, 1fr)',
                    sm: 'repeat(3, 1fr)',
                    md: 'repeat(4, 1fr)',
                    lg: 'repeat(5, 1fr)',
                  },
                  gap: 2,
                }}
              >
                {files.map(obj => {
                  const url = keyToPublicUrl(obj.key)
                  const thumbnailUrl = obj.thumbnailKey ? keyToPublicUrl(obj.thumbnailKey) : ''
                  return (
                    <FileItemGrid
                      key={obj.key}
                      obj={obj}
                      url={url}
                      thumbnailUrl={thumbnailUrl}
                      onDelete={onDeleteFile}
                      onPreview={onPreview}
                      onDownload={onDownloadFile}
                      onPrivacyToggle={onPrivacyToggle}
                      filePrivacySettings={filePrivacySettings}
                      canAccessFile={canAccessFile}
                      isDeleting={deletingFiles.has(obj.key)}
                      selected={selectedForBulk.has(obj.key)}
                      onToggleSelect={onToggleSelect}
                    />
                  )
                })}
              </Box>
              {isLoadingMoreFiles && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, gridColumn: '1 / -1' }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" sx={{ ml: 2, opacity: 0.7 }}>
                    جاري تحميل المزيد من الملفات...
                  </Typography>
                </Box>
              )}
              {!hasMoreFiles && files.length > 0 && (
                <Typography
                  variant="body2"
                  sx={{ textAlign: 'center', opacity: 0.5, p: 2, gridColumn: '1 / -1' }}
                >
                  تم تحميل جميع الملفات
                </Typography>
              )}
            </Box>
          )}
        </Box>
      )}
    </>
  )
}
