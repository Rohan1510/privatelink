/* ========================================================================= */
/* === TRUST STORE UTILITY (SANITY & SCHEMA PROTECTION) =================== */
/* ========================================================================= */

const TRUST_DB_KEY = "privatelink-trust";
const MAX_TRUSTED_ENTRIES = 100;
// SHA-256 identity fingerprints are displayed as eight groups of four
// uppercase hexadecimal characters (128 bits of the hash).
const FINGERPRINT_REGEX = /^[A-F0-9]{4}(?: [A-F0-9]{4}){7}$/;

/**
 * Validate identity fingerprint format
 */
export function isValidFingerprint(fp) {
  return typeof fp === "string" && FINGERPRINT_REGEX.test(fp);
}

/**
 * Load trusted peer fingerprints safely with schema validation
 */
export function loadTrustedStore() {
  try {
    const raw = localStorage.getItem(TRUST_DB_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      console.warn("[TrustStore] Invalid trust DB format, resetting.");
      return {};
    }
    const cleanMap = {};
    for (const [peerId, fp] of Object.entries(parsed)) {
      if (
        typeof peerId === "string" &&
        peerId.length >= 1 &&
        peerId.length <= 128 &&
        isValidFingerprint(fp)
      ) {
        cleanMap[peerId] = fp;
      }
    }
    return cleanMap;
  } catch (err) {
    console.error("[TrustStore] Failed to load trusted store:", err);
    return {};
  }
}

/**
 * Save trusted peer fingerprints map after bounds and schema validation
 */
export function saveTrustedStore(map) {
  try {
    if (typeof map !== "object" || map === null || Array.isArray(map)) {
      return;
    }
    const cleanMap = {};
    const entries = Object.entries(map);
    // Keep only most recent entries if bound exceeded
    const boundedEntries = entries.slice(-MAX_TRUSTED_ENTRIES);
    for (const [peerId, fp] of boundedEntries) {
      if (
        typeof peerId === "string" &&
        peerId.length >= 1 &&
        peerId.length <= 128 &&
        isValidFingerprint(fp)
      ) {
        cleanMap[peerId] = fp;
      }
    }
    localStorage.setItem(TRUST_DB_KEY, JSON.stringify(cleanMap));
  } catch (err) {
    console.error("[TrustStore] Failed to save trusted store:", err);
  }
}
