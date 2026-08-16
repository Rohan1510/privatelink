import assert from "node:assert/strict";
import test from "node:test";
import { isValidFingerprint } from "./trustStore.js";

test("trust store accepts the fingerprint format displayed by the UI", () => {
  assert.equal(isValidFingerprint("ABCD E123 0123 4567 89AB CDEF 0123 4567"), true);
  assert.equal(isValidFingerprint("ABCDEFGH0123456789ABCDEF01234567"), false);
});
