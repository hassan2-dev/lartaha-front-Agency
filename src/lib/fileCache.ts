/**
 * IndexedDB-based file cache for decrypted files using Dexie.js
 * Stores decrypted files with 7-day expiration
 */

import Dexie, { type Table } from 'dexie'

const DB_NAME = 'EncryptedFileCache'
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

export interface CachedFile {
  fileId: string
  decryptedBlob: Blob
  timestamp: number
  expiresAt: number
  mimeType: string
  filename: string
  size: number
}

class FileCacheDB extends Dexie {
  decryptedFiles!: Table<CachedFile, string>

  constructor() {
    super(DB_NAME)

    this.version(1).stores({
      decryptedFiles: 'fileId, expiresAt, timestamp',
    })
  }
}

// Create singleton instance
const db = new FileCacheDB()

/**
 * Get a file from the cache
 */
export async function getFileFromCache(fileId: string): Promise<CachedFile | null> {
  try {
    const cachedFile = await db.decryptedFiles.get(fileId)

    if (!cachedFile) {
      return null
    }

    // Check if the file has expired
    if (Date.now() > cachedFile.expiresAt) {
      await db.decryptedFiles.delete(fileId)
      return null
    }

    return cachedFile
  } catch (error) {
    console.error('Error getting file from cache:', error)
    return null
  }
}

/**
 * Put a file into the cache
 */
export async function putFileInCache(
  fileId: string,
  decryptedBlob: Blob,
  metadata: {
    mimeType: string
    filename: string
    size: number
  }
): Promise<void> {
  try {
    const timestamp = Date.now()
    const expiresAt = timestamp + SEVEN_DAYS

    const cachedFile: CachedFile = {
      fileId,
      decryptedBlob,
      timestamp,
      expiresAt,
      mimeType: metadata.mimeType,
      filename: metadata.filename,
      size: metadata.size,
    }

    await db.decryptedFiles.put(cachedFile)

    // Clean up expired files
    await cleanupExpiredFiles()
  } catch (error) {
    console.error('Error putting file in cache:', error)
  }
}

/**
 * Clean up expired files from the cache
 */
async function cleanupExpiredFiles(): Promise<void> {
  try {
    const expiredFiles = await db.decryptedFiles.where('expiresAt').below(Date.now()).toArray()

    for (const file of expiredFiles) {
      await db.decryptedFiles.delete(file.fileId)
    }
  } catch (error) {
    console.error('Error cleaning up expired files:', error)
  }
}

/**
 * Clear all entries from the cache
 */
export async function clearCache(): Promise<void> {
  try {
    await db.decryptedFiles.clear()
  } catch (error) {
    console.error('Error clearing cache:', error)
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  entryCount: number
  totalSize: number
  oldestEntry: number | null
  newestEntry: number | null
}> {
  try {
    const allFiles = await db.decryptedFiles.toArray()

    if (allFiles.length === 0) {
      return {
        entryCount: 0,
        totalSize: 0,
        oldestEntry: null,
        newestEntry: null,
      }
    }

    const timestamps = allFiles.map(f => f.timestamp)
    const totalSize = allFiles.reduce((sum, f) => sum + f.size, 0)

    return {
      entryCount: allFiles.length,
      totalSize,
      oldestEntry: Math.min(...timestamps),
      newestEntry: Math.max(...timestamps),
    }
  } catch (error) {
    console.error('Error getting cache stats:', error)
    return {
      entryCount: 0,
      totalSize: 0,
      oldestEntry: null,
      newestEntry: null,
    }
  }
}

/**
 * Generate a cache key based on file ID and password
 */
export function generateCacheKey(fileId: string, password: string): string {
  // In a real implementation, you might want to use a more secure method
  // For now, we'll use a simple combination
  return `${fileId}-${password.substring(0, 8)}`
}
