---
last_mapped_commit: 4915398a31e9820e979079eefbd6ab2b42fefe7f
last_mapped_at: 2026-09-28
---
# External Integrations

**Analysis Date:** 2026-09-28

## APIs & External Services

**WebRTC Signaling Broker:**

- PeerJS Cloud (`0.peerjs.com` / `peerjs.com`) - Facilitates session discovery and initial SDP offer/answer/ICE exchange between peers
  - SDK/Client: `peerjs` (^1.5.5) in `src/SecureChat.jsx`
  - Auth: Public default API key assigned by PeerJS cloud, or self-hosted PeerServer configuration

**NAT Traversal & ICE:**

- Google Public STUN (`stun:stun.l.google.com:19302`, `stun:stun1.l.google.com:19302`, `stun:stun2.l.google.com:19302`) - Resolves public IP address and port mapping for direct peer-to-peer WebRTC connections
  - Client: Native browser `RTCPeerConnection` configured in `src/peerConfig.js`
- Custom TURN Relay (`turns:`) - Relays encrypted WebRTC packets when symmetric NATs or firewalls block direct UDP connectivity, or to mask IP addresses
  - Configuration: `VITE_TURN_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` in `src/peerConfig.js`

**Content Delivery Networks (CDNs):**

- Google Fonts (`https://fonts.googleapis.com`, `https://fonts.gstatic.com`) - Typography assets explicitly whitelisted in CSP (`index.html`)

## Data Storage

**IndexedDB:**

- Database: `privatelink-id` (version 1)
  - Store: `keys`
  - Record: `"identity"` holding non-extractable CryptoKeyPair `{ privateKey, publicKey, publicKeyRaw }`
  - Implementation: `src/identity.js`
  - Fallback: Graceful fallback to ephemeral in-memory CryptoKeyPair when IndexedDB is blocked (e.g. private browsing or sandbox iframe)

**Local Storage:**

- Key: `privatelink-trust`
  - Purpose: Persists map of known peer IDs to their verified SHA-256 identity fingerprints
  - Bounds: Strictly bounded to the 100 most recent entries (`MAX_TRUSTED_ENTRIES = 100`)
  - Validation: Validated against strict regex `/^[A-F0-9]{4}(?: [A-F0-9]{4}){7}$/`
  - Implementation: `src/trustStore.js`

**File System Access API:**

- Target: Local user disk storage via `window.showSaveFilePicker()` and `FileSystemWritableFileStream`
  - Purpose: Streaming chunks of up to 250 MB directly to disk to prevent browser memory exhaustion
  - Implementation: `src/fileTransfer.js`, `src/SecureChat.jsx`
  - Platform note: Requires Chromium-based browser supporting the File System Access API

**Ephemeral Volatile Memory:**

- Location: JavaScript heap within `src/ratchet.js` and `src/SecureChat.jsx`
  - Scope: Symmetric ratchet keys (`RK`, `CKs`, `CKr`), message keys, skipped key buffer (`MKSKIP`), and ephemeral ECDH keys
  - Lifecycle: Destroyed and zeroed out via explicit `.destroy()` and `.fill(0)` upon disconnect or error

## Authentication & Identity

**Decentralized Cryptographic Identity:**

- Model: Trust On First Use (TOFU) or explicit out-of-band visual fingerprint verification
- Key Algorithm: ECDSA with curve P-256 (`src/identity.js`)
- Signature Scheme: ECDSA-SHA256 over canonical JSON handshake packets (`src/SecureChat.jsx`)
- Fingerprint Representation: 32-character hexadecimal SHA-256 hash displayed in 8 groups of 4 characters (`XXXX XXXX ...`)

## Monitoring & Observability

**Error Tracking:**

- None external (Zero third-party tracking or telemetry)

**Logs:**

- Console diagnostics: Structured warning and error logs via `console.warn` and `console.error` in `src/SecureChat.jsx`, `src/peerConfig.js`, `src/trustStore.js`

## CI/CD & Deployment

**Hosting:**

- Vercel - Static SPA deployment configured via `vercel.json` with universal wildcard rewrites to `/index.html`

**Security Headers & CSP:**

- Inline meta Content-Security-Policy in `index.html`:
  - `default-src 'self'`
  - `connect-src 'self' https://*.peerjs.com wss://*.peerjs.com https://peerjs.com wss://peerjs.com wss: https: turn: turns: stun:`
  - `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`, `form-action 'none'`

## Environment Configuration

**Required env vars:**

- None strictly required for local development (defaults to PeerJS Cloud and Google STUN)

**Optional production env vars:**

- `VITE_TURN_URL` - URL of TURN server (e.g., `turns:turn.example.com:5349?transport=tcp`)
- `VITE_TURN_USERNAME` - Ephemeral TURN credential username
- `VITE_TURN_CREDENTIAL` - Ephemeral TURN credential password

**Secrets location:**

- Stored exclusively in local deployment environment (.env / host platform settings), never committed

## Webhooks & Callbacks

**Incoming:**

- PeerJS WebRTC DataChannel Events: `connection`, `open`, `data`, `close`, `error` (`src/SecureChat.jsx`)

**Outgoing:**

- WebRTC DataChannel transmissions: Handshake packets, ratchet message packets (`ratchet_msg`), file transfer control packets (`file_auth`, `file_start`, `file_chunk`, `file_end`), and `disconnect` signals

---

*Integration audit: 2026-09-28*
