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
  const exportedKeyBuffer = new Uint8Array(exported);
  return Buffer.from(exportedKeyBuffer).toString("base64");
}

export async function importKey(keyStr: string): Promise<CryptoKey> {
  const keyBuffer = Buffer.from(keyStr, "base64");
  return await window.crypto.subtle.importKey(
    "raw",
    keyBuffer,
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
  // Extract the 12-byte IV
  const iv = new Uint8Array(combinedBuffer.slice(0, 12));
  const ciphertext = combinedBuffer.slice(12);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    ciphertext
  );

  return new Blob([decryptedBuffer], { type: "application/pdf" });
}
