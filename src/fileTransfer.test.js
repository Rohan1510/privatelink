import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  makeTransferId,
  fileAAD,
  encryptFileChunk,
  decryptFileChunk,
  bytesToB64,
  b64ToBytes,
  FILE_CHUNK_SIZE
} from "./fileTransfer.js";

describe("makeTransferId", () => {
  it("generates a valid URL-safe transfer ID", () => {
    const id = makeTransferId();
    assert.equal(typeof id, "string");
    assert.equal(id.length, 24);
    assert.match(id, /^[A-Za-z0-9_-]+$/);
  });

  it("generates distinct transfer IDs across calls", () => {
    const ids = new Set();
    for (let i = 0; i < 50; i++) {
      ids.add(makeTransferId());
    }
    assert.equal(ids.size, 50);
  });
});

describe("fileAAD", () => {
  it("produces a Uint8Array containing encoded metadata", () => {
    const transferId = "test-transfer-id";
    const aad = fileAAD(transferId, 0, 5);
    assert.ok(aad instanceof Uint8Array);

    const decoded = JSON.parse(new TextDecoder().decode(aad));
    assert.deepEqual(decoded, {
      v: 1,
      transferId: "test-transfer-id",
      index: 0,
      totalChunks: 5
    });
  });

  it("produces distinct AAD for different chunk indices or transfer IDs", () => {
    const aad1 = fileAAD("transfer-1", 0, 3);
    const aad2 = fileAAD("transfer-1", 1, 3);
    const aad3 = fileAAD("transfer-2", 0, 3);
    assert.notDeepEqual(aad1, aad2);
    assert.notDeepEqual(aad1, aad3);
  });
});

describe("encryptFileChunk", () => {
  it("encrypts plaintext and returns iv and ciphertext", async () => {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const plaintext = new TextEncoder().encode("Hello, secure file transfer!");
    const aad = fileAAD("transfer-abc", 0, 1);

    const { iv, ciphertext } = await encryptFileChunk(keyBytes, plaintext, aad);

    assert.ok(iv instanceof ArrayBuffer);
    assert.equal(iv.byteLength, 12);
    assert.ok(ciphertext instanceof ArrayBuffer);
    assert.equal(ciphertext.byteLength, plaintext.byteLength + 16);
    assert.notDeepEqual(new Uint8Array(ciphertext), plaintext);
  });

  it("produces unique IVs and ciphertexts for identical plaintext", async () => {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const plaintext = new TextEncoder().encode("Identical content");
    const aad = fileAAD("transfer-abc", 0, 1);

    const enc1 = await encryptFileChunk(keyBytes, plaintext, aad);
    const enc2 = await encryptFileChunk(keyBytes, plaintext, aad);

    assert.notDeepEqual(new Uint8Array(enc1.iv), new Uint8Array(enc2.iv));
    assert.notDeepEqual(new Uint8Array(enc1.ciphertext), new Uint8Array(enc2.ciphertext));
  });
});

