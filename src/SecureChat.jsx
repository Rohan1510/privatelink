import React, { useEffect, useRef, useState } from "react";
import { loadOrCreateIdentity } from "./identity";
import IronManUI from "./IronManUI";

/* ================== */
/* === UTILITIES ==== */
/* ================== */

const enc = new TextEncoder();
const dec = new TextDecoder();

const b64 = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) =>
  Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/* ================== */
/* === TRUST DB ===== */
/* ================== */

const TRUST_DB = "privatelink-trust";

function loadTrusted() {
  return JSON.parse(localStorage.getItem(TRUST_DB) || "{}");
}

function saveTrusted(map) {
  localStorage.setItem(TRUST_DB, JSON.stringify(map));
}

/* ================== */
/* === CRYPTO ======= */
/* ================== */

async function genECDH() {
  return crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );
}

async function deriveKey(priv, pub) {
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: pub },
    priv,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function fingerprint(pubKey) {
  const raw = await crypto.subtle.exportKey("raw", pubKey);
  const hash = await crypto.subtle.digest("SHA-256", raw);
  return b64(hash).slice(0, 32);
}

async function encrypt(key, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(text)
  );
  return { iv: b64(iv), ct: b64(ct) };
}

async function decrypt(key, pkt) {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(pkt.iv) },
    key,
    unb64(pkt.ct)
  );
  return dec.decode(pt);
}

/* ================== */
/* === APP ========== */
/* ================== */

export default function SecureChat() {
  const [myId, setMyId] = useState("");
  const [peerId, setPeerId] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("disconnected");
  const [fingerprintStr, setFingerprintStr] = useState("");
  const [trust, setTrust] = useState("unverified");

  const peerRef = useRef(null);
  const connRef = useRef(null);
  const identityRef = useRef(null);
  const sessionRef = useRef({});
  const trustedRef = useRef(loadTrusted());

  /* ===== CLEANUP (CRITICAL) ===== */
  function cleanupAndReset(reason = "") {
    console.warn("[SecureChat] reset:", reason);

    try {
      connRef.current?.close();
    } catch {}

    connRef.current = null;
    sessionRef.current = {};
    setMessages([]);
    setInput("");
    setStatus("disconnected");
    setFingerprintStr("");
    setTrust("unverified");
  }

  /* ===== INIT ===== */
  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js";
    s.onload = async () => {
      identityRef.current = await loadOrCreateIdentity();
      const peer = new window.Peer();
      peer.on("open", setMyId);
      peer.on("connection", (c) => setupConn(c, false));
      peerRef.current = peer;
    };
    document.body.appendChild(s);
  }, []);

  /* ===== CONNECTION ===== */
  async function setupConn(conn, initiator) {
    connRef.current = conn;
    setStatus("handshaking");
    setTrust("unverified");

    const session = await genECDH();
    sessionRef.current.session = session;

    conn.on("data", async (pkt) => {
      /* ---- DISCONNECT PROPAGATION ---- */
      if (pkt.type === "disconnect") {
        cleanupAndReset("Peer disconnected");
        return;
      }

      /* ---- HANDSHAKE ---- */
      if (pkt.type === "handshake") {
        const peerIdentityPub = await crypto.subtle.importKey(
          "raw",
          unb64(pkt.identityPub),
          { name: "ECDSA", namedCurve: "P-256" },
          true,
          ["verify"]
        );

        const peerSessionPub = await crypto.subtle.importKey(
          "raw",
          unb64(pkt.sessionPub),
          { name: "ECDH", namedCurve: "P-256" },
          true,
          []
        );

        const valid = await crypto.subtle.verify(
          { name: "ECDSA", hash: "SHA-256" },
          peerIdentityPub,
          unb64(pkt.sig),
          unb64(pkt.sessionPub)
        );

        if (!valid) {
          alert("🚨 Identity signature invalid");
          cleanupAndReset("Invalid identity");
          return;
        }

        const key = await deriveKey(
          session.privateKey,
          peerSessionPub
        );
        sessionRef.current.key = key;

        const myFP = await fingerprint(identityRef.current.publicKey);
        const theirFP = await fingerprint(peerIdentityPub);
        setFingerprintStr(`${myFP} ↔ ${theirFP}`);
        setStatus("secure");

        const known = trustedRef.current[conn.peer];
        if (!known) setTrust("unverified");
        else if (known === theirFP) setTrust("verified");
        else setTrust("changed");

        if (!initiator) sendHandshake(conn);
      }

      /* ---- MESSAGE ---- */
      if (pkt.type === "msg") {
        const text = await decrypt(sessionRef.current.key, pkt);
        setMessages((m) => [...m, { from: "peer", text }]);
      }
    });

    /* ---- HARD CLOSE HANDLING ---- */
    conn.on("close", () => cleanupAndReset("Connection closed"));
    conn.on("error", () => cleanupAndReset("Connection error"));

    if (initiator) sendHandshake(conn);
  }

  async function sendHandshake(conn) {
    const identity = identityRef.current;
    const session = sessionRef.current.session;

    const sessionPubRaw = await crypto.subtle.exportKey(
      "raw",
      session.publicKey
    );

    const sig = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      identity.privateKey,
      sessionPubRaw
    );

    conn.send({
      type: "handshake",
      identityPub: b64(
        await crypto.subtle.exportKey("raw", identity.publicKey)
      ),
      sessionPub: b64(sessionPubRaw),
      sig: b64(sig),
    });
  }

  function connect() {
    if (!peerId) return;

    if (peerId === myId) {
      alert("❌ You cannot connect to your own Secure ID.");
      return;
    }

    const conn = peerRef.current.connect(peerId);
    conn.on("open", () => setupConn(conn, true));
    conn.on("error", () =>
      alert("❌ Failed to connect to peer")
    );
  }

  function trustIdentity() {
    trustedRef.current[peerId] =
      fingerprintStr.split(" ↔ ")[1];
    saveTrusted(trustedRef.current);
    setTrust("verified");
  }

  async function send() {
    if (!input || status !== "secure") return;
    const pkt = await encrypt(sessionRef.current.key, input);
    connRef.current.send({ type: "msg", ...pkt });
    setMessages((m) => [...m, { from: "me", text: input }]);
    setInput("");
  }

  function disconnect() {
    try {
      connRef.current?.send({ type: "disconnect" });
    } catch {}
    cleanupAndReset("Local disconnect");
  }

  /* ===== UI ===== */
  return (
    <IronManUI
      myId={myId}
      peerId={peerId}
      setPeerId={setPeerId}
      status={status}
      trust={trust}
      fingerprint={fingerprintStr}
      messages={messages}
      input={input}
      setInput={setInput}
      connect={connect}
      send={send}
      trustIdentity={trustIdentity}
      disconnect={disconnect}
    />
  );
}
