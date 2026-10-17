/* ========================================================================= */
/* === FRIENDS STORE SERVICE (ZERO-KNOWLEDGE PERSISTENCE & DEEP LINKS) ===== */
/* ========================================================================= */

import { isValidFingerprint } from "./trustStore.js";

const MAX_FRIENDS = 100;
const PEER_ID_REGEX = /^[a-zA-Z0-9_\-:]{1,128}$/;

/**
 * Returns the scoped localStorage key for a specific Cognito user
 */
export function getFriendsStorageKey(userId) {
  if (!userId || typeof userId !== "string") {
    return "privatelink_friends_anonymous";
  }
  // Sanitize userId to prevent storage key collisions
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `privatelink_friends_${safeUserId}`;
}

/**
 * Derives a deterministic PeerJS ID from a Cognito user ID
 */
export function getDeterministicPeerId(userId) {
  if (!userId || typeof userId !== "string") return null;
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `pl-${safeId}`;
}

/**
 * Validates a FriendContact object schema
 */
export function isValidFriendRecord(record) {
  if (!record || typeof record !== "object") return false;
  if (typeof record.id !== "string" || !PEER_ID_REGEX.test(record.id)) return false;
  if (!isValidFingerprint(record.fingerprint)) return false;
  if (record.email && typeof record.email !== "string") return false;
  if (record.displayName && typeof record.displayName !== "string") return false;
  return true;
}

/**
 * Retrieve all saved friends for the given user
 */
export function getFriends(userId) {
  try {
    if (typeof localStorage === "undefined") return [];
    const key = getFriendsStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn("[FriendsStore] Invalid storage format, resetting.");
      return [];
    }
    return parsed.filter(isValidFriendRecord);
  } catch (err) {
    console.error("[FriendsStore] Failed to load friends:", err);
    return [];
  }
}

/**
 * Save or update a friend contact in the user's scoped store
 */
export function saveFriend(userId, friend) {
  try {
    if (typeof localStorage === "undefined") return null;
    if (!isValidFriendRecord(friend)) {
      console.warn("[FriendsStore] Rejected invalid friend record:", friend);
      return null;
    }

    const key = getFriendsStorageKey(userId);
    const existing = getFriends(userId);

    const cleanRecord = {
      id: friend.id,
      userId: friend.userId || friend.id,
      email: (friend.email || "").trim().slice(0, 120),
      displayName: (friend.displayName || friend.email?.split("@")[0] || "Agent").trim().slice(0, 50),
      fingerprint: friend.fingerprint,
      addedAt: friend.addedAt || Date.now(),
      lastConnectedAt: friend.lastConnectedAt || null,
    };

    // Update existing friend with same ID or add new
    const filtered = existing.filter((f) => f.id !== cleanRecord.id && f.fingerprint !== cleanRecord.fingerprint);
    const updated = [cleanRecord, ...filtered].slice(0, MAX_FRIENDS);

    localStorage.setItem(key, JSON.stringify(updated));
    return cleanRecord;
  } catch (err) {
    console.error("[FriendsStore] Failed to save friend:", err);
    return null;
  }
}

/**
 * Remove a friend from the user's scoped store
 */
export function removeFriend(userId, friendId) {
  try {
    if (typeof localStorage === "undefined") return [];
    const key = getFriendsStorageKey(userId);
    const existing = getFriends(userId);
    const filtered = existing.filter((f) => f.id !== friendId);
    localStorage.setItem(key, JSON.stringify(filtered));
    return filtered;
  } catch (err) {
    console.error("[FriendsStore] Failed to remove friend:", err);
    return [];
  }
}

/**
 * Find a saved friend by their PeerJS ID
 */
export function findFriendByPeerId(userId, peerId) {
  if (!peerId) return null;
  const friends = getFriends(userId);
  return friends.find((f) => f.id === peerId) || null;
}

/**
 * Find a saved friend by their ECDSA identity fingerprint
 */
export function findFriendByFingerprint(userId, fingerprint) {
  if (!fingerprint) return null;
  const friends = getFriends(userId);
  return friends.find((f) => f.fingerprint === fingerprint) || null;
}

/**
 * Helper to safely encode string to base64
 */
function safeB64Encode(str) {
  if (typeof btoa !== "undefined") {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode("0x" + p1)));
  }
  return Buffer.from(str, "utf-8").toString("base64");
}

/**
 * Helper to safely decode base64 string
 */
function safeB64Decode(str) {
  if (typeof atob !== "undefined") {
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(str), (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  }
  return Buffer.from(str, "base64").toString("utf-8");
}

/**
 * Generates an encrypted contact card invite payload
 */
export function generateInvitePayload(user, fingerprint, origin = "") {
  if (!user || !isValidFingerprint(fingerprint)) return null;

  const peerId = getDeterministicPeerId(user.userId) || user.userId;
  const payloadObj = {
    v: 1,
    id: peerId,
    uid: user.userId,
    email: user.email || "",
    name: user.displayName || user.username || (user.email ? user.email.split("@")[0] : "Agent"),
    fp: fingerprint,
    ts: Date.now(),
  };

  const jsonStr = JSON.stringify(payloadObj);
  const token = safeB64Encode(jsonStr);

  const baseUrl = origin || (typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "");
  const url = baseUrl ? `${baseUrl}#invite=${token}` : `#invite=${token}`;

  return { token, url, payload: payloadObj };
}

/**
 * Parses and validates an invite token or deep-link hash
 */
export function parseInvitePayload(tokenOrUrl) {
  if (!tokenOrUrl || typeof tokenOrUrl !== "string") return null;

  try {
    let cleanToken = tokenOrUrl.trim();

    // If a full URL or hash was passed, extract the token
    if (cleanToken.includes("#invite=")) {
      cleanToken = cleanToken.split("#invite=")[1];
    } else if (cleanToken.includes("invite=")) {
      cleanToken = cleanToken.split("invite=")[1];
    }

    // Clean up any remaining URL parameter artifacts
    cleanToken = cleanToken.split("&")[0];

    const decodedStr = safeB64Decode(cleanToken);
    const parsed = JSON.parse(decodedStr);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.id ||
      typeof parsed.id !== "string" ||
      !PEER_ID_REGEX.test(parsed.id) ||
      !isValidFingerprint(parsed.fp)
    ) {
      return null;
    }

    return {
      id: parsed.id,
      userId: parsed.uid || parsed.id,
      email: parsed.email || "",
      displayName: parsed.name || (parsed.email ? parsed.email.split("@")[0] : "Agent"),
      fingerprint: parsed.fp,
      addedAt: Date.now(),
      lastConnectedAt: null,
    };
  } catch (err) {
    console.warn("[FriendsStore] Failed to parse invite payload:", err);
    return null;
  }
}
