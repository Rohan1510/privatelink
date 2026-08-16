export const MAX_FILE_SIZE_BYTES = 250 * 1024 * 1024;
export const FILE_CHUNK_SIZE = 16 * 1024;
export const FILE_BUFFER_HIGH_WATER = 512 * 1024;
export const FILE_BUFFER_LOW_WATER = 256 * 1024;

const encoder = new TextEncoder();

export const bytesToB64 = (bytes) => btoa(String.fromCharCode(...bytes));
export const b64ToBytes = (value) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

export function makeTransferId() {
  return bytesToB64(crypto.getRandomValues(new Uint8Array(18)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function fileAAD(transferId, index, totalChunks) {
  return encoder.encode(JSON.stringify({ v: 1, transferId, index, totalChunks }));
}

export async function encryptFileChunk(keyBytes, plaintext, additionalData) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData }, key, plaintext);
  return { iv: iv.buffer, ciphertext };
}

export async function decryptFileChunk(keyBytes, iv, ciphertext, additionalData) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData }, key, ciphertext);
}

export function waitForWritableBuffer(dataChannel) {
  if (!dataChannel || dataChannel.bufferedAmount <= FILE_BUFFER_HIGH_WATER) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onLow = () => {
      cleanup();
      resolve();
    };
    const onClose = () => {
      cleanup();
      reject(new Error("File connection closed"));
    };
    const cleanup = () => {
      dataChannel.removeEventListener("bufferedamountlow", onLow);
      dataChannel.removeEventListener("close", onClose);
      dataChannel.removeEventListener("error", onClose);
    };
    dataChannel.bufferedAmountLowThreshold = FILE_BUFFER_LOW_WATER;
    dataChannel.addEventListener("bufferedamountlow", onLow, { once: true });
    dataChannel.addEventListener("close", onClose, { once: true });
    dataChannel.addEventListener("error", onClose, { once: true });
  });
}
