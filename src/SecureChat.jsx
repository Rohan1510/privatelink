import React, { useEffect, useRef, useState } from "react";

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

export default function PrivateLink() {
  const [myId, setMyId] = useState("");
  const [peerId, setPeerId] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("disconnected");
  const [fp, setFp] = useState("");

  const peerRef = useRef(null);
  const connRef = useRef(null);
  const cryptoRef = useRef({});

  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js";
    s.onload = () => {
      const peer = new window.Peer();
      peer.on("open", setMyId);
      peer.on("connection", (c) => setupConn(c, false));
      peerRef.current = peer;
    };
    document.body.appendChild(s);
  }, []);

  async function setupConn(conn, initiator) {
    connRef.current = conn;
    setStatus("handshaking");

    const dh = await genECDH();
    cryptoRef.current.dh = dh;

    conn.on("data", async (pkt) => {
      if (pkt.type === "handshake") {
        const remotePub = await crypto.subtle.importKey(
          "raw",
          unb64(pkt.pub),
          { name: "ECDH", namedCurve: "P-256" },
          true,
          []
        );

        const key = await deriveKey(dh.privateKey, remotePub);
        cryptoRef.current.key = key;

        const fpLocal = await fingerprint(dh.publicKey);
        const fpRemote = await fingerprint(remotePub);
        setFp(`${fpLocal} ↔ ${fpRemote}`);
        setStatus("secure");

        if (!initiator) {
          conn.send({
            type: "handshake",
            pub: b64(await crypto.subtle.exportKey("raw", dh.publicKey)),
          });
        }
        return;
      }

      if (pkt.type === "msg") {
        const text = await decrypt(cryptoRef.current.key, pkt);
        setMsgs((m) => [...m, { from: "them", text }]);
      }
    });

    if (initiator) {
      conn.send({
        type: "handshake",
        pub: b64(await crypto.subtle.exportKey("raw", dh.publicKey)),
      });
    }
  }

  function connect() {
    const conn = peerRef.current.connect(peerId);
    conn.on("open", () => setupConn(conn, true));
  }

  async function send() {
    if (!input || status !== "secure") return;
    const pkt = await encrypt(cryptoRef.current.key, input);
    connRef.current.send({ type: "msg", ...pkt });
    setMsgs((m) => [...m, { from: "me", text: input }]);
    setInput("");
  }

  return (
    <div style={{ padding: 20, fontFamily: "monospace" }}>
      <h2>PrivateLink 🔐</h2>

      <p><b>Your ID:</b> {myId || "loading…"}</p>

      <input
        placeholder="Peer ID"
        value={peerId}
        onChange={(e) => setPeerId(e.target.value)}
      />
      <button onClick={connect}>Connect</button>

      <p>Status: {status}</p>
      {fp && <p><b>Fingerprint:</b> {fp}</p>}

      <hr />

      {msgs.map((m, i) => (
        <div key={i}>
          <b>{m.from}:</b> {m.text}
        </div>
      ))}

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="message"
      />
      <button onClick={send}>Send</button>
    </div>
  );
}
