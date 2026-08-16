import React, { useCallback, useEffect, useRef, useState } from "react";
import { Peer } from "peerjs";
import { loadOrCreateIdentity } from "./identity";
import { generateDHKeyPair, computeDHSecret, DoubleRatchetSession } from "./ratchet";
import { loadTrustedStore, saveTrustedStore } from "./trustStore";
import { PEER_CONFIG } from "./peerConfig";
import {
  MAX_FILE_SIZE_BYTES,
  FILE_CHUNK_SIZE,
  bytesToB64,
  b64ToBytes,
  makeTransferId,
  fileAAD,
  encryptFileChunk,
  decryptFileChunk,
  waitForWritableBuffer,
} from "./fileTransfer";
import IronManUI from "./IronManUI";

/* ========================================================================= */
/* === UTILITIES & SECURITY LIMITS ========================================= */
/* ========================================================================= */

const MAX_PACKET_SIZE_BYTES = 64 * 1024; // 64 KB
const HANDSHAKE_MAX_AGE_MS = 60_000;      // 60 seconds
const MAX_NONCES = 1000;
const MAX_MESSAGE_LENGTH = 8192;          // 8 KB text per message

// Timestamped sliding window nonce eviction map
const seenHandshakeNonces = new Map();

function evictOldNonces() {
  const now = Date.now();
  for (const [nonce, ts] of seenHandshakeNonces.entries()) {
    if (now - ts > HANDSHAKE_MAX_AGE_MS) {
      seenHandshakeNonces.delete(nonce);
    }
  }
  if (seenHandshakeNonces.size > MAX_NONCES) {
    const oldestKey = seenHandshakeNonces.keys().next().value;
    if (oldestKey) seenHandshakeNonces.delete(oldestKey);
  }
}

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function isValidBase64String(str, minLen = 1, maxLen = 8192) {
  if (typeof str !== "string" || str.length < minLen || str.length > maxLen) return false;
  try {
    return btoa(atob(str)) === str;
  } catch {
    return false;
  }
}

async function fingerprint(pubKeyRaw) {
  const hash = await crypto.subtle.digest("SHA-256", pubKeyRaw);
  const hashArray = Array.from(new Uint8Array(hash));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  // Canonical 8-chunk formatted fingerprint
  return hex.toUpperCase().match(/.{1,4}/g).slice(0, 8).join(" ");
}

function handshakePayload(pkt) {
  return new TextEncoder().encode(
    JSON.stringify({
      v: 1,
      from: pkt.from,
      to: pkt.to,
      sessionPub: pkt.sessionPub,
      nonce: pkt.nonce,
      replyTo: pkt.replyTo || "",
      timestamp: pkt.timestamp,
    })
  );
}

/* ========================================================================= */
/* === MAIN COMPONENT ====================================================== */
/* ========================================================================= */

