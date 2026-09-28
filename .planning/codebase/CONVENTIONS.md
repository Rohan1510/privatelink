---
last_mapped_commit: 4915398a31e9820e979079eefbd6ab2b42fefe7f
last_mapped_at: 2026-09-28
---
# Coding Conventions

**Analysis Date:** 2026-09-28

## Naming Patterns

**Files:**

- React components use PascalCase with `.jsx` extension: `src/SecureChat.jsx`, `src/IronManUI.jsx`, `src/App.jsx`
- Cryptographic and utility modules use camelCase with `.js` extension: `src/ratchet.js`, `src/fileTransfer.js`, `src/trustStore.js`
- Test files use co-located `.test.js` pattern: `src/ratchet.test.js`, `src/trustStore.test.js`, `src/headers.test.js`

**Functions:**

- camelCase for functions and methods: `computeDHSecret()`, `encryptWithMK()`, `cleanupAndReset()`, `sendSecureEnvelope()`, `waitForWritableBuffer()`
- PascalCase for React component functions: `SecureChat()`, `IronManUI()`, `ConnectScreen()`, `HexLogo()`
- Prefix boolean check functions with `is` or `has`: `isValidFingerprint()`, `isValidBase64String()`

**Variables:**

- camelCase for local variables and state: `peerId`, `ratchetEpoch`, `fileTransfers`, `sharedSecretBits`
- UPPER_SNAKE_CASE for module-level constants and limits: `MAX_PACKET_SIZE_BYTES`, `HANDSHAKE_MAX_AGE_MS`, `FILE_CHUNK_SIZE`, `FINGERPRINT_REGEX`
- Suffix refs with `Ref`: `connRef`, `sessionRef`, `trustedRef`, `queuedPacketsRef`, `fileConnectionsRef`

**Types & Classes:**

- PascalCase for ES classes: `DoubleRatchetSession` (`src/ratchet.js:144`)
- Standard JavaScript / Web Crypto types used: `CryptoKey`, `CryptoKeyPair`, `Uint8Array`, `ArrayBuffer`

## Code Style

**Formatting:**

- 2-space indentation
- Semicolons used consistently
- Double quotes used for strings, JSX attributes, and imports
- Trailing commas in multi-line object and array literals

**Linting:**

- ESLint flat configuration (`eslint.config.js`)
- Extends `@eslint/js` recommended configuration
- Plugins: `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- Globals: `globals.browser`

## Import Organization

**Order:**

1. React core and hook imports (`import React, { useCallback, useEffect, useRef, useState } from "react";`)
2. External third-party libraries (`import { Peer } from "peerjs";`, `import { Send, Shield, ... } from "lucide-react";`)
3. Internal domain modules and utilities (`import { loadOrCreateIdentity } from "./identity";`)
4. Internal UI components (`import IronManUI from "./IronManUI";`)
5. Global style files (`import "./index.css";`)

**Path Aliases:**

- Relative path imports only (`./`, `../`), no custom path aliases configured in `vite.config.js`

## Error Handling

**Patterns:**

- **Defensive Packet Validation:** Inbound packets are checked for structural validity, type conformance, maximum byte limits, and valid base64 encoding before processing (`src/SecureChat.jsx:390-400`).
- **Fail-Closed Session Teardown:** Protocol discrepancies, signature verification failures, or excessive decryption failures invoke `cleanupAndReset()`, closing connections and wiping sensitive memory (`src/SecureChat.jsx:128-168`).
- **Rollback-Safe Decryption:** Ratchet decryption operates on a cloned instance (`decryptInPlace`); only when AES-GCM verification succeeds does `replaceWith()` overwrite the active ratchet state (`src/ratchet.js:235-240`).
- **Storage Fallbacks:** If IndexedDB is blocked or throws an error, `loadOrCreateIdentity()` falls back gracefully to in-memory key generation (`src/identity.js:71-84`).

## Logging

**Framework:**

- Native browser `console` methods

**Patterns:**

- Prefix logs with module name: `console.warn("[SecureChat] connection reset:", reason);`, `console.error("[TrustStore] Failed to save trusted store:", err);`
- Use `console.error()` for security violations and unrecoverable network failures
- Use `console.warn()` for non-fatal fallbacks (e.g. STUN fallback when TURN is unconfigured)
- Never log cryptographic keys, plaintexts, or raw secret buffers

## Comments

**When to Comment:**

- Section banner headers to segment responsibilities:
  `/* === DOUBLE RATCHET PROTOCOL ENGINE (SIGNAL PROTOCOL SPECIFICATION) ====== */`
  `/* === CLEANUP & RESET ===== */`
- Invariant explanations explaining why specific cryptographic precautions are necessary (e.g. header AAD authentication in `src/ratchet.js:11-13`)

**JSDoc:**

- Used on exported cryptographic functions to document inputs and return types (`src/ratchet.js:25-27`, `src/trustStore.js:11-13`)

## Function Design

**Size:**

- Small, single-purpose helper functions for cryptographic conversions (`b64`, `unb64`, `headerAAD`, `fileAAD`, `makeTransferId`)
- Focused async step handlers for file transfers and handshake exchanges

**Parameters:**

- Explicit positional arguments for cryptographic functions (`mkBytes, ivB64, ctB64, additionalData`)
- Object payloads with explicit schema properties for network messages (`{ type, header, iv, ct }`)

**Return Values:**

- Cryptographic functions return typed objects or `Uint8Array` byte arrays
- Boolean validation helpers return pure booleans (`isValidFingerprint`, `isValidBase64String`)

## Module Design

**Exports:**

- Named exports for cryptographic primitives, utility functions, and constants (`export async function generateDHKeyPair()`, `export const MAX_FILE_SIZE_BYTES`)
- Default exports for React screen/container components (`export default function SecureChat()`)

**Barrel Files:**

- Not used. Modules import directly from specific target files (`./ratchet`, `./fileTransfer`, `./trustStore`).

---

*Convention analysis: 2026-09-28*
