/**
 * Download Context - Global download state for persistent minimized toast
 *
 * Mirrors the UploadContext pattern so download progress is visible across all
 * dashboard pages and survives page navigation.
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

export type DownloadStatus = 'pending' | 'downloading' | 'decrypting' | 'paused' | 'completed' | 'failed' | 'cancelled'

export interface DownloadItem {
  key: string        // unique download id (e.g. "s3key:filename")
  filename: string
  status: DownloadStatus
  progress: number   // 0–100 (download phase; 100 = decryption done)
  bytesDownloaded: number
  totalBytes: number
  speed: number      // bytes/second
  startTime: number
  error?: string
  retries: number
  // Encrypted download extras
  isEncrypted?: boolean
  decryptionProgress?: number  // 0–100
}

export interface PausedDownloadState {
  chunks: ArrayBuffer[]       // bytes collected before pause
  bytesDownloaded: number
  totalBytes: number
  isEncrypted: boolean
  s3Key?: string              // original S3 key (for non-encrypted Range requests)
  encryptedUrl?: string       // pre-signed URL snapshot (may expire)
}

interface DownloadContextType {
  downloads: Map<string, DownloadItem>
  addDownload: (item: DownloadItem) => void
  updateDownload: (key: string, patch: Partial<DownloadItem>) => void
  removeDownload: (key: string) => void
  clearCompleted: () => void

  // Minimized toast state
  isMinimized: boolean
  setIsMinimized: (v: boolean) => void
  showDialog: boolean
  setShowDialog: (v: boolean) => void

  // Abort controllers so we can cancel/pause
  abortControllers: React.MutableRefObject<Map<string, AbortController>>

  // Paused download state (chunks already downloaded)
  pausedChunks: React.MutableRefObject<Map<string, PausedDownloadState>>

  // Counts
  activeCount: number
  completedCount: number
  totalCount: number
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined)

export function DownloadProvider({ children }: { children: React.ReactNode }) {
  const [downloads, setDownloads] = useState<Map<string, DownloadItem>>(new Map())
  const [isMinimized, setIsMinimized] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const abortControllers = useRef<Map<string, AbortController>>(new Map())
  const pausedChunks = useRef<Map<string, PausedDownloadState>>(new Map())

  const addDownload = useCallback((item: DownloadItem) => {
    setDownloads(prev => new Map(prev).set(item.key, item))
    setShowDialog(true)
    setIsMinimized(false)
  }, [])

  const updateDownload = useCallback((key: string, patch: Partial<DownloadItem>) => {
    setDownloads(prev => {
      const existing = prev.get(key)
      if (!existing) return prev
      const next = new Map(prev)
      next.set(key, { ...existing, ...patch })
      return next
    })
  }, [])

  const removeDownload = useCallback((key: string) => {
    setDownloads(prev => {
      const next = new Map(prev)
      next.delete(key)
      return next
    })
  }, [])

  const clearCompleted = useCallback(() => {
    setDownloads(prev => {
      const next = new Map(prev)
      for (const [k, v] of next) {
        if (v.status === 'completed' || v.status === 'cancelled' || v.status === 'failed') {
          next.delete(k)
        }
      }
      return next
    })
  }, [])

  const activeCount = Array.from(downloads.values()).filter(
    d => d.status === 'downloading' || d.status === 'decrypting' || d.status === 'pending'
  ).length

  const completedCount = Array.from(downloads.values()).filter(d => d.status === 'completed').length
  const totalCount = downloads.size

  return (
    <DownloadContext.Provider value={{
      downloads,
      addDownload,
      updateDownload,
      removeDownload,
      clearCompleted,
      isMinimized,
      setIsMinimized,
      showDialog,
      setShowDialog,
      abortControllers,
      pausedChunks,
      activeCount,
      completedCount,
      totalCount,
    }}>
      {children}
    </DownloadContext.Provider>
  )
}

export function useDownload() {
  const ctx = useContext(DownloadContext)
  if (!ctx) throw new Error('useDownload must be used within a DownloadProvider')
  return ctx
}
