/**
 * IndexedDB-based file cache for decrypted files using Dexie.js
 * Stores decrypted files with 7-day expiration
 */

import Dexie, { type Table } from 'dexie';

const DB_NAME = 'EncryptedFileCache';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export interface CachedFile {
  fileId: string;
  decryptedBlob: Blob;
  timestamp: number;
  expiresAt: number;
  mimeType: string;
  filename: string;
  size: number;
}

class FileCacheDB extends Dexie {
  decryptedFiles!: Table<CachedFile, string>;

  constructor() {
    super(DB_NAME);
    
    this.version(1).stores({
      decryptedFiles: 'fileId, expiresAt, timestamp',
    });
  }
}

// Create singleton instance
const db = new FileCacheDB();

/**
 * Get a file from the cache
 */
export async function getFileFromCache(fileId: string): Promise<CachedFile | null> {
  try {
    const cachedFile = await db.decryptedFiles.get(fileId);
    
    if (!cachedFile) {
      return null;
    }

    // Check if expired
    if (Date.now() > cachedFile.expiresAt) {
      console.log('[FileCache] File expired, removing from cache:', fileId);
      await removeFileFromCache(fileId);
      return null;
    }

    console.log('[FileCache] Retrieved file from cache:', fileId);
    return cachedFile;
  } catch (error) {
    console.error('[FileCache] Error retrieving file:', error);
    return null;
  }
}

/**
 * Store a file in the cache
 */
export async function putFileInCache(
  fileId: string,
  decryptedBlob: Blob,
  metadata: {
    mimeType: string;
    filename: string;
    size: number;
  }
): Promise<void> {
  try {
    const cachedFile: CachedFile = {
      fileId,
      decryptedBlob,
      timestamp: Date.now(),
      expiresAt: Date.now() + SEVEN_DAYS,
      mimeType: metadata.mimeType,
      filename: metadata.filename,
      size: metadata.size,
    };

    await db.decryptedFiles.put(cachedFile);
    console.log('[FileCache] Stored file in cache:', fileId);
  } catch (error) {
    console.error('[FileCache] Error storing file:', error);
  }
}

/**
 * Remove a specific file from the cache
 */
export async function removeFileFromCache(fileId: string): Promise<void> {
  try {
    await db.decryptedFiles.delete(fileId);
    console.log('[FileCache] Removed file from cache:', fileId);
  } catch (error) {
    console.error('[FileCache] Error removing file:', error);
  }
}

/**
 * Clean up expired files from the cache
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const now = Date.now();
    
    // Get all expired files
    const expiredFiles = await db.decryptedFiles
      .where('expiresAt')
      .below(now)
      .toArray();
    
    // Delete expired files
    const fileIds = expiredFiles.map(file => file.fileId);
    if (fileIds.length > 0) {
      await db.decryptedFiles.bulkDelete(fileIds);
      console.log(`[FileCache] Cleaned up ${fileIds.length} expired files`);
    }
    
    return fileIds.length;
  } catch (error) {
    console.error('[FileCache] Error cleaning up expired files:', error);
    return 0;
  }
}

/**
 * Clear all files from the cache
 */
export async function clearAllCache(): Promise<void> {
  try {
    await db.decryptedFiles.clear();
    console.log('[FileCache] Cleared all files from cache');
  } catch (error) {
    console.error('[FileCache] Error clearing cache:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalFiles: number;
  totalSize: number;
  expiredFiles: number;
}> {
  try {
    const now = Date.now();
    const allFiles = await db.decryptedFiles.toArray();
    
    let totalFiles = 0;
    let totalSize = 0;
    let expiredFiles = 0;
    
    for (const file of allFiles) {
      totalFiles++;
      totalSize += file.size;
      
      if (now > file.expiresAt) {
        expiredFiles++;
      }
    }
    
    return {
      totalFiles,
      totalSize,
      expiredFiles,
    };
  } catch (error) {
    console.error('[FileCache] Error getting cache stats:', error);
    return { totalFiles: 0, totalSize: 0, expiredFiles: 0 };
  }
}

/**
 * Initialize cache cleanup on app startup
 */
export function initializeCacheCleanup(): void {
  // Clean up expired files on app startup
  cleanupExpiredCache().then((removedCount) => {
    if (removedCount > 0) {
      console.log(`[FileCache] Cleaned up ${removedCount} expired files on startup`);
    }
  });

  // Set up periodic cleanup (every hour)
  setInterval(() => {
    cleanupExpiredCache();
  }, 60 * 60 * 1000); // Every hour
}

/**
 * Generate a cache key for a file
 */
export function generateCacheKey(fileId: string, password: string): string {
  // Combine fileId and password hash to create a unique cache key
  // This ensures that different passwords for the same file are cached separately
  return `${fileId}_${btoa(password).substring(0, 16)}`;
}