
// Use browser's Web Crypto API
const crypto = window.crypto;
const subtle = crypto?.subtle;

// Configuration
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16; // 16 bytes = 128 bits
const IV_LENGTH = 12;   // 12 bytes = 96 bits (recommended for GCM)
const KEY_LENGTH = 256; // 256 bits for AES-256-GCM
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for large file encryption

export interface EncryptionResult {
  encryptedData: ArrayBuffer;
  iv: string;      // Base64 encoded
  salt: string;    // Base64 encoded
}

export interface DecryptionInput {
  encryptedData: ArrayBuffer;
  iv: string;      // Base64 encoded
  salt: string;    // Base64 encoded
  password: string;
}

export interface ChunkedEncryptionResult {
  encryptedChunks: ArrayBuffer[];
  iv: string;
  salt: string;
  totalSize: number;
}

export interface ChunkedDecryptionInput {
  encryptedChunks: ArrayBuffer[];
  iv: string;
  salt: string;
  password: string;
}

/**
 * Convert string to ArrayBuffer
 */
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer as ArrayBuffer;
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferLike): string {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate cryptographically secure random bytes
 */
function generateRandomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for non-browser environments
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return array;
}

/**
 * Derive encryption key from password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const passwordBuffer = stringToArrayBuffer(password);
  
  // Import password as key material
  const keyMaterial = await subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES key using PBKDF2
  return await subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-256-GCM
 */
export async function encryptData(data: ArrayBuffer, password: string): Promise<EncryptionResult> {
  // Generate random salt and IV
  const salt = generateRandomBytes(SALT_LENGTH);
  const iv = generateRandomBytes(IV_LENGTH);

  // Derive key from password
  const key = await deriveKey(password, salt);

  // Encrypt the data
  const encryptedData = await subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer as ArrayBuffer,
    },
    key,
    data
  );

  return {
    encryptedData,
    iv: arrayBufferToBase64(iv.buffer),
    salt: arrayBufferToBase64(salt.buffer),
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decryptData(input: DecryptionInput): Promise<ArrayBuffer> {
  try {
    const iv = base64ToArrayBuffer(input.iv);
    const salt = base64ToArrayBuffer(input.salt);
    console.log('[decryptData] IV bytes:', iv.byteLength, 'Salt bytes:', salt.byteLength);

    // Derive key from password
    const key = await deriveKey(input.password, new Uint8Array(salt));

    // Decrypt the data
    const decryptedData = await subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv),
      },
      key,
      input.encryptedData
    );

    return decryptedData;
  } catch (err) {
    console.error('[decryptData] Error:', err);
    throw err;
  }
}

/**
 * Encrypt a file in chunks for large file support
 * Uses unique IV for each chunk but same salt for key derivation
 */
export async function encryptFileChunked(
  file: File,
  password: string,
  onProgress?: (progress: number) => void
): Promise<ChunkedEncryptionResult> {
  const salt = generateRandomBytes(SALT_LENGTH);
  const iv = generateRandomBytes(IV_LENGTH);
  const totalSize = file.size;
  const encryptedChunks: ArrayBuffer[] = [];

  // Derive key once for all chunks
  const key = await deriveKey(password, salt);

  let offset = 0;
  let chunkIndex = 0;

  while (offset < totalSize) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const chunkData = await chunk.arrayBuffer();
    
    // Generate unique IV for each chunk (prepend to encrypted data)
    const chunkIv = generateRandomBytes(IV_LENGTH);
    
    // Encrypt chunk
    const encryptedChunk = await subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: chunkIv.buffer as ArrayBuffer,
      },
      key,
      chunkData
    );

    // Prepend IV to encrypted chunk for decryption
    const ivAndEncrypted = new Uint8Array(chunkIv.length + encryptedChunk.byteLength);
    ivAndEncrypted.set(chunkIv, 0);
    ivAndEncrypted.set(new Uint8Array(encryptedChunk), chunkIv.length);
    
    encryptedChunks.push(ivAndEncrypted.buffer);
    
    offset += CHUNK_SIZE;
    chunkIndex++;

    if (onProgress) {
      onProgress(Math.min(100, Math.round((offset / totalSize) * 100)));
    }
  }

  return {
    encryptedChunks,
    iv: arrayBufferToBase64(iv.buffer),
    salt: arrayBufferToBase64(salt.buffer),
    totalSize,
  };
}

/**
 * Decrypt a chunked file
 */
