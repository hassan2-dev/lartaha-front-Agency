import { zip } from 'fflate'
import { api } from './http'
import { API_ENV, TOKEN_STORAGE_KEY } from '../config/api'
import { decryptEncryptedBlobForDownload } from '../lib/encryption'
import { subscribeRealtime } from './realtimeApi'
import { isHiddenChatUploadPath, isHiddenChatRootFolder } from '../utils/upload'
import { verifyCurrentUserPassword } from './authApi'

export type UploadResult = {
  ok?: boolean
  message?: string
  uploaded?: Array<{ key: string; size?: number }>
}

export type ListObjectsResult = {
  ok?: boolean
  prefix?: string
  delimiter?: boolean
  folders?: string[]
  objects?: Array<{
    key: string
    size?: number
    lastModified?: string
    createdAt?: string
    updatedAt?: string
    thumbnailKey?: string | null
    fileId?: string
    mimeType?: string
    encryptionEnabled?: boolean
    encryptionIv?: string
    encryptionSalt?: string
  }>
  pagination?: {
    hasMore: boolean
    nextContinuationToken: string | null
    limit: number
    count: number
    totalFileCount?: number
  }
}

export type TrashResult = {
  ok?: boolean
  message?: string
}

export type TrashFile = {
  id: string
  originalKey: string
  trashKey?: string
  filename: string
  size?: number
  mimeType?: string
  isTrashed: boolean
  deletedAt?: string
  permanentDeleteAt?: string
  createdAt: string
  updatedAt: string
}

export type ListTrashResult = {
  ok?: boolean
  files?: TrashFile[]
}

export type StreamUploadInputFile = {
  file: File
  relativePath: string
  encryptionEnabled?: boolean
  encryptionIv?: string
  encryptionSalt?: string
  thumbnailUploadFile?: File | null
}

export type StreamUploadProgress = {
  progressPercent: number
  bytesUploaded: number
  totalBytes: number
  uploadSpeed: number
  currentFileIndex: number
  totalFiles: number
  currentFilePath: string
}

function isVideoInputFile(file: File, relativePath: string) {
  if (file.type?.toLowerCase().startsWith('video/')) return true
  const ext = relativePath.split('.').pop()?.toLowerCase() || ''
  return ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v'].includes(ext)
}

function isImageInputFile(file: File, relativePath: string) {
  if (file.type?.toLowerCase().startsWith('image/')) return true
  const ext = relativePath.split('.').pop()?.toLowerCase() || ''
  return [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'avif',
    'bmp',
    'svg',
    'ico',
    'heic',
    'heif',
  ].includes(ext)
}

function buildImageThumbnailKey(originalKey: string) {
  const safeKey = String(originalKey || '').replace(/^\/+/, '')
  if (!safeKey) return ''

  const parts = safeKey.split('/').filter(Boolean)
  const filename = parts.pop() || 'image'
  const basename = filename.replace(/\.[^.]+$/, '') || filename
  const directory = parts.join('/')
  const thumbnailFilename = `${basename}__thumb.jpg`
  return directory
    ? `${directory}/.thumbnails/${thumbnailFilename}`
    : `.thumbnails/${thumbnailFilename}`
}

export async function createImageThumbnailBlob(file: File): Promise<Blob | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null

  return await new Promise(resolve => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.src = objectUrl

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
      img.src = ''
    }

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const width = img.naturalWidth || 0
        const height = img.naturalHeight || 0
        if (width <= 0 || height <= 0) {
          cleanup()
          resolve(null)
          return
        }

        // Use original dimensions for high quality thumbnail
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (!context) {
          cleanup()
          resolve(null)
          return
        }

        context.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          blob => {
            cleanup()
            resolve(blob || null)
          },
          'image/jpeg',
          0.82
        )
      } catch {
        cleanup()
        resolve(null)
      }
    }

    img.onerror = () => {
      cleanup()
      resolve(null)
    }
  })
}

export async function createVideoThumbnailBlob(file: File): Promise<Blob | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null

  return await new Promise(resolve => {
    const objectUrl = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.src = objectUrl

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
      video.removeAttribute('src')
      video.load()
    }

    video.onloadedmetadata = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        cleanup()
        resolve(null)
        return
      }

      video.currentTime = Math.min(0.1, Math.max(video.duration * 0.1, 0.01))
    }

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        const width = video.videoWidth || 0
        const height = video.videoHeight || 0
        if (width <= 0 || height <= 0) {
          cleanup()
          resolve(null)
          return
        }

        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (!context) {
          cleanup()
          resolve(null)
          return
        }

        context.drawImage(video, 0, 0, width, height)
        canvas.toBlob(
          blob => {
            cleanup()
            resolve(blob || null)
          },
          'image/jpeg',
          0.82
        )
      } catch {
        cleanup()
        resolve(null)
      }
    }

    video.onerror = () => {
      cleanup()
      resolve(null)
    }
  })
}

async function uploadVideoThumbnail(originalKey: string, thumbnailBlob: Blob) {
  await api.put('/api/upload/video-thumbnail', thumbnailBlob, {
    params: { key: originalKey },
    headers: {
      'Content-Type': 'image/jpeg',
    },
    timeout: 2 * 60 * 1000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  })
}

export async function uploadImageThumbnail(
  key: string,
  thumbnailKey: string,
  thumbnailBlob: Blob
): Promise<void> {
  // Use FormData to send both file and metadata
  const formData = new FormData()
  formData.append('key', key)
  formData.append('thumbnailKey', thumbnailKey)
  formData.append('file', thumbnailBlob, 'thumbnail.jpg')

  await api.post('/api/upload/image-thumbnail', formData, {
    timeout: 2 * 60 * 1000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  })
}

