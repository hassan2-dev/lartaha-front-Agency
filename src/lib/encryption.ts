
// Use browser's Web Crypto API
const crypto = window.crypto;
const subtle = crypto?.subtle;

// Configuration
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16; // 16 bytes = 128 bits
const IV_LENGTH = 12;   // 12 bytes = 96 bits (recommended for GCM)
const KEY_LENGTH = 256; // 256 bits for AES-256-GCM
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for large file encryption
const THUMBNAIL_MAGIC = 'E2ETHMB1';
const CHUNKED_FILE_MAGIC = 'E2ECHUNK'; // Magic bytes for chunked encrypted files

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
  chunkSizes?: number[];
}

export interface ChunkedDecryptionInput {
  encryptedChunks: ArrayBuffer[];
  iv: string;
  salt: string;
  password: string;
}

export interface EncryptedThumbnailPayload {
  buffer: ArrayBuffer;
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

function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function bytesToText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
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
  const chunkSizes: number[] = [];

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
    chunkSizes.push(ivAndEncrypted.length);
    
    offset += CHUNK_SIZE;
    chunkIndex++;

    if (onProgress) {
      onProgress(Math.min(100, Math.round((offset / totalSize) * 100)));
    }
  }

  // Create a single blob with header for chunk metadata
  // Header format: [MAGIC(8 bytes)] [NUM_CHUNKS(4 bytes)] [CHUNK_SIZES(num_chunks * 4 bytes)]
  const magicBytes = textToBytes(CHUNKED_FILE_MAGIC);
  const numChunks = encryptedChunks.length;
  const headerSize = magicBytes.length + 4 + (numChunks * 4);
  const header = new Uint8Array(headerSize);
  
  // Write magic bytes
  header.set(magicBytes, 0);
  
  // Write number of chunks (4 bytes, big-endian)
  const numChunksView = new DataView(header.buffer, magicBytes.length, 4);
  numChunksView.setUint32(0, numChunks, false);
  
  // Write chunk sizes (4 bytes each, big-endian)
  for (let i = 0; i < numChunks; i++) {
    const chunkSizeView = new DataView(header.buffer, magicBytes.length + 4 + (i * 4), 4);
    chunkSizeView.setUint32(0, chunkSizes[i], false);
  }
  
  // Combine header and encrypted chunks into a blob array to avoid memory allocation issues
  // For very large files, we return chunks separately instead of combining into one array
  const totalEncryptedSize = headerSize + encryptedChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  
  // Only combine into a single array if total size is reasonable (< 1GB)
  if (totalEncryptedSize < 1024 * 1024 * 1024) {
    try {
      const combined = new Uint8Array(totalEncryptedSize);
      combined.set(header, 0);
      
      let offset2 = headerSize;
      for (const chunk of encryptedChunks) {
        combined.set(new Uint8Array(chunk), offset2);
        offset2 += chunk.byteLength;
      }
      return {
        encryptedChunks: [combined.buffer],
        iv: arrayBufferToBase64(iv.buffer),
        salt: arrayBufferToBase64(salt.buffer),
        totalSize,
        chunkSizes,
      };
    } catch (err) {
      console.warn('[encryptFileChunked] Failed to combine chunks into single array:', err);
      // Fall through to chunked return below
    }
  }
  
  // For very large files, return the header and chunks separately
  const allChunks = [header.buffer as ArrayBuffer, ...encryptedChunks];
  return {
    encryptedChunks: allChunks,
    iv: arrayBufferToBase64(iv.buffer),
    salt: arrayBufferToBase64(salt.buffer),
    totalSize,
    chunkSizes,
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
  const magicBytes = textToBytes(CHUNKED_FILE_MAGIC);
  
  // Check if the input is multiple chunks with header as first chunk (new format for large files)
  if (input.encryptedChunks.length > 1) {
    const headerData = new Uint8Array(input.encryptedChunks[0]);
    
    // Check if this is the new format with header
    if (headerData.length >= magicBytes.length && 
        headerData.slice(0, magicBytes.length).every((val, idx) => val === magicBytes[idx])) {
      // Parse header
      const numChunks = new DataView(headerData.buffer, magicBytes.length, 4).getUint32(0, false);
      const chunkSizes: number[] = [];
      let offset = magicBytes.length + 4;
      
      for (let i = 0; i < numChunks; i++) {
        const chunkSize = new DataView(headerData.buffer, offset, 4).getUint32(0, false);
        chunkSizes.push(chunkSize);
        offset += 4;
      }
      
      // Now decrypt each chunk (skipping the header chunk at index 0)
      const totalChunks = Math.min(numChunks, input.encryptedChunks.length - 1);
      for (let i = 0; i < totalChunks; i++) {
        const chunkData = new Uint8Array(input.encryptedChunks[i + 1]);
        
        // Extract IV from first 12 bytes
        const chunkIv = chunkData.slice(0, IV_LENGTH);
        const encryptedData = chunkData.slice(IV_LENGTH);
        
        // Decrypt chunk
        try {
          const decryptedChunk = await subtle.decrypt(
            {
              name: 'AES-GCM',
              iv: chunkIv,
            },
            key,
            encryptedData
          );
          
          decryptedChunks.push(new Uint8Array(decryptedChunk));
        } catch (err) {
          console.error('[decryptFileChunked] Failed to decrypt chunk', i, ':', err);
          throw new Error(`Failed to decrypt chunk ${i}: ${err instanceof Error ? err.message : String(err)}`)
        }
        
        if (onProgress) {
          onProgress(Math.min(100, Math.round(((i + 1) / totalChunks) * 100)));
        }
      }
      
      // Combine all decrypted chunks
      const totalLength = decryptedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let combinedOffset = 0;
      for (const chunk of decryptedChunks) {
        combined.set(chunk, combinedOffset);
        combinedOffset += chunk.length;
      }
      
      return new Blob([combined]);
    }
  }
  
  // Check if the input is a single blob with header (old new format)
  if (input.encryptedChunks.length === 1) {
    const data = new Uint8Array(input.encryptedChunks[0]);
    const magicBytes = textToBytes(CHUNKED_FILE_MAGIC);
    
    // Check if this is the new format with header
    if (data.length >= magicBytes.length && 
        data.slice(0, magicBytes.length).every((val, idx) => val === magicBytes[idx])) {
      // Parse header
      const numChunks = new DataView(data.buffer, magicBytes.length, 4).getUint32(0, false);
      const chunkSizes: number[] = [];
      let offset = magicBytes.length + 4;
      
      for (let i = 0; i < numChunks; i++) {
        const chunkSize = new DataView(data.buffer, offset, 4).getUint32(0, false);
        chunkSizes.push(chunkSize);
        offset += 4;
      }
      
      // Now decrypt each chunk
      let dataOffset = offset;
      for (let i = 0; i < numChunks; i++) {
        const chunkSize = chunkSizes[i];
        const chunkData = data.slice(dataOffset, dataOffset + chunkSize);
        
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
        dataOffset += chunkSize;
        
        if (onProgress) {
          onProgress(Math.min(100, Math.round(((i + 1) / numChunks) * 100)));
        }
      }
    } else {
      // Old format: single blob with concatenated encrypted chunks
      // We need to parse the blob to find chunk boundaries
      // Each chunk has format: [IV (12 bytes)] + [Encrypted data]
      // The encrypted data includes the authentication tag at the end (16 bytes for GCM)
      
      console.log('[decryptFileChunked] Parsing old format single blob...')
      
      let offset = 0;
      let chunkIndex = 0;
      
      while (offset < data.length) {
        // Each chunk starts with an IV (12 bytes)
        if (offset + IV_LENGTH > data.length) {
          throw new Error(`Invalid encrypted data: chunk ${chunkIndex} has incomplete IV`)
        }
        
        // For old format, we need to find the end of each chunk
        // Since we don't have chunk metadata, we'll try to decrypt each chunk
        // and see if it succeeds
        
        // Try to find the end of the encrypted data by attempting decryption
        // We'll try different chunk sizes until we find one that works
        let chunkEnd = offset + IV_LENGTH + 16; // Minimum encrypted data size (IV + auth tag)
        let foundValidChunk = false;
        
        // Try to find a valid chunk by attempting decryption
        for (let i = chunkEnd; i < Math.min(offset + 10 * 1024 * 1024, data.length); i++) {
          try {
            const chunkData = data.slice(offset, i);
            const chunkIv = chunkData.slice(0, IV_LENGTH);
            const encryptedData = chunkData.slice(IV_LENGTH);
            
            // Try to decrypt to see if this is a valid chunk
            await subtle.decrypt(
              {
                name: 'AES-GCM',
                iv: chunkIv,
              },
              key,
              encryptedData
            );
            
            // If decryption succeeded, this is a valid chunk
            chunkEnd = i;
            foundValidChunk = true;
            break;
          } catch (err) {
            // Decryption failed, try next chunk size
            continue;
          }
        }
        
        if (!foundValidChunk) {
          // If we couldn't find a valid chunk, assume this is the last chunk
          chunkEnd = data.length;
        }
        
        const chunkData = data.slice(offset, chunkEnd);
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
        offset = chunkEnd;
        chunkIndex++;
        
        if (onProgress) {
          onProgress(Math.min(100, Math.round((offset / data.length) * 100)));
        }
      }
      
      console.log('[decryptFileChunked] Parsed', chunkIndex, 'chunks from old format')
    }
  } else {
    // Old format: each chunk is a separate ArrayBuffer with IV prepended
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
 * Encrypt a thumbnail blob with a self-contained header.
 * Header layout:
 * [magic(8 bytes)] [ivLen(1)] [saltLen(1)] [iv bytes] [salt bytes] [ciphertext]
 */
export async function encryptThumbnailBlob(blob: Blob, password: string): Promise<Blob> {
  const data = await blob.arrayBuffer();
  const { encryptedData, iv, salt } = await encryptData(data, password);
  const ivBytes = new Uint8Array(base64ToArrayBuffer(iv));
  const saltBytes = new Uint8Array(base64ToArrayBuffer(salt));
  const magicBytes = textToBytes(THUMBNAIL_MAGIC);

  const headerLength = magicBytes.length + 1 + 1 + ivBytes.length + saltBytes.length;
  const totalLength = headerLength + encryptedData.byteLength;
  const out = new Uint8Array(totalLength);

  let offset = 0;
  out.set(magicBytes, offset);
  offset += magicBytes.length;
  out[offset++] = ivBytes.length;
  out[offset++] = saltBytes.length;
  out.set(ivBytes, offset);
  offset += ivBytes.length;
  out.set(saltBytes, offset);
  offset += saltBytes.length;
  out.set(new Uint8Array(encryptedData), offset);

  return new Blob([out.buffer], { type: 'application/octet-stream' });
}

/**
 * Decrypt a thumbnail buffer produced by encryptThumbnailBlob.
 */
export async function decryptThumbnailBuffer(buffer: ArrayBuffer, password: string): Promise<Blob> {
  const view = new Uint8Array(buffer);
  const magicBytes = textToBytes(THUMBNAIL_MAGIC);
  if (view.length < magicBytes.length + 2) {
    throw new Error('Invalid thumbnail payload');
  }

  const magic = bytesToText(view.slice(0, magicBytes.length));
  if (magic !== THUMBNAIL_MAGIC) {
    throw new Error('Unknown thumbnail payload');
  }

  let offset = magicBytes.length;
  const ivLen = view[offset++];
  const saltLen = view[offset++];
  if (view.length < offset + ivLen + saltLen) {
    throw new Error('Invalid thumbnail payload');
  }

  const ivBytes = view.slice(offset, offset + ivLen);
  offset += ivLen;
  const saltBytes = view.slice(offset, offset + saltLen);
  offset += saltLen;
  const encryptedData = view.slice(offset).buffer;

  const iv = arrayBufferToBase64(ivBytes.buffer);
  const salt = arrayBufferToBase64(saltBytes.buffer);
  const decrypted = await decryptData({ encryptedData, iv, salt, password });
  return new Blob([decrypted]);
}

/**
 * Download and decrypt a file in chunks for streaming playback
 * This is optimized for large video files
 * 
 * Note: This function expects the file size to be passed separately
 * since pre-signed URLs don't support HEAD requests
 */
export async function downloadAndDecryptStream(
  url: string,
  iv: string,
  salt: string,
  password: string,
  fileSize: number, // Added file size parameter
  onProgress?: (progress: number) => void,
  fileId?: string, // Optional file ID for caching
  mimeType?: string, // Optional MIME type for caching
  filename?: string // Optional filename for caching
): Promise<Blob> {
  console.log('[downloadAndDecryptStream] Starting streaming download and decryption...');
  console.log('[downloadAndDecryptStream] File size:', fileSize)
  
  if (fileSize === 0) {
    throw new Error('Invalid file size')
  }
  
  // Check cache first if fileId is provided
  if (fileId) {
    const { getFileFromCache, generateCacheKey } = await import('./fileCache');
    const cacheKey = generateCacheKey(fileId, password);
    const cachedFile = await getFileFromCache(cacheKey);
    
    if (cachedFile) {
      console.log('[downloadAndDecryptStream] Found file in cache:', fileId);
      return cachedFile.decryptedBlob;
    }
    
    console.log('[downloadAndDecryptStream] File not in cache, downloading...');
  }
  
  // For encrypted files, we need to download the entire file first
  // because the encrypted chunks are concatenated together
  console.log('[downloadAndDecryptStream] Downloading entire encrypted file...')
  
  const response = await fetch(url, {
    headers: {
      'Origin': window.location.origin,
    },
  })
  
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`)
  }
  
  const encryptedData = await response.arrayBuffer()
  console.log('[downloadAndDecryptStream] Downloaded encrypted data:', encryptedData.byteLength, 'bytes')
  
  // For encrypted files, we need to split into chunks based on the encryption format
  // Each chunk has format: [IV (12 bytes)] + [Encrypted data]
  // We need to parse the encrypted data to find chunk boundaries
  
  // First, try to decrypt as a single file
  try {
    console.log('[downloadAndDecryptStream] Trying to decrypt as single file...')
    const decrypted = await decryptFile(encryptedData, iv, salt, password)
    console.log('[downloadAndDecryptStream] Successfully decrypted as single file')
    
    // Cache the decrypted file if fileId is provided
    if (fileId && mimeType && filename) {
      const { putFileInCache, generateCacheKey } = await import('./fileCache');
      const cacheKey = generateCacheKey(fileId, password);
      await putFileInCache(cacheKey, decrypted, {
        mimeType,
        filename,
        size: fileSize,
      });
      console.log('[downloadAndDecryptStream] Cached decrypted file:', fileId);
    }
    
    return decrypted
  } catch (err) {
    console.log('[downloadAndDecryptStream] Failed to decrypt as single file, trying chunked approach...')
  }
  
  // If that fails, try to decrypt as chunked file
  // The new format has a header with chunk metadata
  console.log('[downloadAndDecryptStream] Trying to decrypt as chunked file...')
  
  try {
    const decrypted = await decryptFileChunked(
      { encryptedChunks: [encryptedData], iv, salt, password },
      onProgress
    )
    console.log('[downloadAndDecryptStream] Successfully decrypted chunked file')
    
    // Cache the decrypted file if fileId is provided
    if (fileId && mimeType && filename) {
      const { putFileInCache, generateCacheKey } = await import('./fileCache');
      const cacheKey = generateCacheKey(fileId, password);
      await putFileInCache(cacheKey, decrypted, {
        mimeType,
        filename,
        size: fileSize,
      });
      console.log('[downloadAndDecryptStream] Cached decrypted file:', fileId);
    }
    
    return decrypted
  } catch (err) {
    console.error('[downloadAndDecryptStream] Failed to decrypt chunked file:', err)
    throw err
  }
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
 * Generate a small thumbnail from an image or video file (not encrypted)
 * Returns a Blob of the thumbnail
 */
export async function generateThumbnail(
  file: File,
  maxSize: number = 200
): Promise<Blob | null> {
  console.log('[DEBUG] generateThumbnail: starting for', file.name, file.type, file.size)

  // Handle images
  if (file.type.startsWith('image/')) {
    return await generateImageThumbnail(file, maxSize)
  }

  // Handle videos - check MIME type and file extension
  const isVideo = file.type.startsWith('video/') || 
    file.name.toLowerCase().match(/\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v|3gp|ogv|ts|m3u8)$/i);
  
  if (isVideo) {
    return await generateVideoThumbnail(file, maxSize)
  }

  console.log('[DEBUG] generateThumbnail: unsupported file type', file.type, 'for', file.name)
  return null
}

/**
 * Generates a thumbnail from an image file
 */
async function generateImageThumbnail(
  file: File,
  maxSize: number
): Promise<Blob | null> {
  try {
    // Load the image
    const bitmap = await createImageBitmap(file)
    console.log('[DEBUG] generateImageThumbnail: bitmap created', bitmap.width, 'x', bitmap.height)

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

    console.log('[DEBUG] generateImageThumbnail: blob created', blob?.size, 'bytes')
    return blob
  } catch (err) {
    console.error('[DEBUG] Failed to generate image thumbnail:', err)
    return null
  }
}

/**
 * Generates a thumbnail from a video file by extracting the first frame
 * Skips videos over 100MB to prevent browser crashes from memory exhaustion
 */
async function generateVideoThumbnail(
  file: File,
  maxSize: number
): Promise<Blob | null> {
  // Skip very large video files to prevent browser crashes
  // Video elements try to buffer the entire file when preload='auto'/'metadata'
  const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB limit
  if (file.size > MAX_VIDEO_SIZE) {
    console.log('[DEBUG] generateVideoThumbnail: skipping large video', file.name, Math.round(file.size / 1024 / 1024), 'MB (limit: 100MB)')
    return null
  }
  
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      console.error('[DEBUG] Failed to get canvas context for video thumbnail')
      resolve(null)
      return
    }

    const url = URL.createObjectURL(file)
    
    // Configure video element for better compatibility
    video.src = url
    video.preload = 'metadata'
    video.crossOrigin = 'anonymous'
    video.muted = true
    
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let hasResolved = false

    const cleanup = () => {
      hasResolved = true
      if (timeoutId !== null) clearTimeout(timeoutId)
      URL.revokeObjectURL(url)
    }

    // Extract frame at 1 second or 10% into the video
    video.onloadedmetadata = () => {
      try {
        // Seek to 1 second or 10% into the video, whichever is smaller
        const seekTime = Math.min(1, video.duration * 0.1)
        video.currentTime = seekTime
        console.log('[DEBUG] generateVideoThumbnail: video metadata loaded', {
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          seekTime,
        })
      } catch (err) {
        console.error('[DEBUG] Error seeking video:', err)
        cleanup()
        resolve(null)
      }
    }

    video.onseeked = () => {
      if (hasResolved) return
      
      try {
        // Set canvas size to video dimensions
        let width = video.videoWidth
        let height = video.videoHeight

        console.log('[DEBUG] generateVideoThumbnail: frame ready', { width, height })

        // If dimensions are still 0, the video might not be properly loaded
        if (width === 0 || height === 0) {
          console.warn('[DEBUG] Video dimensions are 0, video may not be loadable')
          cleanup()
          resolve(null)
          return
        }

        // Scale to maxSize
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

        canvas.width = width
        canvas.height = height

        // Draw the video frame to canvas
        ctx.drawImage(video, 0, 0, width, height)

        // Convert to JPEG blob
        canvas.toBlob(
          (blob) => {
            if (hasResolved) return
            cleanup()
            if (blob) {
              console.log('[DEBUG] generateVideoThumbnail: blob created', blob.size, 'bytes')
              hasResolved = true
              resolve(blob)
            } else {
              console.error('[DEBUG] Failed to create blob from video frame')
              hasResolved = true
              resolve(null)
            }
          },
          'image/jpeg',
          0.6 // 60% quality
        )
      } catch (err) {
        if (hasResolved) return
        console.error('[DEBUG] Error generating video thumbnail:', err)
        cleanup()
        resolve(null)
      }
    }

    video.onerror = () => {
      if (hasResolved) return
      console.error('[DEBUG] Error loading video for thumbnail, error:', video.error)
      cleanup()
      resolve(null)
    }

    // Set a longer timeout fallback in case video doesn't load
    timeoutId = setTimeout(() => {
      if (!hasResolved) {
        console.warn('[DEBUG] Video thumbnail generation timeout')
        cleanup()
        hasResolved = true
        resolve(null)
      }
    }, 5000)
    setTimeout(() => {
      if (video.readyState >= 2) {
        // HAVE_CURRENT_DATA or better
        const event = new Event('seeked')
        video.dispatchEvent(event)
      } else {
        console.warn('[DEBUG] Video readyState insufficient for thumbnail')
        if (!hasResolved) {
          cleanup()
          hasResolved = true
          resolve(null)
        }
      }
    }, 5000)
  })
}