export async function decryptFileChunked(
  input: ChunkedDecryptionInput,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const salt = base64ToArrayBuffer(input.salt);

  // Derive key from password
  const key = await deriveKey(input.password, new Uint8Array(salt));

  const decryptedChunks: Uint8Array[] = [];
  const totalChunks = input.encryptedChunks.length;

  for (let i = 0; i < totalChunks; i++) {
    const chunkData = new Uint8Array(input.encryptedChunks[i]);
    
    // Extract IV from first 12 bytes
    const chunkIv = chunkData.slice(0, IV_LENGTH);
    const encryptedData = chunkData.slice(IV_LENGTH);

    // Decrypt chunk
    const decryptedChunk = await subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: chunkIv,
      },
      key,
      encryptedData
    );

    decryptedChunks.push(new Uint8Array(decryptedChunk));

    if (onProgress) {
      onProgress(Math.min(100, Math.round(((i + 1) / totalChunks) * 100)));
    }
  }

  // Combine all chunks
  const totalLength = decryptedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of decryptedChunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return new Blob([combined]);
}

/**
 * Encrypt a file (simple version for small files)
 */
export async function encryptFile(file: File, password: string): Promise<EncryptionResult> {
  const data = await file.arrayBuffer();
  return encryptData(data, password);
}

/**
 * Decrypt a file (simple version for small files)
 */
export async function decryptFile(
  encryptedData: ArrayBuffer,
  iv: string,
  salt: string,
  password: string
): Promise<Blob> {
  const decrypted = await decryptData({ encryptedData, iv, salt, password });
  return new Blob([decrypted]);
}

/**
 * Stream encrypt a file for upload (for very large files)
 * Returns a function that encrypts chunks on-demand
 */
export function createEncryptedStream(
  _file: File,
  _password: string,
  _onProgress?: (progress: number) => void
): {
  chunks: ArrayBuffer[];
  iv: string;
  salt: string;
  totalSize: number;
} {
  // For simplicity, we'll use the chunked approach
  // In production, you might want to use Streams API for true streaming
  const salt = generateRandomBytes(SALT_LENGTH);
  const iv = generateRandomBytes(IV_LENGTH);
  const totalSize = _file.size;

  // This is a sync wrapper - actual encryption happens in encryptFileChunked
  return {
    chunks: [],
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
    totalSize,
  };
}

/**
 * Check if a file should be encrypted based on size
 * Files larger than 10MB should use chunked encryption
 */
export function shouldUseChunkedEncryption(fileSize: number): boolean {
  return fileSize > 10 * 1024 * 1024; // 10MB
}

/**
 * Generate a secure random password for file encryption
 */
export function generateSecurePassword(length: number = 32): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const randomValues = generateRandomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }
  return password;
}

/**
 * Verify if a password can decrypt the file
 * This is done by attempting decryption and checking for errors
 */
export async function verifyPassword(
  encryptedData: ArrayBuffer,
  iv: string,
  salt: string,
  password: string
): Promise<boolean> {
  try {
    await decryptData({ encryptedData, iv, salt, password });
    return true;
  } catch (err) {
    console.error('[verifyPassword] Decryption failed:', err);
    return false;
  }
}

/**
 * Generate a small thumbnail from an image file (not encrypted)
 * Returns a Blob of the thumbnail
 */
export async function generateThumbnail(
  file: File,
  maxSize: number = 200
): Promise<Blob | null> {
  // Only process images
  if (!file.type.startsWith('image/')) {
    console.log('[DEBUG] generateThumbnail: not an image', file.type)
    return null
  }

  console.log('[DEBUG] generateThumbnail: starting for', file.name, file.type, file.size)
  try {
    // Load the image
    const bitmap = await createImageBitmap(file)
    console.log('[DEBUG] generateThumbnail: bitmap created', bitmap.width, 'x', bitmap.height)

    // Calculate thumbnail dimensions maintaining aspect ratio
    let width = bitmap.width
    let height = bitmap.height

    if (width > height) {
      if (width > maxSize) {
        height = Math.round((height * maxSize) / width)
        width = maxSize
      }
    } else {
      if (height > maxSize) {
        width = Math.round((width * maxSize) / height)
        height = maxSize
      }
    }

    // Create canvas and draw resized image
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(bitmap, 0, 0, width, height)

    // Convert to JPEG blob with low quality for small size
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b),
        'image/jpeg',
        0.6 // 60% quality - small file size
      )
    })

    console.log('[DEBUG] generateThumbnail: blob created', blob?.size, 'bytes')
    return blob
  } catch (err) {
    console.error('[DEBUG] Failed to generate thumbnail:', err)
    return null
  }
}