---
last_mapped_commit: 4915398a31e9820e979079eefbd6ab2b42fefe7f
last_mapped_at: 2026-09-28
---
# Codebase Structure

**Analysis Date:** 2026-09-28

## Directory Layout

```
privatelink/
├── .planning/                  # GSD planning and codebase memory artifacts
│   └── codebase/               # Architectural and codebase analysis maps
├── public/                     # Static assets served without bundling
│   └── vite.svg                # Application favicon
├── src/                        # Core application source code
│   ├── assets/                 # Component static assets (icons, images)
│   │   └── react.svg           # React logo asset
│   ├── App.jsx                 # Top-level container component
│   ├── IronManUI.jsx           # HUD presentation component and theme styles
│   ├── SecureChat.jsx          # Primary chat state machine and WebRTC controller
│   ├── fileTransfer.js         # Chunking, flow control, and streaming file encryption
│   ├── headers.test.js         # Security headers and CSP unit tests
│   ├── identity.js             # ECDSA identity generation and IndexedDB storage
│   ├── index.css               # Global Tailwind CSS and HUD visual effects
│   ├── main.jsx                # Application root entry point
│   ├── peerConfig.js           # STUN/TURN WebRTC configuration
│   ├── ratchet.js              # Double Ratchet cryptography protocol implementation
│   ├── ratchet.test.js         # Double Ratchet cryptographic test suite
│   ├── trustStore.js           # Fingerprint validation and trust store management
│   └── trustStore.test.js      # Trust store bounds and fingerprint regex tests
├── .env.example                # Example environment variable configuration
├── eslint.config.js            # Flat ESLint configuration
├── index.html                  # HTML entry template with strict Content Security Policy
├── package.json                # Project metadata, dependencies, and test scripts
├── package-lock.json           # Deterministic package dependency tree
├── postcss.config.js           # PostCSS plugin pipeline configuration
├── README.md                   # Project overview, security principles, and setup guide
├── tailwind.config.js          # Tailwind CSS styling and theme configuration
├── vercel.json                 # Vercel deployment routing and SPA fallback
└── vite.config.js              # Vite build tool and development server configuration
```

## Directory Purposes

**`src/`:**

- Purpose: Contains all client-side JavaScript, React components, cryptographic protocol logic, and test suites
- Contains: React components (`.jsx`), utility modules (`.js`), styling (`.css`), tests (`.test.js`)
- Key files: `src/SecureChat.jsx`, `src/ratchet.js`, `src/IronManUI.jsx`, `src/fileTransfer.js`

**`public/`:**

- Purpose: Static assets directly copied to distribution root upon build
- Contains: Favicon and icons
- Key files: `public/vite.svg`

**`.planning/`:**

- Purpose: GSD workflow memory, project requirements, roadmap, and codebase analysis documentation
- Contains: Markdown reference documents
- Key files: `.planning/codebase/*.md`

## Key File Locations

**Entry Points:**

- `index.html`: Web document template, defines CSP meta tag, loads `/src/main.jsx`
- `src/main.jsx`: Mounts the React application to DOM container `#root`
- `src/App.jsx`: Top-level application component rendering `SecureChat`

**Configuration:**

- `vite.config.js`: Bundling configuration and React plugin hooks
- `tailwind.config.js`: CSS utilities and styling tokens
- `postcss.config.js`: PostCSS processors
- `eslint.config.js`: Linter rules and environment globals
- `vercel.json`: Production hosting routing and rewrite configuration
- `.env.example`: Template for optional TURN credentials

**Core Logic:**

- `src/ratchet.js`: Double Ratchet protocol (ECDH P-256, HKDF-SHA256, HMAC-SHA256, AES-GCM-256)
- `src/identity.js`: Long-term cryptographic identity generation and IndexedDB persistence
- `src/fileTransfer.js`: File chunking, buffer watermarks, and authenticated streaming
- `src/trustStore.js`: Peer identity fingerprint storage in localStorage
- `src/peerConfig.js`: WebRTC ICE configuration and TURN relay fallback
- `src/SecureChat.jsx`: Primary state machine orchestrating connections, handshakes, and messages

**UI & Styling:**

- `src/IronManUI.jsx`: Cyberpunk / Stark HUD themed UI components
- `src/index.css`: Global styles, scanline effects, custom glow filters, and background noise

**Testing:**

- `src/ratchet.test.js`: Comprehensive cryptographic ratchet protocol validation
- `src/trustStore.test.js`: Trust store bounds and fingerprint formatting tests
- `src/headers.test.js`: Content Security Policy and production header verification

## Naming Conventions

**Files:**

- React components: PascalCase (e.g. `src/SecureChat.jsx`, `src/IronManUI.jsx`)
- JavaScript modules / utilities: camelCase (e.g. `src/fileTransfer.js`, `src/peerConfig.js`)
- Test suites: Co-located with `.test.js` suffix (e.g. `src/ratchet.test.js`, `src/headers.test.js`)
- Configuration files: standard lowercase dot-notation (e.g. `vite.config.js`, `tailwind.config.js`)

**Directories:**

- Top-level directories: lowercase (e.g. `src/`, `public/`, `.planning/`)

## Where to Add New Code

**New Feature (e.g., Voice / Video Calling):**

- Primary code: Create module in `src/mediaCall.js` or `src/webrtcMedia.js`
- State orchestration: Wire into `src/SecureChat.jsx`
- UI controls: Add call control components in `src/IronManUI.jsx`
- Tests: Add unit tests in `src/mediaCall.test.js`

**New Protocol Packet Type:**

- Definition: Define packet envelope kind in `src/SecureChat.jsx:310` (inside `handleInboundEnvelope`)
- Serialization: Send using `sendSecureEnvelope({ kind: "your_kind", ... })`
- Tests: Extend `src/ratchet.test.js` or add dedicated protocol test

**New Cryptographic Primitives:**

- Implementation: Add utility functions in `src/ratchet.js` using native `crypto.subtle`
- Tests: Add verification cases in `src/ratchet.test.js`

**Shared Utilities:**

- Helper functions: Add to existing domain module or create `src/utils.js`

## Special Directories

**`dist/` (build output):**

- Purpose: Production web assets created by `npm run build`
- Generated: Yes
- Committed: No (ignored by `.gitignore`)

**`.planning/`:**

- Purpose: GSD workflow planning, requirements, and codebase documentation
- Generated: Semi-automated by GSD workflows
- Committed: Yes (tracked in git)

---

*Structure analysis: 2026-09-28*
