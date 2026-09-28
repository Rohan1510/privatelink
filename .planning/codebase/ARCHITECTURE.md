---
last_mapped_commit: 4915398a31e9820e979079eefbd6ab2b42fefe7f
last_mapped_at: 2026-09-28
---
<!-- refreshed: 2026-09-28 -->

# Architecture

**Analysis Date:** 2026-09-28

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Presentation Layer                              │
├───────────────────────────────────┬─────────────────────────────────────────┤
│            IronManUI              │                 App                     │
│        `src/IronManUI.jsx`        │            `src/App.jsx`                │
└─────────────────┬─────────────────┴────────────────────┬────────────────────┘
                  │                                      │
                  ▼                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Application & Session Layer                          │
│                           `src/SecureChat.jsx`                              │
│  (State machine, handshake dispatch, packet routing, file orchestration)     │
└────────┬──────────────────────────┬───────────────────────────┬─────────────┘
         │                          │                           │
         ▼                          ▼                           ▼
┌──────────────────┐       ┌──────────────────┐        ┌──────────────────────┐
│  Ratchet Engine  │       │  Identity Engine │        │ File Streaming Engine│
│ `src/ratchet.js` │       │ `src/identity.js`│        │`src/fileTransfer.js` │
└────────┬─────────┘       └────────┬─────────┘        └──────────┬───────────┘
         │                          │                             │
         ▼                          ▼                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 Transport, Security & Persistence Layer                     │
│  `src/peerConfig.js` (WebRTC / PeerJS) | `src/trustStore.js` (localStorage) │
│          IndexedDB (`privatelink-id`)  | File System Access API             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `App` | Top-level application shell hosting the primary chat session | `src/App.jsx` |
| `IronManUI` | Cyberpunk / Stark HUD presentation component, HUD gauges, audio/visual cues, connection panel, message feed, and file transfer drawer | `src/IronManUI.jsx` |
| `SecureChat` | Central state machine, WebRTC event wiring, mutual authentication handshake, envelope serialization, and file transfer progress tracking | `src/SecureChat.jsx` |
| `DoubleRatchetSession` | Implementation of Signal Double Ratchet protocol (DH ratchet, symmetric KDF chains, out-of-order `MKSKIP` buffer, memory wiping) | `src/ratchet.js` |
| `Identity` | Long-term ECDSA P-256 identity keypair management, IndexedDB storage with in-memory fallback | `src/identity.js` |
| `TrustStore` | Persistence and schema validation for known peer identity fingerprints in localStorage | `src/trustStore.js` |
| `FileTransfer` | Chunked file encryption (AES-GCM), flow control with WebRTC DataChannel backpressure (`bufferedAmount`), and streaming disk write | `src/fileTransfer.js` |
| `PeerConfig` | WebRTC configuration generator supporting fallback from TURN relay to public Google STUN servers | `src/peerConfig.js` |

## Pattern Overview

**Overall:** Zero-Knowledge Peer-to-Peer End-to-End Encrypted (E2EE) Client-Only Application

**Key Characteristics:**

- **Zero Server Knowledge:** No chat server or central database exists. Messages travel directly between peer browsers over encrypted WebRTC DataChannels.
- **Perfect Forward Secrecy (PFS) & Post-Compromise Security (PCS):** Built on the Signal Double Ratchet protocol using ephemeral ECDH (P-256) and HMAC-SHA256 KDF chains; compromising one key does not reveal past or future messages.
- **Mutual Cryptographic Authentication:** Handshakes are signed by long-term ECDSA P-256 identity keys, with anti-replay protection via timestamps and nonce tracking.

## Layers

**Presentation Layer:**

- Purpose: Render user interface, collect user input, and display cryptographic status indicators
- Location: `src/IronManUI.jsx`, `src/App.jsx`
- Contains: React JSX components, SVG HUD graphics, CSS custom properties
- Depends on: `lucide-react`
- Used by: Browser DOM (`src/main.jsx`)

**Session & Coordination Layer:**

