/**
 * Encryption Utilities using Web Crypto API (AES-GCM)
 */

export async function generateKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("raw", key);
  const exportedArray = Array.from(new Uint8Array(exported));
  const binaryString = String.fromCharCode.apply(null, exportedArray);
  return window.btoa(binaryString);
}

export async function importKey(keyStr: string): Promise<CryptoKey> {
  const binaryString = window.atob(keyStr);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return await window.crypto.subtle.importKey(
    "raw",
    bytes,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptFile(file: File, key: CryptoKey): Promise<Blob> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const fileBuffer = await file.arrayBuffer();

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    fileBuffer
  );

  // Prepend IV to the ciphertext
  const combinedBuffer = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  combinedBuffer.set(iv, 0);
  combinedBuffer.set(new Uint8Array(encryptedBuffer), iv.length);

  return new Blob([combinedBuffer], { type: "application/octet-stream" });
}

export async function decryptFile(combinedBuffer: ArrayBuffer, key: CryptoKey): Promise<Blob> {
  if (combinedBuffer.byteLength < 12) {
    throw new Error("Invalid encrypted file: file is too small to contain IV.");
  }

  // Extract the 12-byte IV
  const iv = new Uint8Array(combinedBuffer.slice(0, 12));
  const ciphertext = combinedBuffer.slice(12);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      ciphertext
    );

    return new Blob([decryptedBuffer], { type: "application/pdf" });
  } catch (err: any) {
    throw new Error("Decryption failed. The encryption key may be incorrect, or the document file was corrupted.");
  }
}
