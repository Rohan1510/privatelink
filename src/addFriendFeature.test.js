import assert from "node:assert/strict";
import test from "node:test";
import {
  generateInvitePayload,
  parseInvitePayload,
  saveFriend,
  getFriends,
  removeFriend,
  findFriendByPeerId,
  findFriendByFingerprint,
  getDeterministicPeerId,
} from "./friendsStore.js";

// Mock localStorage for the Node.js test environment
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => mockStorage.get(key) ?? null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};

const VALID_FINGERPRINT_A = "A1B2 C3D4 E5F6 0123 4567 89AB CDEF 0123";
const VALID_FINGERPRINT_B = "9876 5432 10FE DCBA 4321 0FED CBA9 8765";

test("Adding Feature - generates and parses ally invite URL and token", () => {
  const allyUser = {
    userId: "cognito-user-peter-parker",
    email: "peter@stark.industries",
    displayName: "Spider-Man",
  };

  const invite = generateInvitePayload(
    allyUser,
    VALID_FINGERPRINT_A,
    "https://privatelink.network"
  );

  assert.ok(invite, "Invite payload should be generated");
  assert.ok(invite.token, "Invite must include a base64 token");
  assert.ok(invite.url.includes("#invite="), "Invite URL must include #invite= parameter");

  // Parse using the full URL (simulates user clicking or pasting link)
  const parsedFromUrl = parseInvitePayload(invite.url);
  assert.ok(parsedFromUrl, "Should parse ally from invite URL");
  assert.equal(parsedFromUrl.id, "pl-cognito-user-peter-parker");
  assert.equal(parsedFromUrl.displayName, "Spider-Man");
  assert.equal(parsedFromUrl.email, "peter@stark.industries");
  assert.equal(parsedFromUrl.fingerprint, VALID_FINGERPRINT_A);

  // Parse using only the raw token (simulates pasting raw token)
  const parsedFromToken = parseInvitePayload(invite.token);
  assert.ok(parsedFromToken, "Should parse ally from raw token");
  assert.equal(parsedFromToken.id, parsedFromUrl.id);
});

test("Adding Feature - successfully saves and retrieves new ally in scoped store", () => {
  mockStorage.clear();
  const currentUserId = "tony-stark-001";

  const allyData = {
    id: "pl-rhodey-war-machine",
    fingerprint: VALID_FINGERPRINT_B,
    email: "rhodey@usaf.mil",
    displayName: "War Machine",
  };

  // Add the ally
  const saved = saveFriend(currentUserId, allyData);
  assert.ok(saved, "saveFriend should return the saved record");
  assert.equal(saved.id, "pl-rhodey-war-machine");
  assert.equal(saved.displayName, "War Machine");

  // Verify list retrieval
  const allies = getFriends(currentUserId);
  assert.equal(allies.length, 1);
  assert.equal(allies[0].id, "pl-rhodey-war-machine");
  assert.equal(allies[0].displayName, "War Machine");

  // Lookup helpers
  const foundById = findFriendByPeerId(currentUserId, "pl-rhodey-war-machine");
  assert.ok(foundById);
  assert.equal(foundById.email, "rhodey@usaf.mil");

  const foundByFp = findFriendByFingerprint(currentUserId, VALID_FINGERPRINT_B);
  assert.ok(foundByFp);
  assert.equal(foundByFp.displayName, "War Machine");
});

test("Adding Feature - prevents duplicate entries and updates existing ally info", () => {
  mockStorage.clear();
  const currentUserId = "tony-stark-001";

  const originalAlly = {
    id: "pl-jarvis",
    fingerprint: VALID_FINGERPRINT_A,
    displayName: "JARVIS",
  };

  saveFriend(currentUserId, originalAlly);
  assert.equal(getFriends(currentUserId).length, 1);

  // Re-add the same ally with updated displayName and email
  const updatedAlly = {
    id: "pl-jarvis",
    fingerprint: VALID_FINGERPRINT_A,
    displayName: "VISION",
    email: "vision@avengers.org",
  };

  saveFriend(currentUserId, updatedAlly);
  const allies = getFriends(currentUserId);

  assert.equal(allies.length, 1, "Duplicate ally should be updated, not duplicated");
  assert.equal(allies[0].displayName, "VISION");
  assert.equal(allies[0].email, "vision@avengers.org");
});

test("Adding Feature - enforces user isolation across different accounts", () => {
  mockStorage.clear();
  const userA = "account-steve-rogers";
  const userB = "account-bucky-barnes";

  saveFriend(userA, {
    id: "pl-sam-wilson",
    fingerprint: VALID_FINGERPRINT_A,
    displayName: "Falcon",
  });

  // User B's list should be empty
  const userBFriends = getFriends(userB);
  assert.equal(userBFriends.length, 0, "User B should not see User A's allies");

  // User A should have 1 ally
  assert.equal(getFriends(userA).length, 1);
});

test("Adding Feature - UI simulation: handles invite parsing, self-add guard, and state sync", () => {
  mockStorage.clear();
  const currentUserId = "user-bruce-banner";
  const myDeterministicPeerId = getDeterministicPeerId(currentUserId);

  // 1. Generate an invite for self (Tony invites Bruce, Bruce mistakenly tries to add his own invite)
  const selfUser = {
    userId: currentUserId,
    email: "bruce@avengers.org",
    displayName: "Hulk",
  };
  const selfInvite = generateInvitePayload(selfUser, VALID_FINGERPRINT_A);
  const parsedSelf = parseInvitePayload(selfInvite.token);

  // Self-add guard check as implemented in IronManUI.jsx
  const isSelf = parsedSelf.id === myDeterministicPeerId;
  assert.equal(isSelf, true, "Should detect that the invite belongs to self");

  // 2. Generate an invite from an ally (Natasha invites Bruce)
  const allyUser = {
    userId: "natasha-romanoff",
    email: "natasha@shield.gov",
    displayName: "Black Widow",
  };
  const allyInvite = generateInvitePayload(allyUser, VALID_FINGERPRINT_B);
  const parsedAlly = parseInvitePayload(allyInvite.url);

  assert.notEqual(parsedAlly.id, myDeterministicPeerId, "Ally ID is not self ID");

  // Save ally
  const saved = saveFriend(currentUserId, parsedAlly);
  assert.ok(saved);

  // Remove ally
  const afterRemove = removeFriend(currentUserId, parsedAlly.id);
  assert.equal(afterRemove.length, 0, "Ally successfully removed");
});

test("Adding Feature - invalid invite inputs are safely rejected", () => {
  assert.equal(parseInvitePayload(""), null);
  assert.equal(parseInvitePayload(null), null);
  assert.equal(parseInvitePayload("https://privatelink.network#invite=bad_data!"), null);
  assert.equal(saveFriend("user1", null), null);
  assert.equal(saveFriend("user1", { id: "", fingerprint: "invalid" }), null);
});
