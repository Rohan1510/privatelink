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

  if (existing) return existing;

  const key = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );

  await new Promise((res) => {
    const r = store.put(key, "identity");
    r.onsuccess = res;
  });

  return key;
}
