---
last_mapped_commit: 4915398a31e9820e979079eefbd6ab2b42fefe7f
last_mapped_at: 2026-09-28
---
# Codebase Concerns

**Analysis Date:** 2026-09-28

## Tech Debt

**Monolithic Session Controller:**

- Issue: `src/SecureChat.jsx` (744 lines) combines WebRTC signaling, identity management, handshake validation, Double Ratchet packet processing, file transfer coordination, and React component state.
- Files: `src/SecureChat.jsx`
- Impact: Difficult to unit-test protocol workflows in isolation from React hooks; potential for race conditions or stale closure bugs across multiple `useRef` and `useState` pairs.
- Fix approach: Decouple into an event-driven session manager class or custom hooks (`usePeerSession`, `useFileTransfer`, `useRatchetChat`).

**Monolithic HUD Component:**

- Issue: `src/IronManUI.jsx` (608 lines) bundles SVG artwork, audio synthesis helpers, connection screen, chat interface, message rendering, and styling into one file with extensive inline style objects.
- Files: `src/IronManUI.jsx`
- Impact: Reduced maintainability; styling changes risk breaking UI layout.
- Fix approach: Split into modular presentation subcomponents (`ConnectPanel`, `ChatPanel`, `FileDrawer`, `HexLogo`).

## Known Bugs

**File System Access API Browser Incompatibility:**

- Symptoms: File reception fails with an alert on non-Chromium browsers (Firefox, Safari, iOS Safari, Android Firefox).
- Files: `src/SecureChat.jsx:666`
- Trigger: Clicking "Accept" on an incoming file transfer when `window.showSaveFilePicker` is undefined.
- Workaround: Alert instructs user to use a Chromium-based browser; no Blob/URL fallback exists for smaller transfers.

**Session Severance on Page Navigation / Refresh:**

- Symptoms: Active chat and file transfers immediately drop if user refreshes or navigates back; cannot reconnect without generating a new session.
- Files: `src/SecureChat.jsx:128-168`, `src/ratchet.js:361`
- Trigger: Browser reload or accidental swipe-to-back.
- Workaround: Inform user to remain on the page during active sessions.

## Security Considerations

**STUN IP Leakage without Dedicated TURN:**

- Risk: When TURN credentials are omitted (`.env` unpopulated), `iceTransportPolicy` is set to `"all"` using public Google STUN servers (`src/peerConfig.js:18-31`). This exposes the user's public IP address to the connected peer via WebRTC ICE candidate negotiation.
- Files: `src/peerConfig.js:11-33`
- Current mitigation: Console warning in production builds when TURN is not configured; support for strict `relay` transport policy when TURN is supplied.
- Recommendations: Emphasize relay TURN requirement for high-threat-model deployments and provide self-hosting Coturn guidance.

**Public PeerJS Signaling Metadata:**

- Risk: PeerJS cloud server (`0.peerjs.com`) observes peer IDs, IP addresses, connection timestamps, and signaling frequency.
- Files: `src/SecureChat.jsx:550`
- Current mitigation: Handshake packets and chat messages are encrypted and signed end-to-end; signaling server cannot inspect session keys or message content.
- Recommendations: Support configuring a self-hosted private PeerServer instance via environment variables.

## Performance Bottlenecks

**Chunk-Level Web Crypto Overhead for File Transfers:**

- Problem: Slicing files into 16 KB chunks (`FILE_CHUNK_SIZE = 16 * 1024`) with independent AES-GCM encryption per chunk creates ~16,000 Web Crypto API calls and message events for a 250 MB file.
- Files: `src/fileTransfer.js:22-27`, `src/SecureChat.jsx:240-247`
- Cause: JavaScript main thread promise microtask queue overhead for large numbers of small chunks.
- Improvement path: Increase chunk size to 64 KB or 128 KB for large files, or move file chunk encryption/decryption into a dedicated Web Worker.

## Fragile Areas

**Clock Skew in Handshake Nonce Eviction:**

- Files: `src/SecureChat.jsx:25`, `src/SecureChat.jsx:422`
- Why fragile: Handshakes reject packets if `Math.abs(Date.now() - pkt.timestamp) > 60_000` (60 seconds). If either peer's device clock is skewed by more than 1 minute, mutual handshake verification will fail indefinitely.
- Safe modification: Increase clock tolerance window (e.g. 120s-300s) or incorporate monotonic timestamp negotiation.
- Test coverage: Timestamp freshness is verified in manual testing, but extreme clock skew is not unit-tested.

**Double Ratchet Out-of-Order Key Skipping Limit:**

- Files: `src/ratchet.js:318`
- Why fragile: `this.Nr + 2000 < untilN` throws "Skipped message limit exceeded". While this prevents DoS attacks from maliciously high sequence numbers, if packet loss or extreme reordering exceeds 2000 steps, the session enters an irrecoverable state.
- Safe modification: Carefully tune bound based on network profiling.

## Scaling Limits

**1-to-1 P2P Topology:**

- Current capacity: Exactly 2 participants per session.
- Limit: Architectural limitation of the Double Ratchet protocol state machine and PeerJS direct channel mapping.
- Scaling path: Group messaging requires MLS (Messaging Layer Security) or Sender Keys protocol implementation.

**Maximum File Transfer Size:**

- Current capacity: 250 MB (`MAX_FILE_SIZE_BYTES = 250 * 1024 * 1024`).
- Limit: WebRTC DataChannel memory pressure and transfer duration limits.
- Scaling path: Resumable chunk transfers and chunk hash validation trees.

## Dependencies at Risk

**`peerjs` (^1.5.5):**

- Risk: Default configuration depends on public community signaling infrastructure (`0.peerjs.com`) which may experience latency or intermittent rate limiting.
- Impact: Peers cannot discover or signal each other if cloud signaling is unreachable.
- Migration plan: Allow user or deployment to configure custom self-hosted PeerServer or WebSockets signaling relay.

## Missing Critical Features

**Voice / Video Calling:**

- Problem: Only text messages and file transfers are implemented; no media track streaming.
- Blocks: Real-time encrypted voice and video communication.

**Offline Messaging:**

- Problem: Both peers must be active and connected simultaneously; no store-and-forward mailbox exists.
- Blocks: Asynchronous messaging.

**In-Memory Fallback for File Reception:**

- Problem: Non-Chromium browsers cannot receive files because `showSaveFilePicker` is missing.
- Blocks: File transfers between Safari / Firefox and other peers.

## Test Coverage Gaps

**File Transfer Protocol Unit Tests:**

- What's not tested: `src/fileTransfer.js` has no corresponding `src/fileTransfer.test.js` verifying chunk encryption, AAD validation, or backpressure logic.
- Files: `src/fileTransfer.js`
- Risk: File transfer corruption or encryption regression could pass CI unnoticed.
- Priority: High

**IndexedDB Failure and Recovery:**

- What's not tested: Fallback behavior in `src/identity.js` when IndexedDB rejects read/write.
- Files: `src/identity.js`
- Risk: Key generation failures in private browsing mode.
- Priority: Medium

**UI Component Testing:**

- What's not tested: `src/SecureChat.jsx` and `src/IronManUI.jsx` have no React testing library or DOM unit tests.
- Files: `src/SecureChat.jsx`, `src/IronManUI.jsx`
- Risk: UI regressions on state changes.
- Priority: Low

---

*Concerns audit: 2026-09-28*
