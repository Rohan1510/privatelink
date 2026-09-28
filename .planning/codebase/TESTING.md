---
last_mapped_commit: 4915398a31e9820e979079eefbd6ab2b42fefe7f
last_mapped_at: 2026-09-28
---
# Testing Patterns

**Analysis Date:** 2026-09-28

## Test Framework

**Runner:**

- Node.js Native Test Runner (`node:test`)
- Config: Embedded in `package.json` script: `"test": "node --test src/*.test.js"`

**Assertion Library:**

- Node.js Strict Assertions (`node:assert/strict`)

**Run Commands:**

```bash
npm test                      # Run all tests via node --test
node --test src/ratchet.test.js  # Run single test suite
```

## Test File Organization

**Location:**

- Co-located with implementation files in `src/` directory

**Naming:**

- Suffix pattern: `<module>.test.js`
- Test files:
  - `src/ratchet.test.js`: Double Ratchet protocol and cryptographic operations
  - `src/trustStore.test.js`: Fingerprint formatting, schema validation, and storage bounds
  - `src/headers.test.js`: Static HTML verification for Content-Security-Policy headers

**Structure:**

```
src/
├── headers.test.js
├── ratchet.js
├── ratchet.test.js
├── trustStore.js
└── trustStore.test.js
```

## Test Structure

**Suite Organization:**

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import {
  generateDHKeyPair,
  computeDHSecret,
  DoubleRatchetSession
} from "./ratchet.js";

test("Double Ratchet - Normal 2-way conversation and ratchet stepping", async () => {
  // 1. Setup / Key Generation
  const aliceDH = await generateDHKeyPair();
  const bobDH = await generateDHKeyPair();

  // 2. Handshake / Shared Secret
  const aliceShared = await computeDHSecret(aliceDH.privateKey, bobDH.publicKey);
  const bobShared = await computeDHSecret(bobDH.privateKey, aliceDH.publicKey);
  assert.deepEqual(aliceShared, bobShared, "Initial shared secrets must match");

  // 3. Session Initialization
  const aliceSession = new DoubleRatchetSession();
  const bobSession = new DoubleRatchetSession();
  await aliceSession.init(true, aliceShared, aliceDH, bobDH.publicKey, bobDHPubRaw);
  await bobSession.init(false, bobShared, bobDH, aliceDH.publicKey, aliceDHPubRaw);

  // 4. Execution & Assertions
  const msg1 = "Hello Bob! Secret transmission 1";
  const pkt1 = await aliceSession.encrypt(msg1);
  const dec1 = await bobSession.decrypt(pkt1);
  assert.equal(dec1, msg1);
});
```

**Patterns:**

- **Zero-Dependency Execution:** Tests run directly under Node.js without requiring transpilation, Babel, or third-party test runners.
- **Asynchronous Test Cases:** `async () => { ... }` wrappers for native Web Crypto API promises.
- **Strict Invariant Verification:** Asserting matching secrets (`assert.deepEqual`), decrypted plaintexts (`assert.equal`), and rejected attacks (`assert.rejects`).

## Mocking

**Framework:**

- No mocking library used. All tests run against native Node.js runtime primitives.

**What to Mock:**

- Browser-specific global objects (like `localStorage`) when testing in Node.js environment:

```javascript
// src/trustStore.test.js
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear()
};
```

**What NOT to Mock:**

- Cryptographic primitives (`crypto.subtle`) — Node.js provides a standard, compliant implementation of the Web Crypto API, allowing real cryptographic derivation, encryption, and decryption in tests.

## Fixtures and Factories

**Test Data Generation:**

- Cryptographic keys generated on the fly via `generateDHKeyPair()`
- Canonical test vectors and strings ("Unique message", "Packet 1", "Packet 2")
- In-memory mock storage maps for `localStorage`

## Coverage

**Requirements:**

- Core cryptographic functions (`src/ratchet.js`) and trust store validation (`src/trustStore.js`) require 100% path coverage for adversarial conditions (replay attacks, out-of-order packets, ciphertext tampering).
- No formal coverage threshold enforced via CI tooling currently.

## Test Types

**Unit Tests:**

- Trust store validation and regex matching (`src/trustStore.test.js`)
- Header and CSP configuration checking (`src/headers.test.js`)

**Integration / Protocol Tests:**

- End-to-end Double Ratchet simulated conversation between two `DoubleRatchetSession` instances (`src/ratchet.test.js`)

**Security / Adversarial Tests:**

- Out-of-order message delivery via `MKSKIP` buffer (`src/ratchet.test.js:42`)
- Replay attack rejection (`src/ratchet.test.js:76`)
- Ciphertext and header tampering rejection (`src/ratchet.test.js:108`)
- Session state destruction and key zeroing (`src/ratchet.test.js:133`)

## Common Patterns

**Adversarial Rejection Testing:**

```javascript
await assert.rejects(
  async () => {
    await bobSession.decrypt(replayedOrTamperedPacket);
  },
  "Tampered or replayed packet must fail decryption"
);
```

**Memory Zeroing Verification:**

```javascript
session.destroy();
assert.equal(session.RK, null);
assert.equal(session.CKs, null);
assert.equal(session.CKr, null);
assert.equal(session.MKSKIP.size, 0);
```

---

*Testing analysis: 2026-09-28*
