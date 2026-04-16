/**
 * useBulkSelection Hook
 * Manages bulk file/folder selection state and operations
 */

import { useState, useCallback } from 'react'

interface UseBulkSelectionOptions {
  onBulkDownload?: (keys: string[]) => Promise<void>
  onBulkDelete?: (keys: string[]) => Promise<boolean>
  onBulkRestore?: (keys: string[]) => Promise<boolean>
  getAllKeys: () => string[]
}

export function useBulkSelection(options: UseBulkSelectionOptions) {
  const { onBulkDownload, onBulkDelete, onBulkRestore, getAllKeys } = options

  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  // Toggle selection for a single item
  const toggleSelection = useCallback((key: string) => {
    setSelectedForBulk(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  // Select all items
  const selectAll = useCallback(() => {
    const allKeys = getAllKeys()
    setSelectedForBulk(new Set(allKeys))
  }, [getAllKeys])

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedForBulk(new Set())
  }, [])

  // Handle bulk download
  const handleBulkDownload = useCallback(async () => {
    if (selectedForBulk.size === 0 || !onBulkDownload) return

    setBulkLoading(true)
    try {
      const keys = Array.from(selectedForBulk)
      await onBulkDownload(keys)
    } finally {
      setBulkLoading(false)
    }
  }, [selectedForBulk, onBulkDownload])

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    if (selectedForBulk.size === 0 || !onBulkDelete) return false

    setBulkLoading(true)
    try {
      const keys = Array.from(selectedForBulk)
      const success = await onBulkDelete(keys)
      if (success) {
        clearSelection()
      }
      return success
    } finally {
      setBulkLoading(false)
    }
  }, [selectedForBulk, onBulkDelete, clearSelection])

  // Handle bulk restore
  const handleBulkRestore = useCallback(async () => {
    if (selectedForBulk.size === 0 || !onBulkRestore) return false

    setBulkLoading(true)
    try {
      const keys = Array.from(selectedForBulk)
      const success = await onBulkRestore(keys)
      if (success) {
        clearSelection()
      }
      return success
    } finally {
      setBulkLoading(false)
    }
  }, [selectedForBulk, onBulkRestore, clearSelection])

  return {
    // State
    selectedForBulk,
    bulkLoading,

    // Actions
    toggleSelection,
    selectAll,
    clearSelection,
    handleBulkDownload,
    handleBulkDelete,
    handleBulkRestore,
  }
}