export async function uploadFiles(
  formData: FormData,
  onUploadProgress?: (
    progressPercent: number,
    bytesUploaded?: number,
    totalBytes?: number,
    uploadSpeed?: number
  ) => void
): Promise<UploadResult> {
  let lastTime = Date.now()
  let lastLoaded = 0

  const res = await api.post(API_ENV.uploadPath, formData, {
    headers: {
      // Let Axios set correct multipart boundary if you omit this header,
      // but keeping it explicit is fine for most backends.
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: evt => {
      if (!evt.total) return

      const currentTime = Date.now()
      const timeDiff = (currentTime - lastTime) / 1000 // seconds
      const bytesDiff = evt.loaded - lastLoaded

      // Calculate upload speed (bytes per second)
      const uploadSpeed = timeDiff > 0 ? bytesDiff / timeDiff : 0

      // Update progress with detailed information
      const pct = Math.round((evt.loaded * 100) / evt.total)
      onUploadProgress?.(pct, evt.loaded, evt.total, uploadSpeed)

      // Update last values for next calculation
      lastTime = currentTime
      lastLoaded = evt.loaded
    },
    // Increase timeout for large files (30 minutes)
    timeout: 30 * 60 * 1000,
    // Ensure no compression for file uploads
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  })
  return res.data as UploadResult
}

export async function uploadFilesStreamed(
  files: StreamUploadInputFile[],
  options: {
    batchName: string
    folderName?: string
    skipFiles?: Set<string>
    onUploadProgress?: (progress: StreamUploadProgress) => void
  }
): Promise<UploadResult> {
  const { batchName, folderName, skipFiles = new Set(), onUploadProgress } = options
  const totalFiles = files.length
  const totalBytes = files.reduce((sum, item) => sum + item.file.size, 0)

  if (totalFiles === 0) {
    return { ok: true, uploaded: [] }
  }

  let completedBytes = 0
  let lastTime = Date.now()
  let lastLoaded = 0
  const uploaded: Array<{ key: string; size?: number }> = []
  let finalizingStartedAt: number | null = null

  let activeUploadId = ''
  let activeFile: StreamUploadInputFile | null = null
  let activeFileIndex = 0

  const unsubscribeRealtime = subscribeRealtime(event => {
    if (event.scope !== 'files' || event.action !== 'upload_progress') return
    if (!event.data || typeof event.data !== 'object') return

    const data = event.data as {
      uploadId?: unknown
      status?: unknown
      bytesUploaded?: unknown
    }

    const eventUploadId = typeof data.uploadId === 'string' ? data.uploadId : ''
    if (!eventUploadId || eventUploadId !== activeUploadId || !activeFile) return

    const status =
      data.status === 'completed' ||
      data.status === 'failed' ||
      data.status === 'running' ||
      data.status === 'finalizing'
        ? data.status
        : 'running'
    const currentFileUploadedRaw = typeof data.bytesUploaded === 'number' ? data.bytesUploaded : 0
    const currentFileUploaded = Math.min(Math.max(currentFileUploadedRaw, 0), activeFile.file.size)
    const bytesUploaded = Math.min(totalBytes, completedBytes + currentFileUploaded)
    const now = Date.now()
    const elapsedSeconds = (now - lastTime) / 1000
    const deltaBytes = bytesUploaded - lastLoaded
    const uploadSpeed = elapsedSeconds > 0 ? deltaBytes / elapsedSeconds : 0
    const rawPercent = totalBytes > 0 ? (bytesUploaded * 100) / totalBytes : 100
    let progressPercent = 0

    if (status === 'running') {
      finalizingStartedAt = null
      progressPercent = Math.min(90, Math.floor(rawPercent * 0.9))
    } else if (status === 'finalizing') {
      if (finalizingStartedAt === null) {
        finalizingStartedAt = now
      }
      const elapsedMs = now - finalizingStartedAt
      const rampPercent = 90 + Math.floor(elapsedMs / 1500)
      progressPercent = Math.min(99, Math.max(90, rampPercent))
    } else if (status === 'completed') {
      progressPercent = 100
    } else {
      progressPercent = Math.min(99, Math.floor(rawPercent))
    }

    onUploadProgress?.({
      progressPercent,
      bytesUploaded,
      totalBytes,
      uploadSpeed,
      currentFileIndex: activeFileIndex + 1,
      totalFiles,
      currentFilePath: activeFile.relativePath,
    })

    lastTime = now
    lastLoaded = bytesUploaded
  })

  try {
    for (let index = 0; index < files.length; index += 1) {
      const item = files[index]

      // Skip already uploaded files when resuming
      if (skipFiles.has(item.relativePath)) {
        completedBytes += item.file.size
        continue
      }

      const uploadId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      activeUploadId = uploadId
      activeFile = item
      activeFileIndex = index

      let lastProgressTime = Date.now()
      let lastProgressLoaded = 0

      const response = await api.put('/api/upload/stream', item.file, {
        params: {
          batchName,
          path: item.relativePath,
          uploadId,
          ...(folderName ? { folderName } : {}),
          ...(item.encryptionEnabled ? { encryptionEnabled: '1' } : {}),
          ...(item.encryptionIv ? { encryptionIv: item.encryptionIv } : {}),
          ...(item.encryptionSalt ? { encryptionSalt: item.encryptionSalt } : {}),
        },
        headers: {
          'Content-Type': item.file.type || 'application/octet-stream',
        },
        timeout: 30 * 60 * 1000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        onUploadProgress: evt => {
          if (!evt.total) return
          const now = Date.now()
          const timeDiff = (now - lastProgressTime) / 1000
          const bytesDiff = evt.loaded - lastProgressLoaded
          const uploadSpeed = timeDiff > 0 ? bytesDiff / timeDiff : 0
          const bytesUploaded = completedBytes + evt.loaded
          const rawPercent = (bytesUploaded * 100) / totalBytes
          const progressPercent = Math.min(90, Math.floor(rawPercent * 0.9))
          onUploadProgress?.({
            progressPercent,
            bytesUploaded,
            totalBytes,
            uploadSpeed,
            currentFileIndex: index + 1,
            totalFiles,
            currentFilePath: item.relativePath,
          })
          lastProgressTime = now
          lastProgressLoaded = evt.loaded
        },
      })

      const data = response.data as UploadResult
      if (Array.isArray(data.uploaded)) {
        uploaded.push(...data.uploaded)
      }

      const uploadedKey = data.uploaded?.[0]?.key

      if (uploadedKey && item.thumbnailUploadFile) {
        try {
          if (isImageInputFile(item.file, item.relativePath)) {
            const thumbnailKey = buildImageThumbnailKey(uploadedKey)
            if (thumbnailKey) {
              await uploadImageThumbnail(uploadedKey, thumbnailKey, item.thumbnailUploadFile)
            }
          } else if (isVideoInputFile(item.file, item.relativePath)) {
            await uploadVideoThumbnail(uploadedKey, item.thumbnailUploadFile)
          }
        } catch {
          // Thumbnail upload failures should not fail the primary file upload.
        }
      }

      if (
        uploadedKey &&
        !item.thumbnailUploadFile &&
        isVideoInputFile(item.file, item.relativePath)
      ) {
        try {
          const thumbnailBlob = await createVideoThumbnailBlob(item.file)
          if (thumbnailBlob) {
            await uploadVideoThumbnail(uploadedKey, thumbnailBlob)
          }
        } catch {
          // Thumbnail upload failures should not fail the primary file upload.
        }
      }

      // Generate and upload thumbnail for non-encrypted images
      console.debug('[uploadFilesStreamed] deciding on thumbnail generation', {
        uploadedKey,
        isImage: isImageInputFile(item.file, item.relativePath),
        encryptionEnabled: item.encryptionEnabled,
        relativePath: item.relativePath,
        fileType: item.file.type,
      })
      if (
        uploadedKey &&
        !item.thumbnailUploadFile &&
        isImageInputFile(item.file, item.relativePath) &&
        !item.encryptionEnabled
      ) {
        try {
          const thumbnailBlob = await createImageThumbnailBlob(item.file)
          console.debug('[uploadFilesStreamed] thumbnail blob created', {
            uploadedKey,
            thumbnailBlobSize: thumbnailBlob?.size,
          })
          if (thumbnailBlob) {
            const thumbnailKey = buildImageThumbnailKey(uploadedKey)
            console.debug('[uploadFilesStreamed] thumbnail key built', {
              uploadedKey,
              thumbnailKey,
            })
            if (thumbnailKey) {
              await uploadImageThumbnail(uploadedKey, thumbnailKey, thumbnailBlob)
              console.debug('[uploadFilesStreamed] thumbnail upload completed', {
                uploadedKey,
                thumbnailKey,
              })
            }
          }
        } catch (err) {
          console.error('[uploadFilesStreamed] thumbnail generation failed', err)
          // Thumbnail upload failures should not fail the primary file upload.
        }
      } else {
        console.debug('[uploadFilesStreamed] skipping thumbnail - condition not met', {
          hasUploadedKey: Boolean(uploadedKey),
          isImage: isImageInputFile(item.file, item.relativePath),
          notEncrypted: !item.encryptionEnabled,
        })
      }

      completedBytes += item.file.size
      const progressPercent = totalBytes > 0 ? Math.round((completedBytes * 100) / totalBytes) : 100
      onUploadProgress?.({
        progressPercent,
        bytesUploaded: Math.min(completedBytes, totalBytes),
        totalBytes,
        uploadSpeed: 0,
        currentFileIndex: index + 1,
        totalFiles,
        currentFilePath: item.relativePath,
      })
    }
  } finally {
    unsubscribeRealtime()
  }

  return {
    ok: true,
    uploaded,
    message: `Uploaded ${uploaded.length} file(s) to R2.`,
  }
}

export type ListObjectsParams = {
  prefix?: string
  limit?: number
  delimiter?: boolean
  continuationToken?: string
}

export async function listUploadedObjects(
  prefix: string,
  limit: number = 50,
  delimiter: boolean = true,
  continuationToken?: string
): Promise<ListObjectsResult> {
  const params: ListObjectsParams = { prefix, limit, delimiter }
  if (continuationToken) {
    params.continuationToken = continuationToken
  }

  const res = await api.get(`${API_ENV.uploadPath}/list`, {
    params,
  })
  return res.data as ListObjectsResult
}

export async function moveFileToTrash(key: string): Promise<TrashResult> {
  const res = await api.post('/api/files/trash', { key })
  return res.data as TrashResult
}

export async function restoreFileFromTrash(key: string): Promise<TrashResult> {
  const res = await api.post('/api/files/restore', { key })
  return res.data as TrashResult
}

export async function bulkMoveToTrash(
  keys: string[],
  options?: { adminPassword?: string }
): Promise<TrashResult> {
  const body: { keys: string[]; password?: string } = { keys }
  const password = options?.adminPassword?.trim()
  if (password) body.password = password
  const res = await api.post('/api/files/trash/bulk', body)
  return res.data as TrashResult
}

export async function bulkRestoreFromTrash(keys: string[]): Promise<TrashResult> {
  const res = await api.post('/api/files/restore/bulk', { keys })
  return res.data as TrashResult
}

export async function listTrashFiles(): Promise<ListTrashResult> {
  const res = await api.get('/api/files/trash')
  return res.data as ListTrashResult
}

export type BulkPrivacyResult = {
  ok?: boolean
  settings?: Record<string, { restricted: boolean; allowedMembers: string[]; canAccess: boolean }>
}

export async function fetchBulkPrivacySettings(fileKeys: string[]): Promise<BulkPrivacyResult> {
  if (fileKeys.length === 0) {
    return { ok: true, settings: {} }
  }
  const res = await api.post('/api/files/privacy/bulk', { fileKeys })
  return res.data as BulkPrivacyResult
}

// ========== Encrypted Upload API ==========

export type UploadUrlResult = {
  ok?: boolean
  uploadId?: string
  key?: string
  url?: string
  r2Endpoint?: string
  r2Bucket?: string
  r2PublicUrl?: string
}

export type MultipartCreateResult = {
  ok?: boolean
  uploadId?: string
  key?: string
  multipartUploadId?: string
}

export type MultipartSignPartResult = {
  ok?: boolean
  url?: string
}

export type MultipartCompleteResult = {
  ok?: boolean
}

export type MultipartAbortResult = {
  ok?: boolean
}

export type ConfirmUploadResult = {
  ok?: boolean
  message?: string
  file?: {
    id: string
    originalKey: string
    filename: string
    size: number
    mimeType: string
    encryptionEnabled: boolean
    encryptionIv?: string
    encryptionSalt?: string
  }
}

export type UploadProgressResult = {
  ok?: boolean
  status?: string
  bytesUploaded?: number
  totalBytes?: number
  progressPercent?: number
  error?: string
}

export type DownloadUrlResult = {
  ok?: boolean
  url?: string
  filename?: string
  mimeType?: string
  size?: number
  encryptionEnabled?: boolean
  encryptionIv?: string
  encryptionSalt?: string
}

/**
 * Request a pre-signed URL for direct R2 upload
 */
export async function requestUploadUrl(params: {
  filename: string
  mimeType?: string
  size?: number
  encryptionEnabled?: boolean
  encryptionIv?: string
  encryptionSalt?: string
}): Promise<UploadUrlResult> {
  const res = await api.post('/api/upload/url', params)
  return res.data as UploadUrlResult
}

// ========== Multipart Upload API ==========

export async function createMultipartUpload(params: {
  filename: string
  mimeType?: string
  size?: number
}): Promise<MultipartCreateResult> {
  const res = await api.post('/api/upload/multipart/create', params)
  return res.data as MultipartCreateResult
}

export async function signMultipartPart(params: {
  key: string
  multipartUploadId: string
  partNumber: number
}): Promise<MultipartSignPartResult> {
  const res = await api.post('/api/upload/multipart/part', params)
  return res.data as MultipartSignPartResult
}

export async function completeMultipartUpload(params: {
  uploadId: string
  key: string
  multipartUploadId: string
  parts: Array<{ ETag?: string; etag?: string; PartNumber?: number; partNumber?: number }>
}): Promise<MultipartCompleteResult> {
  const res = await api.post('/api/upload/multipart/complete', params)
  return res.data as MultipartCompleteResult
}

export async function abortMultipartUpload(params: {
  key: string
  multipartUploadId: string
}): Promise<MultipartAbortResult> {
  const res = await api.post('/api/upload/multipart/abort', params)
  return res.data as MultipartAbortResult
}

export async function listMultipartParts(params: {
  key: string
  multipartUploadId: string
}): Promise<{
  ok?: boolean
  parts?: Array<{
    PartNumber?: number
    ETag?: string
    Size?: number
  }>
}> {
  const res = await api.post('/api/upload/multipart/list-parts', params)
  return res.data
}

/**
 * Confirm upload completion and save file metadata
 */
export async function confirmUpload(params: {
  uploadId: string
  key: string
  filename: string
  mimeType?: string
  size?: number
  encryptionEnabled?: boolean
  encryptionIv?: string
  encryptionSalt?: string
  folderName?: string
  batchName?: string
}): Promise<ConfirmUploadResult> {
  const res = await api.post('/api/upload/confirm', params)
  return res.data as ConfirmUploadResult
}

/**
 * Get upload progress for a specific upload
 */
export async function getUploadProgress(uploadId: string): Promise<UploadProgressResult> {
  const res = await api.get(`/api/upload/progress/${uploadId}`)
  return res.data as UploadProgressResult
}

/**
 * Get file download URL (for encrypted files, returns R2 URL for client-side decryption)
 */
export async function getDownloadUrl(fileId: string): Promise<DownloadUrlResult> {
  const res = await api.get(`/api/upload/download/${fileId}`)
  return res.data as DownloadUrlResult
}

const FOLDER_ZIP_POLL_INTERVAL_MS = 2000
const FOLDER_ZIP_POLL_INTERVAL_SLOW_MS = 5000
const FOLDER_ZIP_SLOW_POLL_AFTER_MS = 60_000
/** Large folders can take several minutes to zip on the server. */
const FOLDER_ZIP_MAX_WAIT_MS = 5 * 60 * 1000

export function normalizeFolderDownloadPath(folderPath: string): string {
  return String(folderPath || '').replace(/^\/+|\/+$/g, '')
}

/** True when `candidatePath` is the deleted folder or nested under it. */
export function relativeFolderPathUnderDeleted(
  candidatePath: string,
  deletedFolderPath: string
): boolean {
  const deleted = normalizeFolderDownloadPath(deletedFolderPath)
  const candidate = normalizeFolderDownloadPath(candidatePath)
  if (!deleted) return false
  return candidate === deleted || candidate.startsWith(`${deleted}/`)
}

export function storageKeyUnderDeletedFolder(
  storageKey: string,
  workspaceId: string,
  deletedFolderPath: string
): boolean {
  const ws = workspaceId.trim()
  if (!ws) return false
  const deleted = normalizeFolderDownloadPath(deletedFolderPath)
  const base = `uploads/${ws}`
  const prefix = deleted ? `${base}/${deleted}` : base
  const key = String(storageKey || '').replace(/^\/+/, '')
  return key === prefix || key.startsWith(`${prefix}/`)
}

export function parentRelativeFolderPath(relativePath: string): string {
  const norm = normalizeFolderDownloadPath(relativePath)
  if (!norm.includes('/')) return ''
  return norm.split('/').slice(0, -1).join('/')
}

/** Parent path to open when the user is inside a folder that was deleted. */
export function escapePathAfterFolderDelete(
  currentPath: string,
  deletedFolderPath: string
): string | null {
  if (!relativeFolderPathUnderDeleted(currentPath, deletedFolderPath)) return null
  return parentRelativeFolderPath(deletedFolderPath)
}

/** Explorer-relative path for a folder row returned by the list API. */
export function explorerFullPathFromFolderEntry(
  folderEntry: string,
  listCurrentPath: string
): string {
  const cleaned = String(folderEntry || '').replace(/\/+$/, '')
  const current = normalizeFolderDownloadPath(listCurrentPath)
  return current ? `${current}/${cleaned}` : cleaned
}

const hiddenExplorerFolders = new Set<string>()

/** Hide folder from explorer after delete (until refresh confirms removal). */
export function rememberDeletedExplorerFolder(relativePath: string): void {
  const normalized = normalizeFolderDownloadPath(relativePath)
  if (normalized) hiddenExplorerFolders.add(normalized)
}

export function isExplorerFolderHiddenAfterDelete(
  folderEntry: string,
  listCurrentPath: string
): boolean {
  const fullPath = explorerFullPathFromFolderEntry(folderEntry, listCurrentPath)
  for (const deleted of hiddenExplorerFolders) {
    if (relativeFolderPathUnderDeleted(fullPath, deleted)) return true
  }
  return false
}

export function filterFoldersForExplorer(folders: string[], listCurrentPath: string): string[] {
  return folders.filter(folder => {
    const folderName = folder.split('/').filter(Boolean).pop()
    return (
      folderName !== 'workspace-assets' &&
      folderName !== 'workspace-logo' &&
      !isHiddenChatUploadPath(folder) &&
      !isHiddenChatRootFolder(folder, listCurrentPath) &&
      !isExplorerFolderHiddenAfterDelete(folder, listCurrentPath)
    )
  })
}

function folderMarkerStorageKeys(workspaceId: string, relativePath: string): string[] {
  const ws = workspaceId.trim()
  const rel = normalizeFolderDownloadPath(relativePath)
  if (!ws || !rel) return []
  const base = `uploads/${ws}/${rel}`.replace(/\/+$/, '')
  return [`${base}/`, base]
}

function isFolderMarkerKey(key: string): boolean {
  return String(key || '').replace(/^\/+/, '').endsWith('/')
}

function buildFolderDownloadUrl(baseUrl: string, folderPath: string, token: string): string {
  const params = new URLSearchParams({
    path: folderPath,
    token,
    recursive: '1',
  })
  return `${baseUrl}/api/download/folder?${params.toString()}`
}

type ListedObject = NonNullable<ListObjectsResult['objects']>[number]

/** Keys we never put in a folder ZIP (matches explorer hidden paths). */
export function isExcludedFromFolderZip(storageKey: string): boolean {
  const key = storageKey.replace(/^\/+/, '')
  if (!key || key.endsWith('/')) return true
  if (key.includes('/.thumbnails/')) return true
  if (key.includes('/workspace-assets/') || key.includes('/workspace-logo/')) return true
  if (key.includes('/.chat-files/')) return true
  const parts = key.split('/').filter(Boolean)
  if (parts[0] === 'upload' || parts[0] === 'chat') return true
  if (parts.length >= 2 && parts[1] === 'chat') return true
  return false
}

/** Lists every file under a storage prefix (includes nested subfolders). */
export async function listAllObjectsUnderPrefix(
  storagePrefix: string,
  signal?: AbortSignal
): Promise<ListedObject[]> {
  const prefix = storagePrefix.endsWith('/') ? storagePrefix : `${storagePrefix}/`
  const all: ListedObject[] = []
  let continuation: string | undefined

  do {
    if (signal?.aborted) throw new Error('تم إلغاء التنزيل')
    const page = await listUploadedObjects(prefix, 200, false, continuation)
    for (const obj of page.objects ?? []) {
      if (!isExcludedFromFolderZip(obj.key)) all.push(obj)
    }
    continuation =
      page.pagination?.hasMore && page.pagination.nextContinuationToken
        ? page.pagination.nextContinuationToken
        : undefined
  } while (continuation)

  return all
}

/** All storage keys under a prefix (thumbnails, markers, subfolders) — used when deleting a folder. */
async function listAllKeysForFolderDelete(
  storagePrefix: string,
  workspaceId: string,
  relativePath: string
): Promise<string[]> {
  const prefix = storagePrefix.endsWith('/') ? storagePrefix : `${storagePrefix}/`
  const keySet = new Set<string>()

  for (const marker of folderMarkerStorageKeys(workspaceId, relativePath)) {
    keySet.add(marker)
  }

  let continuation: string | undefined
  do {
    const page = await listUploadedObjects(prefix, 200, false, continuation)
    for (const obj of page.objects ?? []) {
      const key = obj.key?.trim()
      if (key && !isHiddenChatUploadPath(key)) keySet.add(key)
    }
    continuation =
      page.pagination?.hasMore && page.pagination.nextContinuationToken
        ? page.pagination.nextContinuationToken
        : undefined
  } while (continuation)

  let folderContinuation: string | undefined
  do {
    const page = await listUploadedObjects(prefix, 200, true, folderContinuation)
    for (const folder of page.folders ?? []) {
      const entry = folder.startsWith('/') ? folder.slice(1) : folder
      const markerKey = entry.endsWith('/') ? `${prefix}${entry}` : `${prefix}${entry}/`
      const normalized = markerKey.replace(/\/{2,}/g, '/')
      if (!isHiddenChatUploadPath(normalized)) keySet.add(normalized)
    }
    folderContinuation =
      page.pagination?.hasMore && page.pagination.nextContinuationToken
        ? page.pagination.nextContinuationToken
        : undefined
  } while (folderContinuation)

  return [...keySet]
}

function withAdminPassword(
  payload: Record<string, unknown>,
  adminPassword?: string
): Record<string, unknown> {
  const password = adminPassword?.trim()
  if (!password) return payload
  return { ...payload, password }
}

async function deleteFolderViaApi(
  relativePath: string,
  adminPassword?: string
): Promise<boolean> {
  const norm = normalizeFolderDownloadPath(relativePath)
  if (!norm) return false

  const segments = norm.split('/').filter(Boolean)
  const name = segments[segments.length - 1] || norm
  const parentPath = segments.slice(0, -1).join('/')

  const payloads: Record<string, unknown>[] = [
    withAdminPassword({ path: norm, recursive: true }, adminPassword),
    withAdminPassword({ path: `${norm}/`, recursive: true }, adminPassword),
  ]
  if (parentPath) {
    payloads.push(withAdminPassword({ path: parentPath, name, recursive: true }, adminPassword))
    payloads.push(withAdminPassword({ parentPath, name, recursive: true }, adminPassword))
  } else {
    payloads.push(withAdminPassword({ name, recursive: true }, adminPassword))
  }

  for (const data of payloads) {
    try {
      await api.delete('/api/folders', { data })
      return true
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } }
      const status = axiosErr.response?.status
      if (status === 401 || status === 403) {
        throw new Error(axiosErr.response?.data?.message || 'كلمة مرور المدير غير صحيحة')
      }
      if (status === 404 || status === 400) continue
    }
  }

  try {
    await api.delete('/api/folders', {
      params: {
        path: norm,
        recursive: 'true',
        ...(adminPassword?.trim() ? { password: adminPassword.trim() } : {}),
      },
    })
    return true
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number; data?: { message?: string } } }
    const status = axiosErr.response?.status
    if (status === 401 || status === 403) {
      throw new Error(axiosErr.response?.data?.message || 'كلمة مرور المدير غير صحيحة')
    }
    return status === 404
  }
}

