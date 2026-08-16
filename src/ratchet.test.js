import test from "node:test";
import assert from "node:assert/strict";
import {
  generateDHKeyPair,
  computeDHSecret,
  DoubleRatchetSession
} from "./ratchet.js";

test("Double Ratchet - Normal 2-way conversation and ratchet stepping", async () => {
  const aliceDH = await generateDHKeyPair();
  const bobDH = await generateDHKeyPair();

  const aliceDHPubRaw = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey("raw", aliceDH.publicKey))));
  const bobDHPubRaw = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey("raw", bobDH.publicKey))));

  // Pre-shared secret from ECDH
  const aliceShared = await computeDHSecret(aliceDH.privateKey, bobDH.publicKey);
  const bobShared = await computeDHSecret(bobDH.privateKey, aliceDH.publicKey);

  assert.deepEqual(aliceShared, bobShared, "Initial shared secrets must match");

  const aliceSession = new DoubleRatchetSession();
  const bobSession = new DoubleRatchetSession();

  await aliceSession.init(true, aliceShared, aliceDH, bobDH.publicKey, bobDHPubRaw);
  await bobSession.init(false, bobShared, bobDH, aliceDH.publicKey, aliceDHPubRaw);

  // Alice sends message 1
  const msg1 = "Hello Bob! Secret transmission 1";
  const pkt1 = await aliceSession.encrypt(msg1);
  const dec1 = await bobSession.decrypt(pkt1);
  assert.equal(dec1, msg1, "Bob must decrypt Alice's message 1");

  // Bob replies (triggers DH ratchet step)
  const msg2 = "Hi Alice! Received loud and clear";
  const pkt2 = await bobSession.encrypt(msg2);
  const dec2 = await aliceSession.decrypt(pkt2);
  assert.equal(dec2, msg2, "Alice must decrypt Bob's reply");
  assert.ok(aliceSession.ratchetCount >= 1, "Alice ratchet count must increment after DH ratchet step");
});

test("Double Ratchet - Out of order message arrival via MKSKIP", async () => {
  const aliceDH = await generateDHKeyPair();
  const bobDH = await generateDHKeyPair();

  const aliceDHPubRaw = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey("raw", aliceDH.publicKey))));
  const bobDHPubRaw = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey("raw", bobDH.publicKey))));

  const aliceShared = await computeDHSecret(aliceDH.privateKey, bobDH.publicKey);
  const bobShared = await computeDHSecret(bobDH.privateKey, aliceDH.publicKey);

  const aliceSession = new DoubleRatchetSession();
  const bobSession = new DoubleRatchetSession();

  await aliceSession.init(true, aliceShared, aliceDH, bobDH.publicKey, bobDHPubRaw);
  await bobSession.init(false, bobShared, bobDH, aliceDH.publicKey, aliceDHPubRaw);

  // Alice sends 3 consecutive messages
  const pkt1 = await aliceSession.encrypt("Packet 1");
  const pkt2 = await aliceSession.encrypt("Packet 2");
  const pkt3 = await aliceSession.encrypt("Packet 3");

  // Bob receives Packet 3 first (out of order)
  const dec3 = await bobSession.decrypt(pkt3);
  assert.equal(dec3, "Packet 3");

  // Bob receives Packet 1
  const dec1 = await bobSession.decrypt(pkt1);
  assert.equal(dec1, "Packet 1");

  // Bob receives Packet 2
  const dec2 = await bobSession.decrypt(pkt2);
  assert.equal(dec2, "Packet 2");
});

test("Double Ratchet - Replay attack rejection", async () => {
  const aliceDH = await generateDHKeyPair();
  const bobDH = await generateDHKeyPair();

  const aliceDHPubRaw = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey("raw", aliceDH.publicKey))));
  const bobDHPubRaw = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey("raw", bobDH.publicKey))));

  const aliceShared = await computeDHSecret(aliceDH.privateKey, bobDH.publicKey);
  const bobShared = await computeDHSecret(bobDH.privateKey, aliceDH.publicKey);

  const aliceSession = new DoubleRatchetSession();
  const bobSession = new DoubleRatchetSession();

  await aliceSession.init(true, aliceShared, aliceDH, bobDH.publicKey, bobDHPubRaw);
  await bobSession.init(false, bobShared, bobDH, aliceDH.publicKey, aliceDHPubRaw);

  const pkt1 = await aliceSession.encrypt("Unique message");
  const dec1 = await bobSession.decrypt(pkt1);
  assert.equal(dec1, "Unique message");

  // Attempt to replay pkt1
  await assert.rejects(
    async () => {
      await bobSession.decrypt(pkt1);
    },
    /OperationError|Error/i,
    "Replayed packet must be rejected"
  );
});

test("Double Ratchet - Ciphertext tampering rejection", async () => {
  const aliceDH = await generateDHKeyPair();
  const bobDH = await generateDHKeyPair();

  const aliceDHPubRaw = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey("raw", aliceDH.publicKey))));
  const bobDHPubRaw = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey("raw", bobDH.publicKey))));

  const aliceShared = await computeDHSecret(aliceDH.privateKey, bobDH.publicKey);
  const bobShared = await computeDHSecret(bobDH.privateKey, aliceDH.publicKey);

  const aliceSession = new DoubleRatchetSession();
  const bobSession = new DoubleRatchetSession();

  await aliceSession.init(true, aliceShared, aliceDH, bobDH.publicKey, bobDHPubRaw);
  await bobSession.init(false, bobShared, bobDH, aliceDH.publicKey, aliceDHPubRaw);

  const pkt = await aliceSession.encrypt("Authentic content");

  // Tamper with ciphertext
  const tamperedPkt = JSON.parse(JSON.stringify(pkt));
  const rawCt = Uint8Array.from(atob(tamperedPkt.ct), (c) => c.charCodeAt(0));
  rawCt[0] ^= 0xff; // Flip bits
  tamperedPkt.ct = btoa(String.fromCharCode(...rawCt));

  await assert.rejects(
    async () => {
      await bobSession.decrypt(tamperedPkt);
    },
    /OperationError|Error/i,
    "Tampered packet must fail AES-GCM decryption"
  );
});

test("Double Ratchet - Session state destruction", async () => {
  const aliceDH = await generateDHKeyPair();
  const bobDH = await generateDHKeyPair();
  const bobDHPubRaw = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey("raw", bobDH.publicKey))));
  const shared = await computeDHSecret(aliceDH.privateKey, bobDH.publicKey);

  const session = new DoubleRatchetSession();
  await session.init(true, shared, aliceDH, bobDH.publicKey, bobDHPubRaw);

  assert.ok(session.RK !== null, "RK initialized");
  session.destroy();

  assert.equal(session.RK, null, "RK nullified on destroy");
  assert.equal(session.CKs, null, "CKs nullified on destroy");
  assert.equal(session.MKSKIP.size, 0, "MKSKIP cleared on destroy");
});
