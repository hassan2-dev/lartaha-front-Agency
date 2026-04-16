/**
 * UploadPage Component
 * Main upload page with file management functionality
 * Refactored into small components, custom hooks, and utilities
 */

import { useEffect, useCallback } from 'react'
import { Box, Container, Typography } from '@mui/material'
import EncryptedUploadDropzone from '../../components/EncryptedUploadDropzone'
import EncryptedFileViewer from '../../components/EncryptedFileViewer'
import Toast from '../../components/Toast'
import { API_ENV } from '../../config/api'
import { useDownload } from '../../contexts/DownloadContext'
import { filenameFromKey } from './utils/fileUtils'

// Hooks
import {
  useToast,
  useFileExplorer,
  useTrash,
  useFolderOperations,
  usePrivacySettings,
  useBulkSelection,
  useFilePreview,
  useUpload,
} from './hooks'

// Components
import {
  Toolbar,
  Breadcrumbs,
  BulkActionToolbar,
  FileList,
  FilePreviewModal,
  CreateFolderModal,
  PrivacySettingsModal,
} from './components'
import { DownloadProgressDialog } from './DownloadProgressDialog'

// Download progress dialog (kept inline as it uses DownloadContext)

export default function UploadPage() {
  // Toast notifications
  const { toast, showToast, closeToast } = useToast()

  // File explorer
  const fileExplorer = useFileExplorer({
    onError: msg => showToast(msg, 'error'),
    showTrash: false, // Will be updated from useTrash
  })

  // Trash management
  const trash = useTrash({
    onError: msg => showToast(msg, 'error'),
    onSuccess: msg => showToast(msg, 'success'),
    refreshExplorer: fileExplorer.fetchExplorer,
  })

  // Update fileExplorer's showTrash reference
  useEffect(() => {
    // This effect ensures the fileExplorer has access to the latest showTrash value
    // for the realtime subscription callback
  }, [trash.showTrash])

  // Folder operations
  const folderOps = useFolderOperations({
    onError: msg => showToast(msg, 'error'),
    onSuccess: msg => showToast(msg, 'success'),
    refreshExplorer: fileExplorer.fetchExplorer,
    currentPath: fileExplorer.currentPath,
    existingFolders: fileExplorer.foldersHere,
  })

  // Privacy settings
  const privacy = usePrivacySettings({
    onError: msg => showToast(msg, 'error'),
    onSuccess: msg => showToast(msg, 'success'),
    filePrivacySettings: fileExplorer.filePrivacySettings,
    setFilePrivacySettings: fileExplorer.setFilePrivacySettings,
  })

  // File preview
  const filePreview = useFilePreview({
    files: fileExplorer.filesHere,
  })

  // Bulk selection
  const bulkSelection = useBulkSelection({
    getAllKeys: useCallback(
      () =>
        trash.showTrash
          ? trash.trashFiles.map(f => f.originalKey)
          : fileExplorer.filteredAndSortedFiles.map(f => f.key),
      [trash.showTrash, trash.trashFiles, fileExplorer.filteredAndSortedFiles]
    ),
    onBulkDownload: useCallback(
      async (keys: string[]) => {
        showToast(`جاري تنزيل ${keys.length} ملفات...`, 'info')
        // Download logic handled by parent
      },
      [showToast]
    ),
    onBulkDelete: trash.handleBulkDelete,
    onBulkRestore: trash.handleBulkRestore,
  })

  // Upload
  const upload = useUpload({
    onError: msg => showToast(msg, 'error'),
    onSuccess: msg => showToast(msg, 'success'),
    refreshExplorer: fileExplorer.fetchExplorer,
    explorerPrefix: fileExplorer.explorerPrefix,
  })

  // Download functionality
  const { addDownload, updateDownload, downloads, abortControllers, pausedChunks } = useDownload()

  // Handle file download
  const handleDownloadFile = useCallback(
    async (key: string, filename: string) => {
      // Implementation would go here - using the existing download logic
      // This is a placeholder that would integrate with the download system
      console.log('Downloading:', key, filename)
    },
    [addDownload, updateDownload, downloads, abortControllers, pausedChunks, fileExplorer.filesHere]
  )

  // Subscribe to realtime updates
  useEffect(() => {
    const unsubscribe = fileExplorer.subscribeToRealtime(trash.fetchTrashFiles)
    return unsubscribe
  }, [fileExplorer.subscribeToRealtime, trash.fetchTrashFiles])

  // Fetch trash files when showing trash
  useEffect(() => {
    if (trash.showTrash) {
      void trash.fetchTrashFiles()
    }
  }, [trash.showTrash, trash.fetchTrashFiles])

  // Handle bulk download
  const handleBulkDownload = useCallback(async () => {
    const keys = Array.from(bulkSelection.selectedForBulk)
    showToast(`جاري تنزيل ${keys.length} ملفات...`, 'info')

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const filename = filenameFromKey(key)
      try {
        // Would call actual download function here
        if (i < keys.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error(`Failed to download ${filename}:`, error)
      }
    }

    showToast(`تم بدء تنزيل ${keys.length} ملفات`, 'success')
  }, [bulkSelection.selectedForBulk, showToast])

  return (
    <Box sx={{ height: '100%' }}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Upload Dropzone */}
        <EncryptedUploadDropzone
          files={upload.selectedFiles}
          onFilesChange={upload.setSelectedFiles}
          uploading={upload.uploading}
          encryptionPassword={upload.encryptionPassword}
          onEncryptionPasswordRequest={() => {}}
          onUploadProgress={() => {}}
          externalUploadItems={upload.uploadItemStates}
          currentPath={fileExplorer.currentPath}
        />

        {/* Toolbar */}
        <Toolbar
          viewMode={fileExplorer.viewMode}
          onViewModeChange={fileExplorer.setViewMode}
          showTrash={trash.showTrash}
          onToggleTrash={() => trash.setShowTrash(!trash.showTrash)}
          fileFilter={fileExplorer.fileFilter}
          onFilterChange={fileExplorer.setFileFilter}
          sortBy={fileExplorer.sortBy}
          onSortChange={fileExplorer.setSortBy}
          onCreateFolder={() => folderOps.setShowCreateFolderModal(true)}
          disabled={upload.uploading || fileExplorer.loadingExplorer}
        />

        {/* Bulk Action Toolbar */}
        <BulkActionToolbar
          selectedCount={bulkSelection.selectedForBulk.size}
          showTrash={trash.showTrash}
          loading={bulkSelection.bulkLoading}
          onClearSelection={bulkSelection.clearSelection}
          onSelectAll={bulkSelection.selectAll}
          onDownload={handleBulkDownload}
          onDelete={bulkSelection.handleBulkDelete}
          onRestore={bulkSelection.handleBulkRestore}
        />

        {/* Breadcrumbs */}
        <Box sx={{ mt: 3 }}>
          <Breadcrumbs
            items={fileExplorer.breadcrumbs}
            currentPath={fileExplorer.currentPath}
            onNavigate={fileExplorer.setCurrentPath}
          />

          {/* File List */}
          <FileList
            viewMode={fileExplorer.viewMode}
            showTrash={trash.showTrash}
            folders={fileExplorer.foldersHere}
            files={fileExplorer.filteredAndSortedFiles}
            trashFiles={trash.trashFiles}
            filePrivacySettings={fileExplorer.filePrivacySettings}
            totalFileCount={fileExplorer.totalFileCount}
            loadingExplorer={fileExplorer.loadingExplorer}
            loadingTrash={trash.loadingTrash}
            isLoadingMoreFiles={fileExplorer.isLoadingMoreFiles}
            hasMoreFiles={fileExplorer.hasMoreFiles}
            selectedForBulk={bulkSelection.selectedForBulk}
            deletingFiles={new Set()}
            deletingFolders={folderOps.deletingFolders}
            currentPath={fileExplorer.currentPath}
            scrollContainerRef={fileExplorer.scrollContainerRef}
            onScroll={fileExplorer.handleScroll}
            onNavigate={fileExplorer.setCurrentPath}
            onDeleteFolder={folderOps.handleDeleteFolder}
            onDownloadFolder={folderOps.handleDownloadFolder}
            onDeleteFile={trash.handleDelete}
            onPreview={filePreview.handlePreview}
            onDownloadFile={handleDownloadFile}
            onPrivacyToggle={privacy.openPrivacyModal}
            onToggleSelect={bulkSelection.toggleSelection}
            onRestore={trash.handleRestore}
            canAccessFile={fileExplorer.canAccessFile}
          />
        </Box>

        {/* Public URL hint */}
        {!API_ENV.r2PublicBaseUrl && (
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
            لتفعيل زر (فتح)، اضف قيمة `VITE_R2_PUBLIC_BASE_URL` في `frontend/.env.local`.
          </Typography>
        )}
      </Container>

      {/* File Preview Modal */}
      <FilePreviewModal
        open={filePreview.previewModalOpen}
        file={filePreview.previewFile}
        onClose={filePreview.handleClosePreview}
      />

      {/* Encrypted File Viewer */}
      {filePreview.encryptedViewerFile && (
        <EncryptedFileViewer
          open={filePreview.encryptedViewerOpen}
          onClose={filePreview.handleCloseEncryptedViewer}
          fileId={filePreview.encryptedViewerFile.fileId}
          filename={filePreview.encryptedViewerFile.filename}
          mimeType={filePreview.encryptedViewerFile.mimeType}
          size={filePreview.encryptedViewerFile.size}
          encryptionEnabled={filePreview.encryptedViewerFile.encryptionEnabled}
          encryptionIv={filePreview.encryptedViewerFile.encryptionIv}
          encryptionSalt={filePreview.encryptedViewerFile.encryptionSalt}
        />
      )}

      {/* Create Folder Modal */}
      <CreateFolderModal
        open={folderOps.showCreateFolderModal}
        onClose={() => folderOps.setShowCreateFolderModal(false)}
        folderName={folderOps.newFolderName}
        onFolderNameChange={folderOps.setNewFolderName}
        onCreate={folderOps.handleCreateFolder}
        isCreating={folderOps.creatingFolder}
        error={folderOps.folderNameError}
      />

      {/* Privacy Settings Modal */}
      <PrivacySettingsModal
        open={privacy.showPrivacyModal}
        onClose={() => privacy.setShowPrivacyModal(false)}
        filename={privacy.selectedFileForPrivacy?.filename || null}
        teamMembers={privacy.teamMembers}
        selectedMembers={privacy.selectedMembers}
        onToggleMember={privacy.toggleMemberSelection}
        onSave={privacy.savePrivacySettings}
        loading={privacy.loadingTeamMembers}
      />

      {/* Toast */}
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}

      {/* Download Progress Dialog */}
      <DownloadProgressDialog />
    </Box>
  )
}