describe("decryptFileChunk", () => {
  it("decrypts ciphertext back to original plaintext with authentic AAD", async () => {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const originalText = "Test file chunk payload content";
    const plaintext = new TextEncoder().encode(originalText);
    const aad = fileAAD("transfer-xyz", 2, 10);

    const { iv, ciphertext } = await encryptFileChunk(keyBytes, plaintext, aad);
    const decryptedBuffer = await decryptFileChunk(keyBytes, iv, ciphertext, aad);

    assert.ok(decryptedBuffer instanceof ArrayBuffer);
    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    assert.equal(decryptedText, originalText);
  });

  it("successfully handles full FILE_CHUNK_SIZE (16KB) binary payload", async () => {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const chunkData = crypto.getRandomValues(new Uint8Array(FILE_CHUNK_SIZE));
    const aad = fileAAD("transfer-16k", 0, 1);

    const { iv, ciphertext } = await encryptFileChunk(keyBytes, chunkData, aad);
    const decryptedBuffer = await decryptFileChunk(keyBytes, iv, ciphertext, aad);

    assert.deepEqual(new Uint8Array(decryptedBuffer), chunkData);
  });

  it("fails decryption when AAD is tampered (different index)", async () => {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const plaintext = new TextEncoder().encode("Critical chunk data");
    const authenticAAD = fileAAD("transfer-safe", 0, 5);
    const tamperedAAD = fileAAD("transfer-safe", 1, 5);

    const { iv, ciphertext } = await encryptFileChunk(keyBytes, plaintext, authenticAAD);

    await assert.rejects(
      async () => {
        await decryptFileChunk(keyBytes, iv, ciphertext, tamperedAAD);
      },
      (err) => err instanceof Error
    );
  });

  it("fails decryption when AAD is tampered (different transferId)", async () => {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const plaintext = new TextEncoder().encode("Critical chunk data");
    const authenticAAD = fileAAD("transfer-alpha", 0, 5);
    const tamperedAAD = fileAAD("transfer-bravo", 0, 5);

    const { iv, ciphertext } = await encryptFileChunk(keyBytes, plaintext, authenticAAD);

    await assert.rejects(
      async () => {
        await decryptFileChunk(keyBytes, iv, ciphertext, tamperedAAD);
      },
      (err) => err instanceof Error
    );
  });

  it("fails decryption when AAD payload bytes are corrupted", async () => {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const plaintext = new TextEncoder().encode("Data to protect");
    const authenticAAD = fileAAD("transfer-corrupt", 0, 2);
    const tamperedAAD = new Uint8Array(authenticAAD);
    tamperedAAD[tamperedAAD.length - 1] ^= 0xff;

    const { iv, ciphertext } = await encryptFileChunk(keyBytes, plaintext, authenticAAD);

    await assert.rejects(
      async () => {
        await decryptFileChunk(keyBytes, iv, ciphertext, tamperedAAD);
      },
      (err) => err instanceof Error
    );
  });

  it("fails decryption when ciphertext is tampered", async () => {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const plaintext = new TextEncoder().encode("Tamper-evident data");
    const aad = fileAAD("transfer-tamper", 0, 1);

    const { iv, ciphertext } = await encryptFileChunk(keyBytes, plaintext, aad);
    const tamperedCiphertext = new Uint8Array(ciphertext);
    tamperedCiphertext[0] ^= 0x01;

    await assert.rejects(
      async () => {
        await decryptFileChunk(keyBytes, iv, tamperedCiphertext.buffer, aad);
      },
      (err) => err instanceof Error
    );
  });

  it("fails decryption with wrong key", async () => {
    const keyBytes1 = crypto.getRandomValues(new Uint8Array(32));
    const keyBytes2 = crypto.getRandomValues(new Uint8Array(32));
    const plaintext = new TextEncoder().encode("Secret message");
    const aad = fileAAD("transfer-wrong-key", 0, 1);

    const { iv, ciphertext } = await encryptFileChunk(keyBytes1, plaintext, aad);

    await assert.rejects(
      async () => {
        await decryptFileChunk(keyBytes2, iv, ciphertext, aad);
      },
      (err) => err instanceof Error
    );
  });

  it("supports Uint8Array view buffers for iv and ciphertext", async () => {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const originalText = "Buffer view compatibility check";
    const plaintext = new TextEncoder().encode(originalText);
    const aad = fileAAD("transfer-views", 0, 1);

    const { iv, ciphertext } = await encryptFileChunk(keyBytes, plaintext, aad);
    const ivView = new Uint8Array(iv);
    const ciphertextView = new Uint8Array(ciphertext);

    const decryptedBuffer = await decryptFileChunk(keyBytes, ivView, ciphertextView, aad);
    assert.equal(new TextDecoder().decode(decryptedBuffer), originalText);
  });
});

describe("bytesToB64 and b64ToBytes", () => {
  it("round-trips arbitrary byte sequences", () => {
    const sampleBytes = new Uint8Array([0, 1, 2, 127, 128, 254, 255]);
    const b64 = bytesToB64(sampleBytes);
    const restored = b64ToBytes(b64);
    assert.deepEqual(restored, sampleBytes);
  });
});
