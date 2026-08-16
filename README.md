# PrivateConnect (SecureChat)

PrivateConnect is a **privacy-first, peer-to-peer secure messaging prototype** focused on **end-to-end encryption (E2EE)**, minimal metadata leakage, and zero message persistence. It is built as an **experimental learning project**, not a production messenger.

This project intentionally avoids centralized message storage and instead emphasizes **cryptographic correctness, protocol design, and threat modeling**.

---

## 🚀 What This Project Is (and Is NOT)

**It IS:**

* A hands-on implementation of secure messaging concepts
* A cryptography + networking learning project
* A strong resume / research prototype
* A foundation for a Signal-like v2 architecture

**It is NOT:**

* A production-ready messaging app
* A replacement for Signal / WhatsApp
* A fully audited cryptographic system

If you treat it as production, you will create a false sense of security. Don’t.

---

## 🔐 Core Security Goals

* End-to-End Encryption (E2EE)
* No plaintext messages on server
* No long-term message storage
* Peer identity verification
* Forward secrecy (planned in v2)

---

## 🧠 Architecture Overview

**Current Version (v1):**

* Peer-to-Peer communication using WebRTC (PeerJS)
* Key exchange using **ECDH (P-256)**
* Message encryption using **AES-GCM**
* Browser-native Web Crypto API
* No backend message database

**High-level flow:**

1. Peer identity keys generated locally
2. Peers connect via signaling server (PeerJS)
3. ECDH key exchange
4. Shared secret → AES-GCM session key
5. Encrypted messages exchanged

---

## 🧪 Threat Model (Current Reality)

### What is protected

* Message content from network attackers
* Message content from signaling server

### What is NOT fully protected yet

* Man-in-the-Middle (MITM) during first key exchange
* No double ratchet (no forward secrecy yet)
* No deniability guarantees
* No replay protection beyond AES-GCM

If you think this is "fully secure", you are lying to yourself.

---

## 📁 Project Structure

```
privatelink/
├── public/
│   └── index.html
├── src/
│   ├── crypto/
│   │   ├── identity.js
│   │   ├── ecdh.js
│   │   └── aes.js
│   ├── network/
│   │   └── peer.js
│   ├── ui/
│   │   └── ChatUI.jsx
│   ├── App.jsx
│   └── main.jsx
├── README.md
└── package.json
```

---

## 🛠️ Tech Stack

* **Frontend:** React + Vite
* **Crypto:** Web Crypto API
* **Networking:** PeerJS (WebRTC)
* **Encryption:** ECDH + AES-GCM

No unnecessary dependencies. No backend bloat.

---

## ▶️ How to Run

```bash
npm install
npm run dev
```

Open in two browsers or devices, connect via Peer ID, exchange messages.

For a production build, configure a TURN relay before building:

```bash
copy .env.example .env.production
```

Set the three `VITE_TURN_*` values to short-lived credentials from a TURN
credential service. Production builds intentionally fail without them, so a
peer cannot learn another peer's direct IP address. Do not place permanent
TURN credentials in a client build.

---

## 📌 Known Limitations (Be Honest)

* No offline message support
* No message delivery guarantees
* No identity persistence across sessions
* No multi-device sync
* No cryptographic audit

These are **hard problems**, not missing features.

---

## 🧭 Roadmap

### v2 (Serious Security)

* Double Ratchet Algorithm
* Pre-keys & session setup
* Identity verification (QR / fingerprint)
* Replay protection
* Better disconnect handling

### v3 (Research / Paper)

* Formal threat model
* Protocol documentation
* Security analysis
* Performance evaluation

---

## 📄 Resume & Academic Value

This project demonstrates:

* Applied cryptography
* Secure protocol design thinking
* Real-world threat modeling
* Systems + frontend integration

Much stronger than generic CRUD or chat apps.

---

## ⚠️ Final Reality Check

If your goal is **learning, research, and credibility** → this project is solid.
If your goal is **shipping a consumer app** → you are nowhere near ready.

That gap is exactly where growth happens.

---

## 📜 License

MIT (for learning and experimentation only)

---

**Author:** Rohan Krishna Surapaneni
