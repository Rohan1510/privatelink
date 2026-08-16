/* ========================================================================= */
/* === DOUBLE RATCHET PROTOCOL ENGINE (SIGNAL PROTOCOL SPECIFICATION) ====== */
/* ========================================================================= */

const enc = new TextEncoder();
const dec = new TextDecoder();

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// The header selects ratchet state, so it must be authenticated together with
// the ciphertext.  JSON.stringify is safe here because we construct the exact
// canonical object rather than serializing attacker-controlled objects.
function headerAAD(header) {
  if (
    !header || typeof header.dh !== "string" ||
    !Number.isSafeInteger(header.pn) || header.pn < 0 ||
    !Number.isSafeInteger(header.n) || header.n < 0
  ) {
    throw new Error("Invalid ratchet header");
  }
  return enc.encode(JSON.stringify({ v: 1, dh: header.dh, pn: header.pn, n: header.n }));
}

/**
 * Generate an ephemeral ECDH keypair (P-256)
 */
export async function generateDHKeyPair() {
  return crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveBits", "deriveKey"]
  );
}

/**
 * Compute raw 32-byte ECDH shared secret
 */
export async function computeDHSecret(privKey, pubKey) {
  const bits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: pubKey },
    privKey,
    256
  );
  return new Uint8Array(bits);
}

/**
 * HKDF-SHA256 Derivation
 * Derives 64 bytes: 32 bytes next Root Key (RK) + 32 bytes Chain Key (CK)
 */
export async function hkdfRK(rk, dhSecret) {
  const salt = rk && rk.length === 32 ? rk : new Uint8Array(32);
  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    dhSecret,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt,
      info: enc.encode("PrivateLink-DoubleRatchet-Root")
    },
    hkdfKey,
    512 // 64 bytes = 512 bits
  );

  const derivedBytes = new Uint8Array(derivedBits);
  return {
    newRK: derivedBytes.slice(0, 32),
    newCK: derivedBytes.slice(32, 64)
  };
}

/**
 * KDF-CK (Chain Key KDF via HMAC-SHA256)
 * Output: { messageKey: Uint8Array(32), nextChainKey: Uint8Array(32) }
 */
export async function kdfCK(chainKey) {
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    chainKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const mkBuf = await crypto.subtle.sign("HMAC", hmacKey, new Uint8Array([1]));
  const nextCkBuf = await crypto.subtle.sign("HMAC", hmacKey, new Uint8Array([2]));

  return {
    messageKey: new Uint8Array(mkBuf),
    nextChainKey: new Uint8Array(nextCkBuf)
  };
}

/**
 * Encrypt plaintext using raw 32-byte MessageKey with AES-GCM 256
 */
export async function encryptWithMK(mkBytes, plaintext, additionalData) {
  const aesKey = await crypto.subtle.importKey(
    "raw",
    mkBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData },
    aesKey,
    enc.encode(plaintext)
  );
  return { iv: b64(iv), ct: b64(ct) };
}

/**
 * Decrypt ciphertext using raw 32-byte MessageKey with AES-GCM 256
 */
export async function decryptWithMK(mkBytes, ivB64, ctB64, additionalData) {
  const aesKey = await crypto.subtle.importKey(
    "raw",
    mkBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  const ptBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(ivB64), additionalData },
    aesKey,
    unb64(ctB64)
  );
  return dec.decode(ptBuf);
}

/**
 * Double Ratchet Session Manager
 */
export class DoubleRatchetSession {
  constructor() {
    this.DHs = null;          // Local DH keypair (CryptoKeyPair)
    this.DHr = null;          // Remote DH public key (CryptoKey)
    this.DHrRaw = null;       // Base64 string of remote DH public key
    this.RK = null;           // 32-byte Uint8Array Root Key
    this.CKs = null;          // 32-byte Uint8Array Sending Chain Key
    this.CKr = null;          // 32-byte Uint8Array Receiving Chain Key
    this.Ns = 0;              // Message index in sending chain
    this.Nr = 0;              // Message index in receiving chain
    this.PN = 0;              // Count of messages sent in previous ratchet
    this.MKSKIP = new Map();  // Skipped keys buffer: `${dhB64}:${n}` -> Uint8Array MK
    this.ratchetCount = 0;    // Number of DH ratchet steps completed
    this.isInitiator = false;
  }

  /**
   * Initialize ratchet session after initial handshake ECDH
   */
  async init(initiator, sharedSecret, localDH, remoteDHPub, remoteDHPubRawB64) {
    this.isInitiator = initiator;
    this.DHs = localDH;
    this.DHr = remoteDHPub;
    this.DHrRaw = remoteDHPubRawB64;
    this.RK = new Uint8Array(sharedSecret);
    this.Ns = 0;
    this.Nr = 0;
    this.PN = 0;
    this.MKSKIP.clear();
    this.ratchetCount = 0;

    const dhSecret = await computeDHSecret(this.DHs.privateKey, this.DHr);
    const { newRK, newCK } = await hkdfRK(this.RK, dhSecret);
    this.RK = newRK;

    if (initiator) {
      this.CKs = newCK;
      this.CKr = null;
    } else {
      this.CKr = newCK;
      this.CKs = null;
    }
  }

