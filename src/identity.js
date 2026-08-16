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
  try {
    const db = await openDB();
    
    // Read existing key from IndexedDB in a dedicated transaction
    const existing = await new Promise((res, rej) => {
      try {
        const tx = db.transaction(STORE, "readonly");
        const store = tx.objectStore(STORE);
        const r = store.get("identity");
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      } catch (err) {
        rej(err);
      }
    });

    if (existing && existing.privateKey && existing.publicKey) {
      let publicKeyRaw = existing.publicKeyRaw;
      if (!publicKeyRaw) {
        try {
          publicKeyRaw = new Uint8Array(await crypto.subtle.exportKey("raw", existing.publicKey));
          const record = { privateKey: existing.privateKey, publicKey: existing.publicKey, publicKeyRaw };
          const txWrite = db.transaction(STORE, "readwrite");
          txWrite.objectStore(STORE).put(record, "identity");
          return record;
        } catch (err) {
          console.warn("Could not export existing public key, regenerating keypair:", err);
        }
      } else {
        return existing;
      }
    }

    // Generate new keypair
    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    );

    const publicKeyRaw = new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey));
    const record = {
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicKeyRaw
    };

    try {
      const txWrite = db.transaction(STORE, "readwrite");
      txWrite.objectStore(STORE).put(record, "identity");
    } catch (e) {
      console.warn("Could not persist identity to IndexedDB:", e);
    }

    return record;
  } catch (err) {
    console.warn("IndexedDB storage unavailable, falling back to in-memory identity keypair:", err);
    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    );
    const publicKeyRaw = new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey));
    return {
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicKeyRaw
    };
  }
}
