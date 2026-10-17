import assert from "node:assert/strict";
import test from "node:test";
import {
  getFriendsStorageKey,
  getDeterministicPeerId,
  isValidFriendRecord,
  getFriends,
  saveFriend,
  removeFriend,
  findFriendByPeerId,
  findFriendByFingerprint,
  generateInvitePayload,
  parseInvitePayload,
} from "./friendsStore.js";

// Mock localStorage for Node test runner
const memoryStore = new Map();
globalThis.localStorage = {
  getItem: (key) => memoryStore.get(key) ?? null,
  setItem: (key, val) => memoryStore.set(key, String(val)),
  removeItem: (key) => memoryStore.delete(key),
  clear: () => memoryStore.clear(),
};

const SAMPLE_FP = "ABCD E123 0123 4567 89AB CDEF 0123 4567";
const SAMPLE_FP_2 = "FFFF 0000 1111 2222 3333 4444 5555 6666";

test("getFriendsStorageKey produces safe scoped keys", () => {
  assert.equal(getFriendsStorageKey("user-123_abc"), "privatelink_friends_user-123_abc");
  assert.equal(getFriendsStorageKey("user/with@bad#chars"), "privatelink_friends_userwithbadchars");
  assert.equal(getFriendsStorageKey(null), "privatelink_friends_anonymous");
});

test("getDeterministicPeerId creates pl- prefixed IDs", () => {
  assert.equal(getDeterministicPeerId("us-east-1:12345-67890"), "pl-us-east-112345-67890");
  assert.equal(getDeterministicPeerId(""), null);
  assert.equal(getDeterministicPeerId(null), null);
});

test("isValidFriendRecord validates schema integrity", () => {
  const valid = {
    id: "pl-user1",
    fingerprint: SAMPLE_FP,
    email: "user1@example.com",
    displayName: "User One",
  };
  assert.equal(isValidFriendRecord(valid), true);

  // Invalid fingerprint
  assert.equal(isValidFriendRecord({ ...valid, fingerprint: "bad-fingerprint" }), false);

  // Missing ID
  assert.equal(isValidFriendRecord({ ...valid, id: "" }), false);

  // Invalid ID characters
  assert.equal(isValidFriendRecord({ ...valid, id: "bad ID with spaces!" }), false);
});

test("saveFriend, getFriends, and removeFriend perform scoped CRUD", () => {
  memoryStore.clear();
  const userId = "alice-account";

  const friend1 = {
    id: "pl-bob",
    fingerprint: SAMPLE_FP,
    email: "bob@example.com",
    displayName: "Bob",
  };

  const friend2 = {
    id: "pl-charlie",
    fingerprint: SAMPLE_FP_2,
    email: "charlie@example.com",
    displayName: "Charlie",
  };

  // Save friend1
  const saved1 = saveFriend(userId, friend1);
  assert.ok(saved1);
  assert.equal(saved1.id, "pl-bob");
  assert.equal(saved1.fingerprint, SAMPLE_FP);

  // Save friend2
  saveFriend(userId, friend2);

  // Retrieve
  const friends = getFriends(userId);
  assert.equal(friends.length, 2);
  assert.equal(friends[0].id, "pl-charlie"); // Most recently added first
  assert.equal(friends[1].id, "pl-bob");

  // Multi-user isolation test
  const otherUserFriends = getFriends("other-user-eve");
  assert.equal(otherUserFriends.length, 0);

  // Find helpers
  assert.equal(findFriendByPeerId(userId, "pl-bob")?.displayName, "Bob");
  assert.equal(findFriendByFingerprint(userId, SAMPLE_FP_2)?.displayName, "Charlie");

  // Remove Charlie
  const afterRemove = removeFriend(userId, "pl-charlie");
  assert.equal(afterRemove.length, 1);
  assert.equal(afterRemove[0].id, "pl-bob");
});

test("generateInvitePayload and parseInvitePayload round-trip accurately", () => {
  const user = {
    userId: "stark-sub-1234",
    email: "tony@stark.com",
    displayName: "IronMan",
  };

  const invite = generateInvitePayload(user, SAMPLE_FP, "https://privatelink.network");
  assert.ok(invite.token);
  assert.ok(invite.url.startsWith("https://privatelink.network#invite="));

  // Parse direct token
  const parsedFromToken = parseInvitePayload(invite.token);
  assert.ok(parsedFromToken);
  assert.equal(parsedFromToken.id, "pl-stark-sub-1234");
  assert.equal(parsedFromToken.email, "tony@stark.com");
  assert.equal(parsedFromToken.displayName, "IronMan");
  assert.equal(parsedFromToken.fingerprint, SAMPLE_FP);

  // Parse full URL
  const parsedFromUrl = parseInvitePayload(invite.url);
  assert.ok(parsedFromUrl);
  assert.equal(parsedFromUrl.id, "pl-stark-sub-1234");
  assert.equal(parsedFromUrl.fingerprint, SAMPLE_FP);

  // Reject tampered / invalid payload
  assert.equal(parseInvitePayload("invalid-non-base64-string!"), null);
  assert.equal(parseInvitePayload(""), null);
  assert.equal(parseInvitePayload(null), null);
});
