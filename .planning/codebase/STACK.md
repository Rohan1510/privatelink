---
last_mapped_commit: 4915398a31e9820e979079eefbd6ab2b42fefe7f
last_mapped_at: 2026-09-28
---
# Technology Stack

**Analysis Date:** 2026-09-28

## Languages

**Primary:**

- JavaScript (ES2022+ / ES Modules) - All application logic, protocol engines, UI components, tests (`src/*.js`, `src/*.jsx`)

**Secondary:**

- HTML5 - Base markup and Content Security Policy (`index.html`)
- CSS3 / PostCSS - Cyberpunk theme styles, Tailwind directives, custom HUD glow filters (`src/index.css`)

## Runtime

**Environment:**

- Browser (Modern evergreen browsers with WebRTC, Web Crypto API, and File System Access API support: Chrome, Edge, Brave, Firefox, Safari)
- Node.js v20+ / v24+ - Test execution runner (`node --test`) and build tooling

**Package Manager:**

- npm 10.x - Dependency management
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**

- React 19.2.0 - Declarative UI component tree (`src/App.jsx`, `src/SecureChat.jsx`, `src/IronManUI.jsx`)
- React DOM 19.2.0 - DOM renderer mounted to `#root` in `src/main.jsx`

**Testing:**

- Node.js Test Runner (`node:test`) - Zero-dependency native unit and integration testing (`src/*.test.js`)
- Node.js Strict Assertions (`node:assert/strict`) - In-process invariant validation

**Build/Dev:**

- Vite 7.2.4 - ESM-native development server and production bundler (`vite.config.js`)
- @vitejs/plugin-react 5.1.1 - Fast Refresh and JSX transformation
- Tailwind CSS 3.4.17 - Utility-first CSS framework (`tailwind.config.js`)
- PostCSS 8.5.6 & Autoprefixer 10.4.23 - CSS transformation and vendor prefixing (`postcss.config.js`)
- ESLint 9.39.1 - Static code analysis and linting (`eslint.config.js`)

## Key Dependencies

**Critical:**

- `peerjs` (^1.5.5) - WebRTC abstraction handling STUN/TURN ICE negotiation, signaling, and peer-to-peer DataChannel lifecycle (`src/peerConfig.js`, `src/SecureChat.jsx`)
- `lucide-react` (^0.562.0) - SVG iconography for Iron Man / Stark HUD UI theme (`src/IronManUI.jsx`)

**Infrastructure:**

- Web Crypto API (`window.crypto.subtle`) - Native browser cryptosystem for ECDH P-256 key exchange, ECDSA P-256 digital signatures, HKDF-SHA256, HMAC-SHA256, and AES-GCM-256 AEAD encryption (`src/ratchet.js`, `src/identity.js`, `src/fileTransfer.js`)
- IndexedDB (`window.indexedDB`) - Native browser storage for persistent ECDSA identity keypair (`src/identity.js`)

## Configuration

**Environment:**

- `.env.example` - Template for production WebRTC relay TURN credentials
- `VITE_TURN_URL` - Optional TURN relay URL (`turns:...`) to prevent STUN IP leakage and bypass restrictive NATs
- `VITE_TURN_USERNAME` - Ephemeral TURN username
- `VITE_TURN_CREDENTIAL` - Ephemeral TURN password

**Build:**

- `vite.config.js` - React plugin integration
- `tailwind.config.js` - Content path discovery and theme extensions
- `postcss.config.js` - Tailwind and Autoprefixer plugin registration
- `eslint.config.js` - Modern flat config for React and JavaScript linting
- `vercel.json` - SPA route rewrites (`/(.*)` -> `/index.html`)

## Platform Requirements

**Development:**

- Node.js 20.x or higher
- Any POSIX-compliant OS (Linux, macOS) or Windows

**Production:**

- Static web hosting (Vercel, Cloudflare Pages, Netlify, or Nginx)
- WebRTC STUN/TURN server infrastructure for NAT traversal
- HTTPS required for Web Crypto API and secure WebRTC context

---

*Stack analysis: 2026-09-28*