- Purpose: Orchestrate connection states, message queuing, handshake lifecycle, and packet dispatch
- Location: `src/SecureChat.jsx`
- Contains: React state hooks (`useState`, `useRef`, `useCallback`), PeerJS event handlers
- Depends on: `src/ratchet.js`, `src/identity.js`, `src/trustStore.js`, `src/peerConfig.js`, `src/fileTransfer.js`
- Used by: `src/App.jsx`

**Cryptographic Protocol Engine:**

- Purpose: Execute key derivation, symmetric ratcheting, asymmetric ratcheting, and AEAD packet processing
- Location: `src/ratchet.js`
- Contains: `DoubleRatchetSession` class, Web Crypto API derivations (`hkdfRK`, `kdfCK`, `encryptWithMK`, `decryptWithMK`)
- Depends on: Native browser `crypto.subtle`
- Used by: `src/SecureChat.jsx`

**Data Streaming & Transport Layer:**

- Purpose: Send and receive encrypted file chunks with backpressure handling and disk streaming
- Location: `src/fileTransfer.js`, `src/peerConfig.js`
- Contains: AES-GCM chunk encryption, WebRTC DataChannel buffer listener (`bufferedamountlow`)
- Depends on: Native `RTCPeerConnection`, `RTCDataChannel`, File System Access API
- Used by: `src/SecureChat.jsx`

## Data Flow

### Primary Request Path (Chat Message Transmission)

1. User submits text in input field (`src/IronManUI.jsx:420`)
2. `send()` creates typed envelope `{ kind: "chat", text }` (`src/SecureChat.jsx:694`)
3. `sendSecureEnvelope()` delegates envelope to `sessionRef.current.ratchet.encrypt()` (`src/SecureChat.jsx:212`)
4. Double Ratchet steps the sending chain key `CKs`, derives single-use `messageKey`, increments message index `Ns`, and encrypts with AES-GCM 256 using header AAD (`src/ratchet.js:191-230`)
5. Encrypted packet `{ type: "ratchet_msg", header, iv, ct }` is sent across PeerJS `connRef.current.send()` (`src/SecureChat.jsx:217`)
6. Receiving peer's `conn.on("data")` receives packet, checks size limits, and routes to `processInboundRatchetPacket()` (`src/SecureChat.jsx:520`)
7. Ratchet clones state, steps receiving chain or completes DH ratchet step, decrypts with `decryptWithMK()`, validates AAD, and replaces working state (`src/ratchet.js:235-276`)
8. Decrypted JSON envelope `{ kind: "chat", text }` appends to React state `messages` (`src/SecureChat.jsx:311`)

### Secondary Flow Name (Chunked File Transfer)

1. Sender selects file via `selectFile()` (`src/SecureChat.jsx:638`)
2. Random transfer ID, 32-byte AES-GCM key, and auth token are generated; `file_offer` envelope sent over encrypted chat channel (`src/SecureChat.jsx:653`)
3. Receiver prompts user and invokes native file picker `window.showSaveFilePicker()` to open a direct-to-disk `FileSystemWritableFileStream` (`src/SecureChat.jsx:664-675`)
4. Receiver sends encrypted `file_accept` envelope back to sender (`src/SecureChat.jsx:677`)
5. Sender opens dedicated secondary binary PeerJS DataChannel labeled `file:<transferId>` (`src/SecureChat.jsx:227`)
6. Sender slices file into 16 KB chunks, monitors `bufferedAmount` threshold (512 KB high / 256 KB low water), encrypts each chunk with AAD `{ v: 1, transferId, index, totalChunks }`, and streams binary packets (`src/SecureChat.jsx:240-247`, `src/fileTransfer.js:34-55`)
7. Receiver decrypts chunks in sequential write queue, streams bytes into disk handle, and closes file upon `file_end` packet (`src/SecureChat.jsx:268-306`)

**State Management:**

- Cryptographic keys: Stored in module/ref memory (`DoubleRatchetSession` instance). Wiped upon session termination.
- Peer Trust State: Synchronized between component state (`trust`) and persistent `localStorage` (`privatelink-trust`).
- Connection Lifecycle: Explicit states: `"disconnected"` → `"handshaking"` → `"verification_required"` → `"secure"`.

