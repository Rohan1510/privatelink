/* ========================================================================= */
/* === LOCAL DEVICE IDENTITY (NO ACCOUNTS, NO SIGN-IN) ===================== */
/* ========================================================================= */

const STORAGE_KEY = "privatelink_local_user";

function randomUserId() {
  try {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch {
    // fall through to the non-cryptographic fallback below
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
}

function isValidLocalUser(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof value.userId === "string" &&
    /^[a-zA-Z0-9_-]{8,64}$/.test(value.userId)
  );
}

function normalize(record) {
  const displayName =
    typeof record.displayName === "string" && record.displayName.trim()
      ? record.displayName.trim().slice(0, 48)
      : `Operator-${record.userId.slice(0, 6).toUpperCase()}`;
  return {
    userId: record.userId,
    username: displayName,
    displayName,
    email: "",
  };
}

/**
 * Load the device-local identity, creating and persisting one on first run.
 * Replaces the former Cognito user object; same shape the rest of the app
 * consumes (userId / username / displayName / email).
 */
export function getLocalUser() {
  let stored = null;
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isValidLocalUser(parsed)) stored = parsed;
      }
    }
  } catch (err) {
    console.warn("[LocalUser] Could not read stored identity:", err);
  }

  const record = stored || { userId: randomUserId(), displayName: "" };
  const user = normalize(record);

  if (!stored) {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ userId: user.userId, displayName: user.displayName })
        );
      }
    } catch (err) {
      console.warn("[LocalUser] Could not persist identity:", err);
    }
  }

  return user;
}

/**
 * Rename the local operator. Returns the updated user record.
 */
export function setLocalDisplayName(name) {
  const current = getLocalUser();
  const next = normalize({ userId: current.userId, displayName: name });
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ userId: next.userId, displayName: next.displayName })
      );
    }
  } catch (err) {
    console.warn("[LocalUser] Could not persist display name:", err);
  }
  return next;
}