export default function SecureChat() {
  const [myId, setMyId] = useState("");
  const [peerId, setPeerId] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("disconnected");
  const [fingerprintStr, setFingerprintStr] = useState("");
  const [trust, setTrust] = useState("unverified");
  const [ratchetEpoch, setRatchetEpoch] = useState(0);

  const myIdRef = useRef("");
  const peerRef = useRef(null);
  const connRef = useRef(null);
  const identityRef = useRef(null);
  const sessionRef = useRef({});
  const trustedRef = useRef(loadTrustedStore());
  const queuedPacketsRef = useRef([]);
  const failedDecryptionsRef = useRef(0);
  const trustRef = useRef("unverified");
  const statusRef = useRef("disconnected");
  const outgoingFilesRef = useRef(new Map());
  const incomingFilesRef = useRef(new Map());
  const fileConnectionsRef = useRef(new Map());
  const [fileTransfers, setFileTransfers] = useState([]);

  const updateTransfer = useCallback((transferId, patch) => {
    setFileTransfers((current) => current.map((transfer) => (
      transfer.transferId === transferId ? { ...transfer, ...patch } : transfer
    )));
  }, []);

  // Sync myId state to ref for stale-closure safety
  useEffect(() => {
    myIdRef.current = myId;
  }, [myId]);

  useEffect(() => {
    trustRef.current = trust;
  }, [trust]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  /* ===== CLEANUP & RESET ===== */
  const cleanupAndReset = useCallback((targetConn = null, reason = "") => {
    if (targetConn && connRef.current && targetConn !== connRef.current) {
      return;
    }

    console.warn("[SecureChat] connection reset:", reason);

    if (sessionRef.current?.ratchet) {
      try {
        sessionRef.current.ratchet.destroy();
      } catch (err) {
        console.warn("Ratchet destroy warning:", err);
      }
    }

    try {
      connRef.current?.close();
    } catch (err) {
      console.warn("Connection close warning:", err);
    }

    connRef.current = null;
    sessionRef.current = {};
    queuedPacketsRef.current = [];
    failedDecryptionsRef.current = 0;
    for (const fileConn of fileConnectionsRef.current.values()) fileConn.close();
    fileConnectionsRef.current.clear();
    outgoingFilesRef.current.clear();
    incomingFilesRef.current.forEach((transfer) => transfer.writable?.abort?.());
    incomingFilesRef.current.clear();
    setFileTransfers([]);

    setMessages([]);
    setInput("");
    setStatus("disconnected");
    statusRef.current = "disconnected";
    setFingerprintStr("");
    setTrust("unverified");
    trustRef.current = "unverified";
    setRatchetEpoch(0);
  }, []);

  /* ===== SEND HANDSHAKE ===== */
  const sendHandshake = useCallback(async (conn, replyTo = "") => {
    const identity = identityRef.current;
    const session = sessionRef.current.session;

    const sessionPubRaw = await crypto.subtle.exportKey(
      "raw",
      session.publicKey
    );

    const nonce = crypto.getRandomValues(new Uint8Array(16));
    const nonceB64 = b64(nonce);
    const timestamp = Date.now();
    const currentMyId = myIdRef.current || peerRef.current?.id;

    const unsignedPacket = {
      v: 1,
      from: currentMyId,
      to: conn.peer,
      sessionPub: b64(sessionPubRaw),
      nonce: nonceB64,
      replyTo,
      timestamp,
    };

    const sig = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      identity.privateKey,
      handshakePayload(unsignedPacket)
    );

    if (!replyTo) sessionRef.current.localNonce = nonceB64;

    conn.send({
      type: "handshake",
      ...unsignedPacket,
      identityPub: b64(identity.publicKeyRaw),
      sig: b64(sig),
    });
  }, []);

  /* ===== PROCESS INBOUND RATCHET PACKET ===== */
  async function sendSecureEnvelope(envelope) {
    if (statusRef.current !== "secure" || !sessionRef.current.ratchet || !connRef.current?.open) {
      throw new Error("Secure connection is not available");
    }
    const pkt = await sessionRef.current.ratchet.encrypt(JSON.stringify(envelope));
    connRef.current.send(pkt);
    setRatchetEpoch(sessionRef.current.ratchet.ratchetCount);
  }

  async function startOutboundFileTransfer(transferId) {
    const transfer = outgoingFilesRef.current.get(transferId);
    if (!transfer || transfer.started || !peerRef.current) return;
    transfer.started = true;
    updateTransfer(transferId, { status: "connecting" });

    const fileConn = peerRef.current.connect(connRef.current.peer, {
      label: `file:${transferId}`,
      reliable: true,
      serialization: "binary",
    });
    fileConnectionsRef.current.set(transferId, fileConn);
    fileConn.on("error", () => updateTransfer(transferId, { status: "failed", error: "File connection failed" }));
    fileConn.on("close", () => fileConnectionsRef.current.delete(transferId));
    fileConn.on("open", async () => {
      try {
        fileConn.send({ type: "file_auth", transferId, token: transfer.token });
        fileConn.send({ type: "file_start", transferId, totalChunks: transfer.totalChunks, size: transfer.file.size });
        updateTransfer(transferId, { status: "sending" });
        for (let index = 0; index < transfer.totalChunks; index++) {
          await waitForWritableBuffer(fileConn.dataChannel);
          const start = index * FILE_CHUNK_SIZE;
          const plaintext = await transfer.file.slice(start, Math.min(start + FILE_CHUNK_SIZE, transfer.file.size)).arrayBuffer();
          const { iv, ciphertext } = await encryptFileChunk(transfer.key, plaintext, fileAAD(transferId, index, transfer.totalChunks));
          fileConn.send({ type: "file_chunk", transferId, index, iv, ciphertext });
          updateTransfer(transferId, { progress: Math.round(((index + 1) / transfer.totalChunks) * 100) });
        }
        await waitForWritableBuffer(fileConn.dataChannel);
        fileConn.send({ type: "file_end", transferId });
        updateTransfer(transferId, { status: "sent", progress: 100 });
      } catch (err) {
        console.error("File transfer failed:", err);
        updateTransfer(transferId, { status: "failed", error: "Transfer interrupted" });
      }
    });
  }

  async function handleFileConnection(fileConn) {
    const transferId = fileConn.label.slice("file:".length);
    const transfer = incomingFilesRef.current.get(transferId);
    if (!transfer) {
      fileConn.close();
      return;
    }
    fileConnectionsRef.current.set(transferId, fileConn);
    fileConn.on("close", () => fileConnectionsRef.current.delete(transferId));
    fileConn.on("error", () => updateTransfer(transferId, { status: "failed", error: "File connection failed" }));
    fileConn.on("data", (packet) => {
      transfer.writeQueue = transfer.writeQueue.then(async () => {
        if (!packet || typeof packet !== "object" || packet.transferId !== transferId) throw new Error("Invalid file packet");
        if (packet.type === "file_auth") {
          if (packet.token !== transfer.token) throw new Error("File authentication failed");
          transfer.authenticated = true;
          return;
        }
        if (!transfer.authenticated) throw new Error("Unauthenticated file channel");
        if (packet.type === "file_start") {
          if (packet.totalChunks !== transfer.totalChunks || packet.size !== transfer.size) throw new Error("File metadata mismatch");
          updateTransfer(transferId, { status: "receiving" });
          return;
        }
        if (packet.type === "file_chunk") {
          if (packet.index !== transfer.nextIndex || !(packet.iv instanceof ArrayBuffer) || !(packet.ciphertext instanceof ArrayBuffer)) {
            throw new Error("Invalid file chunk");
          }
          const plaintext = await decryptFileChunk(transfer.key, packet.iv, packet.ciphertext, fileAAD(transferId, packet.index, transfer.totalChunks));
          if (transfer.receivedBytes + plaintext.byteLength > transfer.size) throw new Error("File size limit exceeded");
          await transfer.writable.write(plaintext);
          transfer.nextIndex++;
          transfer.receivedBytes += plaintext.byteLength;
          updateTransfer(transferId, { progress: Math.round((transfer.nextIndex / transfer.totalChunks) * 100) });
          return;
        }
        if (packet.type === "file_end") {
          if (transfer.nextIndex !== transfer.totalChunks || transfer.receivedBytes !== transfer.size) throw new Error("Incomplete file transfer");
          await transfer.writable.close();
          incomingFilesRef.current.delete(transferId);
          updateTransfer(transferId, { status: "received", progress: 100 });
        }
      }).catch(async (err) => {
        console.error("Rejected file packet:", err);
        await transfer.writable.abort?.();
        incomingFilesRef.current.delete(transferId);
        fileConn.close();
        updateTransfer(transferId, { status: "failed", error: "Integrity check failed" });
      });
    });
  }

  async function handleInboundEnvelope(envelope) {
    if (envelope?.kind === "chat" && typeof envelope.text === "string" && envelope.text.length <= MAX_MESSAGE_LENGTH) {
      setMessages((m) => [...m, { from: "peer", text: envelope.text }]);
      return;
    }
    if (envelope?.kind === "file_offer") {
      if (
        typeof envelope.transferId !== "string" || typeof envelope.name !== "string" ||
        !Number.isSafeInteger(envelope.size) || envelope.size < 1 || envelope.size > MAX_FILE_SIZE_BYTES ||
        !Number.isSafeInteger(envelope.totalChunks) || envelope.totalChunks < 1 ||
        typeof envelope.key !== "string" || typeof envelope.token !== "string"
      ) return;
      if (envelope.totalChunks !== Math.ceil(envelope.size / FILE_CHUNK_SIZE)) return;
      let key;
      try {
        key = b64ToBytes(envelope.key);
      } catch {
        return;
      }
      if (key.byteLength !== 32 || envelope.token.length > 128) return;
      const transfer = {
        ...envelope,
        key,
        nextIndex: 0,
        receivedBytes: 0,
        authenticated: false,
        writeQueue: Promise.resolve(),
      };
      incomingFilesRef.current.set(envelope.transferId, transfer);
      setFileTransfers((current) => [...current, {
        transferId: envelope.transferId, name: envelope.name, size: envelope.size,
        progress: 0, status: "offered", direction: "incoming",
      }]);
      return;
    }
    if (envelope?.kind === "file_accept" && typeof envelope.transferId === "string") {
      await startOutboundFileTransfer(envelope.transferId);
    }
  }

  const processInboundRatchetPacket = useCallback(async (pkt) => {
    try {
      const text = await sessionRef.current.ratchet.decrypt(pkt);
      if (typeof text === "string" && text.length <= MAX_MESSAGE_LENGTH * 2) {
        setRatchetEpoch(sessionRef.current.ratchet.ratchetCount);
        try {
          await handleInboundEnvelope(JSON.parse(text));
        } catch {
          // Backward-compatible rendering for messages created before typed envelopes.
          setMessages((m) => [...m, { from: "peer", text }]);
        }
      }
    } catch (err) {
      console.error("Failed to decrypt ratchet message:", err);
      failedDecryptionsRef.current++;
      if (failedDecryptionsRef.current > 10) {
        cleanupAndReset(connRef.current, "Too many decryption failures");
      }
    }
  }, [cleanupAndReset]);

  /* ===== CONNECTION & HANDSHAKE MANAGEMENT ===== */
  const setupConn = useCallback(async (conn, initiator) => {
    if (connRef.current && connRef.current !== conn) {
      cleanupAndReset(connRef.current, "Replacing connection");
    }

    connRef.current = conn;
    setPeerId(conn.peer);
    setStatus("handshaking");
    statusRef.current = "handshaking";
    setTrust("unverified");
    trustRef.current = "unverified";
    queuedPacketsRef.current = [];
    failedDecryptionsRef.current = 0;

    const session = await generateDHKeyPair();
    sessionRef.current = { session, localNonce: null, handshakeAccepted: false };

    conn.on("data", async (pkt) => {
      if (!pkt || typeof pkt !== "object" || Array.isArray(pkt)) {
        return;
      }

      const pktSize = new TextEncoder().encode(JSON.stringify(pkt)).length;
      if (pktSize > MAX_PACKET_SIZE_BYTES) {
        console.error("Packet size exceeds limit");
        cleanupAndReset(conn, "Packet size limit exceeded");
        return;
      }

      if (pkt.type === "disconnect") {
        cleanupAndReset(conn, "Peer sent disconnect");
        return;
      }

      if (pkt.type === "handshake") {
        evictOldNonces();

        const currentMyId = myIdRef.current || peerRef.current?.id;

        if (
          sessionRef.current.handshakeAccepted ||
          pkt.v !== 1 ||
          pkt.from !== conn.peer ||
          !currentMyId ||
          pkt.to !== currentMyId ||
          !isValidBase64String(pkt.nonce, 1, 256) ||
          !isValidBase64String(pkt.sessionPub, 1, 1024) ||
          !isValidBase64String(pkt.identityPub, 1, 1024) ||
          !isValidBase64String(pkt.sig, 1, 1024) ||
          !Number.isSafeInteger(pkt.timestamp) ||
          Math.abs(Date.now() - pkt.timestamp) > HANDSHAKE_MAX_AGE_MS ||
          seenHandshakeNonces.has(pkt.nonce) ||
          (initiator && pkt.replyTo !== sessionRef.current.localNonce) ||
          (!initiator && pkt.replyTo)
        ) {
          alert("Handshake rejected (invalid signature, expired timestamp, or target mismatch)");
          cleanupAndReset(conn, "Rejected invalid handshake");
          return;
        }

        let peerIdentityPubRaw, peerSessionPubRaw, peerIdentityPub, peerSessionPub;

        try {
          peerIdentityPubRaw = unb64(pkt.identityPub);
          peerSessionPubRaw = unb64(pkt.sessionPub);

          peerIdentityPub = await crypto.subtle.importKey(
            "raw",
            peerIdentityPubRaw,
            { name: "ECDSA", namedCurve: "P-256" },
            true,
            ["verify"]
          );

          peerSessionPub = await crypto.subtle.importKey(
            "raw",
            peerSessionPubRaw,
            { name: "ECDH", namedCurve: "P-256" },
            true,
            []
          );
        } catch (err) {
          console.error("Failed to import key from handshake packet:", err);
          cleanupAndReset(conn, "Invalid key format in handshake");
          return;
        }

        const valid = await crypto.subtle.verify(
          { name: "ECDSA", hash: "SHA-256" },
          peerIdentityPub,
          unb64(pkt.sig),
          handshakePayload(pkt)
        );

        if (!valid) {
          alert("🚨 Identity signature verification failed");
          cleanupAndReset(conn, "Invalid identity signature");
          return;
        }

        seenHandshakeNonces.set(pkt.nonce, Date.now());

        const sharedSecretBits = await computeDHSecret(
          session.privateKey,
          peerSessionPub
        );

        const ratchet = new DoubleRatchetSession();
        await ratchet.init(
          initiator,
          sharedSecretBits,
          session,
          peerSessionPub,
          pkt.sessionPub
        );
        sessionRef.current.ratchet = ratchet;
        sessionRef.current.handshakeAccepted = true;
        setRatchetEpoch(ratchet.ratchetCount);

        const myFP = await fingerprint(identityRef.current.publicKeyRaw);
        const theirFP = await fingerprint(peerIdentityPubRaw);

        sessionRef.current.peerFingerprint = theirFP;
        setFingerprintStr(`${myFP} ↔ ${theirFP}`);

        const known = trustedRef.current[conn.peer];
        if (!known) {
          setTrust("unverified");
          setStatus("verification_required");
          trustRef.current = "unverified";
          statusRef.current = "verification_required";
        } else if (known === theirFP) {
          setTrust("verified");
          setStatus("secure");
          trustRef.current = "verified";
          statusRef.current = "secure";
        } else {
          setTrust("changed");
          setStatus("verification_required");
          trustRef.current = "changed";
          statusRef.current = "verification_required";
        }

        if (!initiator) {
          await sendHandshake(conn, pkt.nonce);
        }
      }

      if (pkt.type === "ratchet_msg" || pkt.type === "msg") {
        if (!sessionRef.current.ratchet) return;

        if (trustRef.current !== "verified" && statusRef.current !== "secure") {
          queuedPacketsRef.current.push(pkt);
          return;
        }

        await processInboundRatchetPacket(pkt);
      }
    });

    conn.on("close", () => cleanupAndReset(conn, "Connection closed"));
    conn.on("error", (err) => cleanupAndReset(conn, `Connection error: ${err}`));

    if (initiator) {
      await sendHandshake(conn);
    }
  }, [cleanupAndReset, processInboundRatchetPacket, sendHandshake]);

  /* ===== INITIALIZATION ===== */
  useEffect(() => {
    let peerInst = null;
    (async () => {
      try {
        identityRef.current = await loadOrCreateIdentity();
      } catch (err) {
        console.error("Identity load error:", err);
      }

      function initPeer(configToUse) {
        try {
          const peer = configToUse ? new Peer(configToUse) : new Peer();

          peer.on("open", (id) => {
            setMyId(id);
            myIdRef.current = id;
          });

          peer.on("error", (err) => {
            console.error("PeerJS network error:", err);
            if (!myIdRef.current && configToUse) {
              console.warn("Retrying PeerJS initialization with default options...");
              initPeer(undefined);
            }
          });

          peer.on("connection", (c) => {
            if (c.label?.startsWith("file:")) {
              handleFileConnection(c);
              return;
            }
            if (connRef.current && connRef.current.open && connRef.current.peer !== c.peer) {
              console.warn("Rejecting concurrent connection from:", c.peer);
              c.close();
              return;
            }
            setupConn(c, false);
          });

          peerRef.current = peer;
          peerInst = peer;
        } catch (err) {
          console.error("Peer initialization error:", err);
          if (!myIdRef.current && configToUse) {
            initPeer(undefined);
          }
        }
      }

      initPeer(PEER_CONFIG);
    })();

    return () => {
      try {
        peerInst?.destroy();
      } catch (err) {
        console.warn("Peer destroy error:", err);
      }
    };
  }, [setupConn, handleFileConnection]);



  /* ===== INITIATE OUTBOUND CONNECTION ===== */
  function connect() {
    if (!peerId) return;

    if (peerId === myIdRef.current) {
      alert("❌ You cannot connect to your own Secure ID.");
      return;
    }

    const conn = peerRef.current.connect(peerId);
    conn.on("open", () => setupConn(conn, true));
    conn.on("error", () => alert("❌ Failed to connect to peer"));
  }

  /* ===== EXPLICIT TRUST CONFIRMATION ===== */
  async function trustIdentity() {
    if (!connRef.current || !sessionRef.current.peerFingerprint) return;

    trustedRef.current[connRef.current.peer] = sessionRef.current.peerFingerprint;
    saveTrustedStore(trustedRef.current);

    setTrust("verified");
    setStatus("secure");
    trustRef.current = "verified";
    statusRef.current = "secure";

    // Process queued inbound packets after user explicit verification
    const queued = [...queuedPacketsRef.current];
    queuedPacketsRef.current = [];
    for (const pkt of queued) {
      await processInboundRatchetPacket(pkt);
    }
  }

  async function selectFile(file) {
    if (!file || statusRef.current !== "secure") return;
    if (file.size < 1 || file.size > MAX_FILE_SIZE_BYTES) {
      alert("Files must be between 1 byte and 250 MB.");
      return;
    }
    const transferId = makeTransferId();
    const key = crypto.getRandomValues(new Uint8Array(32));
    const token = bytesToB64(crypto.getRandomValues(new Uint8Array(16)));
    const totalChunks = Math.ceil(file.size / FILE_CHUNK_SIZE);
    outgoingFilesRef.current.set(transferId, { transferId, file, key, token, totalChunks, started: false });
    setFileTransfers((current) => [...current, {
      transferId, name: file.name || "download", size: file.size, progress: 0, status: "waiting for acceptance", direction: "outgoing",
    }]);
    try {
      await sendSecureEnvelope({
        kind: "file_offer", transferId, name: file.name || "download", type: file.type || "application/octet-stream",
        size: file.size, totalChunks, key: bytesToB64(key), token,
      });
    } catch (err) {
      console.error("Failed to send file offer:", err);
      outgoingFilesRef.current.delete(transferId);
      updateTransfer(transferId, { status: "failed", error: "Could not send file offer" });
    }
  }

  async function acceptFile(transferId) {
    const transfer = incomingFilesRef.current.get(transferId);
    if (!transfer || typeof window.showSaveFilePicker !== "function") {
      alert("This browser cannot stream large files to disk. Use a Chromium-based browser to receive files up to 250 MB.");
      return;
    }
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: transfer.name.replace(/[\\/:*?"<>|]/g, "_"),
        types: [{ description: "Transferred file", accept: { [transfer.type || "application/octet-stream"]: ["." + (transfer.name.split(".").pop() || "bin")] } }],
      });
      transfer.writable = await handle.createWritable();
      updateTransfer(transferId, { status: "accepted" });
      await sendSecureEnvelope({ kind: "file_accept", transferId });
    } catch (err) {
      if (err?.name !== "AbortError") updateTransfer(transferId, { status: "failed", error: "Could not open destination" });
    }
  }

  async function cancelFile(transferId) {
    fileConnectionsRef.current.get(transferId)?.close();
    fileConnectionsRef.current.delete(transferId);
    outgoingFilesRef.current.delete(transferId);
    const incoming = incomingFilesRef.current.get(transferId);
    await incoming?.writable?.abort?.();
    incomingFilesRef.current.delete(transferId);
    updateTransfer(transferId, { status: "cancelled" });
  }

  /* ===== SEND ENCRYPTED MESSAGE ===== */
  async function send() {
    if (!input || status !== "secure" || !sessionRef.current.ratchet) return;
    if (input.length > MAX_MESSAGE_LENGTH) {
      alert("Message exceeds max allowed length");
      return;
    }

    try {
      await sendSecureEnvelope({ kind: "chat", text: input });
      setMessages((m) => [...m, { from: "me", text: input }]);
      setInput("");
    } catch (err) {
      console.error("Failed to encrypt ratchet message:", err);
    }
  }

  /* ===== DISCONNECT ===== */
  function disconnect() {
    try {
      connRef.current?.send({ type: "disconnect" });
    } catch (err) {
      console.warn("Disconnect signal failed:", err);
    }
    cleanupAndReset(connRef.current, "Local user disconnect");
  }

  /* ===== RENDER UI ===== */
  return (
    <IronManUI
      myId={myId}
      peerId={peerId}
      setPeerId={setPeerId}
      status={status}
      trust={trust}
      fingerprint={fingerprintStr}
      ratchetEpoch={ratchetEpoch}
      messages={messages}
      input={input}
      setInput={setInput}
      connect={connect}
      send={send}
      trustIdentity={trustIdentity}
      disconnect={disconnect}
      selectFile={selectFile}
      fileTransfers={fileTransfers}
      acceptFile={acceptFile}
      cancelFile={cancelFile}
    />
  );
}