function normalizeStoragePath(path: string): string {
  const trimmed = String(path || '').replace(/^\/+|\/+$/g, '')
  try {
    return decodeURIComponent(trimmed)
  } catch {
    return trimmed
  }
}

function storageKeyToZipEntryName(storageKey: string, storagePrefix: string): string {
  const key = normalizeStoragePath(storageKey)
  const prefix = `${normalizeStoragePath(storagePrefix)}/`

  if (key.startsWith(prefix)) {
    const relative = key.slice(prefix.length).replace(/^\/+/, '')
    if (relative) return relative
  }

  const prefixParts = prefix.split('/').filter(Boolean)
  const keyParts = key.split('/').filter(Boolean)
  for (let i = 0; i <= keyParts.length - prefixParts.length; i++) {
    if (prefixParts.every((part, j) => keyParts[i + j] === part)) {
      const relative = keyParts.slice(i + prefixParts.length).join('/')
      if (relative) return relative
    }
  }

  return keyParts[keyParts.length - 1] || key
}

function uniqueZipEntryName(entryName: string, used: Set<string>): string {
  const safe = entryName.replace(/\\/g, '/').replace(/^\/+/, '') || 'file'
  if (!used.has(safe)) {
    used.add(safe)
    return safe
  }
  const dot = safe.lastIndexOf('.')
  const base = dot > 0 ? safe.slice(0, dot) : safe
  const ext = dot > 0 ? safe.slice(dot) : ''
  let n = 2
  while (used.has(`${base} (${n})${ext}`)) n += 1
  const unique = `${base} (${n})${ext}`
  used.add(unique)
  return unique
}

