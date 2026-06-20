/**
 * Walrus Testnet Integration
 */

const PUBLISHER_URLS = [
  "https://publisher.walrus-testnet.walrus.space",
  "https://wal-publisher-testnet.staketab.org",
  "https://publisher-walrus.testnet.mystenlabs.com"
];

const AGGREGATOR_URLS = [
  "https://aggregator.walrus-testnet.walrus.space",
  "https://wal-aggregator-testnet.staketab.org",
  "https://aggregator-walrus.testnet.mystenlabs.com"
];

export async function uploadToWalrus(blob: Blob, epochs: number = 1): Promise<string> {
  let lastError;

  for (const publisherUrl of PUBLISHER_URLS) {
    try {
      const response = await fetch(`${publisherUrl}/v1/blobs?epochs=${epochs}`, {
        method: "PUT",
        body: blob,
      });

      if (!response.ok) {
        throw new Error(`Walrus upload failed at ${publisherUrl}: ${response.statusText}`);
      }

      const data = await response.json();
      // Walrus returns either newlyCreated or alreadyCertified
      const blobInfo = data.newlyCreated || data.alreadyCertified;
      if (!blobInfo || !blobInfo.blobObject || !blobInfo.blobObject.blobId) {
        throw new Error("Failed to parse Walrus response");
      }

      return blobInfo.blobObject.blobId;
    } catch (err) {
      console.warn(`Upload to ${publisherUrl} failed, trying next...`, err);
      lastError = err;
    }
  }
  
  throw new Error(`All Walrus publishers failed to upload. Please try again later. Last error: ${lastError?.message || lastError}`);
}

export async function downloadFromWalrus(blobId: string): Promise<ArrayBuffer> {
  let lastError;

  for (const aggregatorUrl of AGGREGATOR_URLS) {
    try {
      const response = await fetch(`${aggregatorUrl}/v1/blobs/${blobId}`);
      
      if (!response.ok) {
        throw new Error(`Walrus download failed at ${aggregatorUrl}: ${response.statusText}`);
      }

      return await response.arrayBuffer();
    } catch (err) {
      console.warn(`Download from ${aggregatorUrl} failed, trying next...`, err);
      lastError = err;
    }
  }

  throw new Error(`All Walrus aggregators failed to download. Last error: ${lastError?.message || lastError}`);
}