  /**
   * Encrypt outbound message with ratcheted single-use key
   */
  async encrypt(plaintext) {
    if (!this.CKs) {
      // Receiver replying for the first time: trigger DH ratchet step to derive sending chain
      this.DHs = await generateDHKeyPair();
      const dhSecret = await computeDHSecret(this.DHs.privateKey, this.DHr);
      const { newRK, newCK } = await hkdfRK(this.RK, dhSecret);
      this.RK = newRK;
      this.CKs = newCK;
      this.PN = this.Ns;
      this.Ns = 0;
      this.ratchetCount++;
    }

    const { messageKey, nextChainKey } = await kdfCK(this.CKs);
    this.CKs = nextChainKey;

    const myDHPubRawB64 = b64(
      await crypto.subtle.exportKey("raw", this.DHs.publicKey)
    );

    const header = {
      dh: myDHPubRawB64,
      pn: this.PN,
      n: this.Ns
    };

    this.Ns++;

    const { iv, ct } = await encryptWithMK(messageKey, plaintext, headerAAD(header));

    // Wipe single-use messageKey from memory
    messageKey.fill(0);

    return {
      type: "ratchet_msg",
      header,
      iv,
      ct
    };
  }

  /**
   * Decrypt inbound message and advance receiving ratchet
   */
  async decrypt(packet) {
    const candidate = this.clone();
    const plaintext = await candidate.decryptInPlace(packet);
    this.replaceWith(candidate);
    return plaintext;
  }

  // Ratchet state must not advance until AES-GCM has authenticated both the
  // ciphertext and its header.  Work on a copy so forged packets are harmless.
  async decryptInPlace(packet) {
    const { header, iv, ct } = packet;
    const aad = headerAAD(header);
    if (typeof iv !== "string" || typeof ct !== "string") {
      throw new Error("Invalid ratchet packet");
    }

    const skipKey = `${header.dh}:${header.n}`;
    if (this.MKSKIP.has(skipKey)) {
      const mk = this.MKSKIP.get(skipKey);
      this.MKSKIP.delete(skipKey);
      const plaintext = await decryptWithMK(mk, iv, ct, aad);
      mk.fill(0);
      return plaintext;
    }

    const isNewDH = header.dh !== this.DHrRaw;

    if (isNewDH) {
      await this.skipMessageKeys(header.pn);
      await this.dhRatchet(header.dh);
    }

    await this.skipMessageKeys(header.n);

    const { messageKey, nextChainKey } = await kdfCK(this.CKr);
    this.CKr = nextChainKey;
    this.Nr++;

    const plaintext = await decryptWithMK(messageKey, iv, ct, aad);
    messageKey.fill(0);
    return plaintext;
  }

  clone() {
    const copy = new DoubleRatchetSession();
    copy.DHs = this.DHs;
    copy.DHr = this.DHr;
    copy.DHrRaw = this.DHrRaw;
    copy.RK = this.RK?.slice() ?? null;
    copy.CKs = this.CKs?.slice() ?? null;
    copy.CKr = this.CKr?.slice() ?? null;
    copy.Ns = this.Ns;
    copy.Nr = this.Nr;
    copy.PN = this.PN;
    copy.MKSKIP = new Map([...this.MKSKIP].map(([key, value]) => [key, value.slice()]));
    copy.ratchetCount = this.ratchetCount;
    copy.isInitiator = this.isInitiator;
    return copy;
  }

  replaceWith(next) {
    // Old JavaScript buffers cannot be guaranteed wiped by the runtime, but
    // clearing these copies reduces their lifetime after a successful commit.
    if (this.RK) this.RK.fill(0);
    if (this.CKs) this.CKs.fill(0);
    if (this.CKr) this.CKr.fill(0);
    this.MKSKIP.forEach((mk) => mk.fill(0));
    this.DHs = next.DHs;
    this.DHr = next.DHr;
    this.DHrRaw = next.DHrRaw;
    this.RK = next.RK;
    this.CKs = next.CKs;
    this.CKr = next.CKr;
    this.Ns = next.Ns;
    this.Nr = next.Nr;
    this.PN = next.PN;
    this.MKSKIP = next.MKSKIP;
    this.ratchetCount = next.ratchetCount;
    this.isInitiator = next.isInitiator;
  }

  async skipMessageKeys(untilN) {
    if (!this.CKr) return;
    if (this.Nr + 2000 < untilN) {
      throw new Error("Skipped message limit exceeded");
    }
    while (this.Nr < untilN) {
      const { messageKey, nextChainKey } = await kdfCK(this.CKr);
      this.CKr = nextChainKey;
      this.MKSKIP.set(`${this.DHrRaw}:${this.Nr}`, messageKey);
      this.Nr++;
    }
  }

  async dhRatchet(remoteDHPubB64) {
    this.PN = this.Ns;
    this.Ns = 0;
    this.Nr = 0;
    this.DHrRaw = remoteDHPubB64;

    this.DHr = await crypto.subtle.importKey(
      "raw",
      unb64(remoteDHPubB64),
      { name: "ECDH", namedCurve: "P-256" },
      true,
      []
    );

    const dhSecret1 = await computeDHSecret(this.DHs.privateKey, this.DHr);
    const { newRK: rk1, newCK: ckr } = await hkdfRK(this.RK, dhSecret1);
    this.RK = rk1;
    this.CKr = ckr;

    this.DHs = await generateDHKeyPair();

    const dhSecret2 = await computeDHSecret(this.DHs.privateKey, this.DHr);
    const { newRK: rk2, newCK: cks } = await hkdfRK(this.RK, dhSecret2);
    this.RK = rk2;
    this.CKs = cks;

    this.ratchetCount++;
  }

  /**
   * Securely wipe cryptographic state
   */
  destroy() {
    if (this.RK) this.RK.fill(0);
    if (this.CKs) this.CKs.fill(0);
    if (this.CKr) this.CKr.fill(0);
    this.MKSKIP.forEach((mk) => mk.fill(0));
    this.MKSKIP.clear();
    this.DHs = null;
    this.DHr = null;
    this.DHrRaw = null;
    this.RK = null;
    this.CKs = null;
    this.CKr = null;
    this.Ns = 0;
    this.Nr = 0;
    this.PN = 0;
    this.ratchetCount = 0;
  }
}