function resolveEncryptionPassword(
  explicit: string | null | undefined,
  workspaceId: string
): string | null {
  const fromOption = explicit?.trim()
  if (fromOption) return fromOption
  try {
    const fromSession = sessionStorage.getItem('file_encryption_password')?.trim()
    if (fromSession) return fromSession
  } catch {
    // ignore
  }
  return workspaceId.trim() || null
}

async function fetchObjectBytesForZip(
  obj: ListedObject,
  entryName: string,
  token: string,
  baseUrl: string,
  encryptionPassword: string | null,
  signal?: AbortSignal
): Promise<Uint8Array> {
  const label = entryName || obj.key

  try {
    if (obj.encryptionEnabled) {
      console.info('[folder-zip] decrypt v3 — chunked-first')
      if (!obj.fileId || !obj.encryptionIv || !obj.encryptionSalt) {
        throw new Error('بيانات التشفير غير مكتملة لهذا الملف')
      }
      if (!encryptionPassword) {
        throw new Error('كلمة مرور التشفير غير متوفرة')
      }
      if (obj.fileId) {
        const { getFileFromCache, generateCacheKey } = await import('../lib/fileCache')
        const cacheKey = generateCacheKey(obj.fileId, encryptionPassword)
        const cached = await getFileFromCache(cacheKey)
        if (cached?.decryptedBlob) {
          return new Uint8Array(await cached.decryptedBlob.arrayBuffer())
        }
      }

      const result = await getDownloadUrl(obj.fileId)
      if (!result.ok || !result.url) {
        throw new Error('تعذر الحصول على رابط التنزيل')
      }
      if (signal?.aborted) throw new Error('تم إلغاء التنزيل')

      const downloadRes = await fetch(result.url, { signal })
      if (!downloadRes.ok) throw new Error(`فشل التحميل (${downloadRes.status})`)
      const encrypted = await downloadRes.arrayBuffer()

      const plainSizeHint = obj.size && obj.size > 0 ? obj.size : encrypted.byteLength
      const decryptedBlob = await decryptEncryptedBlobForDownload(
        encrypted,
        obj.encryptionIv,
        obj.encryptionSalt,
        encryptionPassword,
        plainSizeHint
      )

      if (obj.fileId && obj.mimeType) {
        const { putFileInCache, generateCacheKey } = await import('../lib/fileCache')
        const cacheKey = generateCacheKey(obj.fileId, encryptionPassword)
        await putFileInCache(cacheKey, decryptedBlob, {
          mimeType: obj.mimeType,
          filename: label,
          size: plainSizeHint,
        })
      }

      if (signal?.aborted) throw new Error('تم إلغاء التنزيل')
      return new Uint8Array(await decryptedBlob.arrayBuffer())
    }

    const normalized = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    const url = `${normalized}/api/download/direct?key=${encodeURIComponent(obj.key)}&token=${encodeURIComponent(token)}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    })
    if (!res.ok) throw new Error(`فشل التحميل (${res.status})`)
    return new Uint8Array(await res.arrayBuffer())
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'خطأ غير معروف'
    const errName = err instanceof Error ? err.name : ''
    if (
      errName === 'OperationError' ||
      /decrypt|operation/i.test(detail) ||
      /decrypt|operation/i.test(errName)
    ) {
      throw new Error(
        `تعذر فك تشفير «${label}» — تحقق من كلمة مرور التشفير أو جرّب تنزيل الملف منفرداً`
      )
    }
    throw new Error(detail ? `«${label}»: ${detail}` : `«${label}»: فشل التنزيل`)
  }
}

function triggerZipDownload(data: Uint8Array, filename: string) {
  const blob = new Blob([data as BlobPart], { type: 'application/zip' })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.rel = 'noreferrer'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}

/**
 * Builds ZIP in the browser: all files under the folder including subfolders.
 */
export async function downloadFolderAsZipClient(options: {
  folderPath: string
  workspaceId: string
  signal?: AbortSignal
  encryptionPassword?: string | null
  onProgress?: (progress: FolderZipProgress) => void
}): Promise<{ filename: string; fileCount: number; failedFiles?: string[] }> {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  const baseUrl = API_ENV.apiBaseUrl?.trim() || ''
  if (!token) throw new Error('يرجى تسجيل الدخول مرة أخرى')
  if (!baseUrl) throw new Error('عنوان الخادم غير مضبوط')

  const relativePath = normalizeFolderDownloadPath(options.folderPath)
  if (!relativePath) throw new Error('مسار المجلد غير صالح')

  const workspaceId = options.workspaceId.trim()
  const storagePrefix = `uploads/${workspaceId}/${relativePath}`
  const startedAt = Date.now()
  const encryptionPassword = resolveEncryptionPassword(options.encryptionPassword, workspaceId)

  const report = (partial: Partial<FolderZipProgress> & { phase: FolderZipProgress['phase'] }) => {
    options.onProgress?.({
      elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
      ...partial,
    })
  }

  report({ phase: 'preparing' })
  const objects = await listAllObjectsUnderPrefix(storagePrefix, options.signal)

  if (objects.length === 0) {
    throw new Error('لا توجد ملفات في هذا المجلد (بما في ذلك المجلدات الفرعية)')
  }

  const zipEntries: Record<string, Uint8Array> = {}
  const usedEntryNames = new Set<string>()
  const failedFiles: string[] = []
  let done = 0

  for (const obj of objects) {
    if (options.signal?.aborted) throw new Error('تم إلغاء التنزيل')

    const entryName = uniqueZipEntryName(
      storageKeyToZipEntryName(obj.key, storagePrefix),
      usedEntryNames
    )
    report({
      phase: 'downloading',
      filesDone: done,
      filesTotal: objects.length,
      currentFile: entryName,
    })

    try {
      const bytes = await fetchObjectBytesForZip(
        obj,
        entryName,
        token,
        baseUrl,
        encryptionPassword,
        options.signal
      )
      if (bytes.byteLength === 0) {
        throw new Error('الملف فارغ')
      }
      zipEntries[entryName] = bytes
      done += 1
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل التنزيل'
      failedFiles.push(msg)
      console.warn('[folder-zip] skipped file:', obj.key, err)
    }
  }

  if (done === 0) {
    throw new Error(
      failedFiles[0] ||
        'لم يُحمَّل أي ملف — تحقق من الاتصال وكلمة مرور التشفير'
    )
  }

  report({ phase: 'zipping', filesDone: done, filesTotal: objects.length })

  const zipped = await new Promise<Uint8Array>((resolve, reject) => {
    zip(zipEntries, (err, data) => {
      if (err) reject(new Error('فشل ضغط ZIP — قد يكون أحد الملفات كبيراً جداً'))
      else resolve(data)
    })
  })

  const filename = `${relativePath.split('/').pop() || 'folder'}.zip`
  triggerZipDownload(zipped, filename)

  return {
    filename,
    fileCount: done,
    ...(failedFiles.length > 0 ? { failedFiles } : {}),
  }
}

async function readBlobPrefix(blob: Blob, length = 4): Promise<Uint8Array> {
  const buf = await blob.slice(0, length).arrayBuffer()
  return new Uint8Array(buf)
}

async function assertZipBlob(blob: Blob): Promise<void> {
  if (blob.size === 0) {
    throw new Error('ملف ZIP فارغ — تحقق من أن المجلد يحتوي ملفات')
  }
  const prefix = await readBlobPrefix(blob, 4)
  const isPkZip = prefix[0] === 0x50 && prefix[1] === 0x4b
  if (isPkZip) return

  const asText = await blob.slice(0, 400).text().catch(() => '')
  if (asText.trim().startsWith('{')) {
    try {
      const json = JSON.parse(asText) as { message?: string }
      if (json?.message) throw new Error(json.message)
    } catch (e) {
      if (e instanceof Error) throw e
    }
  }
  throw new Error('الخادم لم يرجع ملف ZIP صالحاً — قد يكون التحضير لم يكتمل')
}

export type FolderZipProgress = {
  elapsedSeconds: number
  phase: 'preparing' | 'downloading' | 'zipping'
  serverMessage?: string
  filesDone?: number
  filesTotal?: number
  currentFile?: string
}

/**
 * Folder ZIP download. Default (`complete`): browser builds ZIP with all nested files.
 * `server`: legacy server-side ZIP (may omit subfolders until backend supports `recursive=1`).
 */
/**
 * Deletes a folder and all nested files (moves files to trash, then removes folder prefix).
 */
export async function deleteWorkspaceFolder(options: {
  folderPath: string
  workspaceId: string
  adminPassword: string
  onProgress?: (message: string) => void
}): Promise<{ trashedFiles: number }> {
  const workspaceId = options.workspaceId.trim()
  if (!workspaceId) throw new Error('معرّف مساحة العمل غير متوفر')

  const adminPassword = options.adminPassword.trim()
  if (!adminPassword) throw new Error('كلمة مرور المدير مطلوبة')

  await verifyCurrentUserPassword(adminPassword)

  const relativePath = normalizeFolderDownloadPath(options.folderPath)
  if (!relativePath) throw new Error('مسار المجلد غير صالح')

  const storagePrefix = `uploads/${workspaceId}/${relativePath}`
  options.onProgress?.('جاري البحث عن الملفات داخل المجلد...')

  const keys = await listAllKeysForFolderDelete(storagePrefix, workspaceId, relativePath)
  const fileKeys = keys.filter(k => !isFolderMarkerKey(k))
  const markerKeys = keys.filter(k => isFolderMarkerKey(k))

  const BATCH = 100
  for (let i = 0; i < fileKeys.length; i += BATCH) {
    const batch = fileKeys.slice(i, i + BATCH)
    options.onProgress?.(
      `جاري نقل الملفات إلى سلة المهملات... ${Math.min(i + batch.length, fileKeys.length)} / ${fileKeys.length}`
    )
    await bulkMoveToTrash(batch, { adminPassword })
  }

  if (markerKeys.length > 0) {
    options.onProgress?.('جاري إزالة علامات المجلدات...')
    for (let i = 0; i < markerKeys.length; i += BATCH) {
      const batch = markerKeys.slice(i, i + BATCH)
      try {
        await bulkMoveToTrash(batch, { adminPassword })
      } catch {
        for (const marker of batch) {
          try {
            await moveFileToTrash(marker)
          } catch {
            // Folder marker may only be removable via DELETE /api/folders
          }
        }
      }
    }
  }

  options.onProgress?.('جاري إزالة المجلد...')
  const folderRemoved = await deleteFolderViaApi(relativePath, adminPassword)

  rememberDeletedExplorerFolder(relativePath)

  void folderRemoved

  return { trashedFiles: fileKeys.length }
}

/** Download folder as ZIP (client-side, includes subfolders). */
export async function downloadWorkspaceFolderZip(options: {
  folderPath: string
  workspaceId?: string
  signal?: AbortSignal
  encryptionPassword?: string | null
  mode?: 'complete' | 'server'
  onProgress?: (progress: FolderZipProgress) => void
}): Promise<{ filename: string; fileCount?: number; failedFiles?: string[] }> {
  const workspaceId = options.workspaceId?.trim()
  if (options.mode !== 'server' && workspaceId) {
    return downloadFolderAsZipClient({
      folderPath: options.folderPath,
      workspaceId,
      signal: options.signal,
      encryptionPassword: options.encryptionPassword,
      onProgress: options.onProgress,
    })
  }

  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  const baseUrl = API_ENV.apiBaseUrl?.trim() || ''
  if (!token) throw new Error('يرجى تسجيل الدخول مرة أخرى')
  if (!baseUrl) throw new Error('عنوان الخادم غير مضبوط')

  const relativePath = normalizeFolderDownloadPath(options.folderPath)
  if (!relativePath) throw new Error('مسار المجلد غير صالح')

  // Same relative path as folder create/delete APIs; backend maps to storage prefix.
  const downloadUrl = buildFolderDownloadUrl(baseUrl, relativePath, token)
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/zip, application/octet-stream, */*',
  }

  const startedAt = Date.now()
  let lastServerMessage: string | undefined

  const report = (phase: FolderZipProgress['phase']) => {
    options.onProgress?.({
      elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
      phase,
      serverMessage: lastServerMessage,
    })
  }

  while (Date.now() - startedAt < FOLDER_ZIP_MAX_WAIT_MS) {
    if (options.signal?.aborted) {
      throw new Error('تم إلغاء التنزيل')
    }

    report('preparing')

    const elapsed = Date.now() - startedAt
    const pollInterval =
      elapsed >= FOLDER_ZIP_SLOW_POLL_AFTER_MS
        ? FOLDER_ZIP_POLL_INTERVAL_SLOW_MS
        : FOLDER_ZIP_POLL_INTERVAL_MS

    const response = await fetch(downloadUrl, { headers, signal: options.signal })

    if (response.status === 200) {
      report('downloading')
      const blob = await response.blob()
      await assertZipBlob(blob)

      const filename = `${relativePath.split('/').pop() || 'folder'}.zip`
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = filename
      anchor.rel = 'noreferrer'
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
      return { filename }
    }

    if (response.status === 202) {
      const body = (await response.json().catch(() => null)) as {
        message?: string
        status?: string
      } | null
      if (body?.message) lastServerMessage = body.message

      const retryAfter = response.headers.get('Retry-After')
      const parsed = retryAfter ? Number.parseInt(retryAfter, 10) : NaN
      const waitMs = Number.isFinite(parsed)
        ? Math.min(Math.max(parsed * 1000, 1000), 10_000)
        : pollInterval
      await new Promise(resolve => window.setTimeout(resolve, waitMs))
      continue
    }

    const errorData = await response.json().catch(() => ({ message: '' }))
    const message =
      (errorData as { message?: string }).message ||
      `فشل تحضير المجلد (${response.status})`
    throw new Error(message)
  }

  throw new Error(
    'انتهت مهلة تحضير المجلد (5 دقائق). المجلد كبير أو الخادم بطيء — جرّب مجلداً أصغر أو راجع إعدادات ZIP في الباك.'
  )
}

/** @deprecated Use downloadWorkspaceFolderZip */
export const downloadFolderAsZip = downloadWorkspaceFolderZip
