const DB_NAME = "privatelink-id";
const STORE = "keys";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function loadOrCreateIdentity() {
  const db = await openDB();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);

  const existing = await new Promise((res) => {
    const r = store.get("identity");
    r.onsuccess = () => res(r.result);
  });

  // Replace legacy extractable private keys. This deliberately changes the
  // local identity once, so contacts must verify the new fingerprint.
  if (existing && existing.privateKey && existing.publicKey && !existing.privateKey.extractable) {
    let publicKeyRaw = existing.publicKeyRaw;
    if (!publicKeyRaw) {
      try {
        publicKeyRaw = new Uint8Array(await crypto.subtle.exportKey("raw", existing.publicKey));
      } catch (err) {
        console.warn("Could not export existing public key, regenerating identity keypair:", err);
      }
    }
    if (publicKeyRaw) {
      return { privateKey: existing.privateKey, publicKey: existing.publicKey, publicKeyRaw };
    }
  }

  // Only the public key needs to be exported. Keeping the private key
  // non-extractable limits the impact of same-origin script compromise.
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign", "verify"]
  );

  const publicKeyRaw = new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey));
  const record = {
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    publicKeyRaw
  };

  await new Promise((res) => {
    const r = store.put(record, "identity");
    r.onsuccess = res;
  });

  return record;
}
