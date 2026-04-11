/**
 * Encryption Hook
 * 
 * Provides encryption/decryption functionality for file uploads
 * with workspace-based access control.
 */

import { useState, useCallback } from 'react';
import {
  encryptFile,
  encryptFileChunked,
  decryptFile,
  decryptFileChunked,
  shouldUseChunkedEncryption,
  type EncryptionResult,
  type ChunkedEncryptionResult,
} from '../lib/encryption';

export interface UseEncryptionOptions {
  workspaceId?: string;
}

export interface UseEncryptionReturn {
  encrypt: (file: File, password: string, onProgress?: (progress: number) => void) => Promise<EncryptionResult | ChunkedEncryptionResult>;
  decrypt: (
    encryptedData: ArrayBuffer | ArrayBuffer[],
    iv: string,
    salt: string,
    password: string,
    mimeType?: string,
    onProgress?: (progress: number) => void
  ) => Promise<Blob>;
  isEncrypting: boolean;
  isDecrypting: boolean;
  error: string | null;
}

/**
 * Hook for E2E encryption/decryption of files
 */
export function useEncryption(_options: UseEncryptionOptions = {}): UseEncryptionReturn {
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const encrypt = useCallback(async (
    file: File,
    password: string,
    onProgress?: (progress: number) => void
  ): Promise<EncryptionResult | ChunkedEncryptionResult> => {
    setIsEncrypting(true);
    setError(null);

    try {
      // Use chunked encryption for large files
      if (shouldUseChunkedEncryption(file.size)) {
        return await encryptFileChunked(file, password, onProgress);
      }
      
      // Use simple encryption for small files
      return await encryptFile(file, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Encryption failed';
      setError(message);
      throw err;
    } finally {
      setIsEncrypting(false);
    }
  }, []);

  const decrypt = useCallback(async (
    encryptedData: ArrayBuffer | ArrayBuffer[],
    iv: string,
    salt: string,
    password: string,
    _mimeType?: string,
    onProgress?: (progress: number) => void
  ): Promise<Blob> => {
    setIsDecrypting(true);
    setError(null);

    try {
      // Handle chunked decryption
      if (Array.isArray(encryptedData)) {
        return await decryptFileChunked(
          { encryptedChunks: encryptedData, iv, salt, password },
          onProgress
        );
      }

      // Handle simple decryption
      const decrypted = await decryptFile(encryptedData, iv, salt, password);
      return decrypted;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Decryption failed';
      setError(message);
      throw err;
    } finally {
      setIsDecrypting(false);
    }
  }, []);

  return {
    encrypt,
    decrypt,
    isEncrypting,
    isDecrypting,
    error,
  };
}

/**
 * Hook for managing encryption password
 * Each user has their own password for PBKDF2 key derivation
 */
export function useEncryptionPassword() {
  const [password, setPassword] = useState<string | null>(null);

  const setUserPassword = useCallback((newPassword: string) => {
    setPassword(newPassword);
    // Store in session storage (not local storage for security)
    sessionStorage.setItem('file_encryption_password', newPassword);
  }, []);

  const clearPassword = useCallback(() => {
    setPassword(null);
    sessionStorage.removeItem('file_encryption_password');
  }, []);

  const getPassword = useCallback((): string | null => {
    if (password) return password;
    return sessionStorage.getItem('file_encryption_password');
  }, [password]);

  return {
    password,
    setUserPassword,
    clearPassword,
    getPassword,
    hasPassword: !!password || !!sessionStorage.getItem('file_encryption_password'),
  };
}

export default useEncryption;