## Key Abstractions

**`DoubleRatchetSession`:**

- Purpose: Stateful session managing the cryptographic ratchet
- Examples: `src/ratchet.js:144`
- Pattern: State / Session Pattern with rollback-safe candidate decryption (`clone()` / `replaceWith()`)

**Identity Record:**

- Purpose: Encapsulate ECDSA signing and verification keys with exported raw public representation
- Examples: `src/identity.js:57-61`
- Pattern: Value Object / Active Record in IndexedDB

**File Transfer Session:**

- Purpose: Manage chunking, token authentication, backpressure flow control, and stream assembly
- Examples: `src/fileTransfer.js:11-32`, `src/SecureChat.jsx:221-308`
- Pattern: Producer-Consumer Stream with Watermark Flow Control

## Entry Points

**Web Application Bootstrap:**

- Location: `src/main.jsx:6`
- Triggers: Browser loading `index.html`
- Responsibilities: Mount `<React.StrictMode><App /></React.StrictMode>` into DOM element `#root`

**PeerJS Signaling Initialization:**

- Location: `src/SecureChat.jsx:541`
- Triggers: React component mount of `SecureChat`
- Responsibilities: Load/create ECDSA identity, instantiate `Peer(PEER_CONFIG)`, register incoming connection hooks

## Architectural Constraints

- **Single-Threaded Event Loop:** All cryptography runs asynchronously on the main thread via native Web Crypto API (`crypto.subtle`) offloaded to browser internal threads.
- **Client-Side Only:** No backend API server or persistence database exists. All signaling relies on external WebRTC brokers.
- **Zero Global Mutable State:** State is strictly contained in React hooks (`useRef`, `useState`) or encapsulated class instances (`DoubleRatchetSession`).
- **Memory Zeroing:** Sensitive symmetric keys and message buffers call `.fill(0)` when discarded to minimize exposure in memory dumps.

## Anti-Patterns

### Modifying Ratchet State Before Cryptographic Verification

**What happens:** Advancing chain keys or stepping DH keys before AES-GCM ciphertext tag validation succeeds.
**Why it's wrong:** An attacker sending corrupted or forged packets can cause desynchronization (denial of service) between peers.
**Do this instead:** Decrypt on an isolated copy (`clone()`), verify ciphertext and header AAD, then commit via `replaceWith()` (`src/ratchet.js:235-240`).

### Storing Unbounded Trust Records

**What happens:** Appending peer fingerprints to localStorage without bounds or schema validation.
**Why it's wrong:** Storage exhaustion or prototype pollution attacks via malformed peer IDs.
**Do this instead:** Validate regex `/^[A-F0-9]{4}(?: [A-F0-9]{4}){7}$/` and cap entries at 100 via `saveTrustedStore()` (`src/trustStore.js:51-70`).

## Error Handling

**Strategy:** Fail-closed security architecture. Any cryptographic discrepancy, packet size violation, or invalid handshake immediately tears down the session.

**Patterns:**

- `cleanupAndReset()` resets all references, destroys ratchet cryptographic keys, closes data channels, and aborts pending disk writes (`src/SecureChat.jsx:128-168`).
- Decryption threshold counter: Disconnects if `failedDecryptionsRef.current > 10` (`src/SecureChat.jsx:364-367`).

## Cross-Cutting Concerns

**Logging:** Console diagnostics only, prefixed by module tag (`[SecureChat]`, `[PeerConfig]`, `[TrustStore]`).
**Validation:** Strict packet size limits (`MAX_PACKET_SIZE_BYTES = 64KB`), message length caps (`MAX_MESSAGE_LENGTH = 8192`), file size limits (`MAX_FILE_SIZE_BYTES = 250MB`), and base64 format validation.
**Authentication:** Mutual signed handshake verification with replay cache (`seenHandshakeNonces`) and 60-second freshness window (`HANDSHAKE_MAX_AGE_MS`).

---

*Architecture analysis: 2026-09-28*
