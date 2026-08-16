import { useRef, useEffect, useState } from "react";
import {
  Send,
  Lock,
  Shield,
  Copy,
  CheckCircle,
  Power,
  MessageSquare,
  Zap,
  AlertTriangle,
  CheckCheck,
  Fingerprint,
  ChevronRight
} from "lucide-react";

/* ─────────────────────────────────────────────
   ICON LOGO  (hexagonal mark)
───────────────────────────────────────────── */
function HexLogo({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <defs>
        <linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="100%" stopColor="#7b5ef8" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <polygon
        points="40,4 72,22 72,58 40,76 8,58 8,22"
        fill="rgba(0,212,255,0.06)"
        stroke="url(#hg)"
        strokeWidth="1.5"
        filter="url(#glow)"
      />
      <polygon
        points="40,14 62,26 62,54 40,66 18,54 18,26"
        fill="rgba(123,94,248,0.08)"
        stroke="url(#hg)"
        strokeWidth="0.8"
        opacity="0.5"
      />
      <path
        d="M40 26 L28 44 H36 L32 54 L52 36 H44 L48 26 Z"
        fill="url(#hg)"
        filter="url(#glow)"
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   CONNECTION SCREEN
───────────────────────────────────────────── */
function ConnectScreen({ myId, peerId, setPeerId, connect, isSelfConnect }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!myId) return;
    navigator.clipboard.writeText(myId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canConnect = peerId && myId && !isSelfConnect;

  return (
    <div
      className="noise"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
        position: "relative",
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,212,255,0.06) 0%, transparent 70%), var(--bg)"
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      />

      <div style={{ maxWidth: 480, width: "100%", position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 40
          }}
        >
          <HexLogo size={88} />
          <h1
            style={{
              fontFamily: "var(--display)",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              marginTop: 20,
              marginBottom: 6,
              background: "linear-gradient(135deg, #fff 30%, var(--accent))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            STARK SECURE
          </h1>
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              color: "var(--muted)",
              textTransform: "uppercase"
            }}
          >
            End-to-End · Double Ratchet (PFS) · ECDH P-256
          </p>
        </div>

        <div className="panel scanline" style={{ padding: 28 }}>
          <label
            style={{
              fontSize: 10,
              letterSpacing: "0.15em",
              color: "var(--muted)",
              textTransform: "uppercase",
              display: "block",
              marginBottom: 8
            }}
          >
            Your Secure ID
          </label>
          <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
            <div
              style={{
                flex: 1,
                padding: "12px 16px",
                background: "rgba(0,0,0,0.5)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                fontFamily: "var(--mono)",
                fontSize: 12,
                color: "var(--accent)",
                wordBreak: "break-all",
                lineHeight: 1.6
              }}
            >
              {myId ? myId : <span className="shimmer-text">Initializing…</span>}
            </div>
            <button onClick={copy} className="btn-ghost" style={{ whiteSpace: "nowrap", minWidth: 90 }}>
              {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 10, letterSpacing: "0.15em", color: "var(--muted)", textTransform: "uppercase" }}>
              Connect
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          <label
            style={{
              fontSize: 10,
              letterSpacing: "0.15em",
              color: "var(--muted)",
              textTransform: "uppercase",
              display: "block",
              marginBottom: 8
            }}
          >
            Partner ID
          </label>
          <input
            className="field"
            value={peerId}
            onChange={(e) => setPeerId(e.target.value.trim())}
            onKeyPress={(e) => e.key === "Enter" && canConnect && connect()}
            placeholder="Paste peer identifier…"
            style={isSelfConnect ? { borderColor: "var(--danger)", boxShadow: "0 0 0 3px rgba(255,71,87,0.12)" } : {}}
          />

          {isSelfConnect && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 11, color: "var(--danger)" }}>
              <AlertTriangle size={13} /> Cannot connect to your own ID
            </div>
          )}

          <button
            className="btn-primary"
            onClick={() => canConnect && connect()}
            disabled={!canConnect}
            style={{ width: "100%", marginTop: 20, fontSize: 13 }}
          >
            <Lock size={15} />
            {isSelfConnect ? "Invalid target" : "Initiate Secure Session"}
            {canConnect && <ChevronRight size={15} />}
          </button>

          <div
            style={{
              marginTop: 20,
              padding: "10px 14px",
              background: "rgba(0,212,255,0.04)",
              border: "1px solid rgba(0,212,255,0.1)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 10
            }}
          >
            <Shield size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
              Protected by Double Ratchet algorithm. Message keys auto-rotate with Perfect Forward Secrecy.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CHAT SCREEN
───────────────────────────────────────────── */
function ChatScreen({
  peerId,
  status,
  trust,
  fingerprint,
  ratchetEpoch,
  messages,
  input,
  setInput,
  send,
  trustIdentity,
  disconnect,
  selectFile,
  fileTransfers,
  acceptFile,
  cancelFile,
}) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isSecure = status === "secure";
  const isHandshaking = status === "handshaking";

  return (
    <div
      className="noise"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background:
          "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(123,94,248,0.06) 0%, transparent 60%), var(--bg)"
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      />

      {/* HEADER */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          borderBottom: "1px solid var(--border)",
          background: "rgba(8,10,15,0.85)",
          backdropFilter: "blur(20px)",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <HexLogo size={36} />
          <div>
            <div style={{ fontFamily: "var(--display)", fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em" }}>
              STARK SECURE
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>
              {peerId?.slice(0, 14)}…
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isSecure && (
            <>
              <span className="badge" style={{ color: "var(--accent)", borderColor: "rgba(0,212,255,0.2)" }}>
                <Zap size={12} />
                Double Ratchet
              </span>
              <span className="badge" style={{ color: "var(--success)", borderColor: "rgba(0,230,118,0.2)" }}>
                <div className="dot-live" />
                PFS Active (Epoch {ratchetEpoch})
              </span>
            </>
          )}
          {isHandshaking && (
            <span className="badge" style={{ color: "var(--warn)", borderColor: "rgba(255,211,42,0.2)" }}>
              <Zap size={12} style={{ animation: "blink 1s infinite" }} />
              Handshaking
            </span>
          )}
          <button className="btn-danger" onClick={disconnect}>
            <Power size={13} /> Disconnect
          </button>
        </div>
      </div>

      {/* TRUST BANNER */}
      {trust !== "verified" && status !== "handshaking" && (
        <div style={{ padding: "0 20px", marginTop: 16, position: "relative", zIndex: 1 }}>
          <div
            style={{
              padding: "14px 18px",
              borderRadius: 12,
              background: trust === "changed" ? "rgba(255,71,87,0.08)" : "rgba(255,211,42,0.06)",
              border: `1px solid ${trust === "changed" ? "rgba(255,71,87,0.3)" : "rgba(255,211,42,0.25)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16
            }}
            className="fade-in"
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <AlertTriangle
                size={15}
                style={{ color: trust === "changed" ? "var(--danger)" : "var(--warn)", marginTop: 2, flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  {trust === "changed" ? "Identity Changed — Possible MITM Attack" : "Peer Identity Unverified"}
                </div>
                {fingerprint && (
                  <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)", wordBreak: "break-all" }}>
                    Canonical FP: {fingerprint}
                  </div>
                )}
              </div>
            </div>
            {trust === "unverified" && (
              <button className="btn-ghost" onClick={trustIdentity} style={{ whiteSpace: "nowrap" }}>
                <Fingerprint size={13} /> Confirm & Trust Fingerprint
              </button>
            )}
          </div>
        </div>
      )}

      {trust === "verified" && (
        <div style={{ padding: "0 20px", marginTop: 16, position: "relative", zIndex: 1 }}>
          <div
            style={{
              padding: "12px 18px",
              borderRadius: 12,
              background: "rgba(0,230,118,0.05)",
              border: "1px solid rgba(0,230,118,0.2)",
              display: "flex",
              alignItems: "center",
              gap: 12
            }}
            className="fade-in"
          >
            <CheckCheck size={15} style={{ color: "var(--success)", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--success)" }}>Identity Trusted Locally</div>
              <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>Canonical FP: {fingerprint}</div>
            </div>
          </div>
        </div>
      )}

      {/* MESSAGES LIST */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          position: "relative",
          zIndex: 1
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              opacity: 0.35
            }}
          >
            <Lock size={28} />
            <p style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {isHandshaking ? "Establishing ratchet session…" : "No messages yet. Say hello."}
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.from === "me" ? "flex-end" : "flex-start" }}>
            <div className={m.from === "me" ? "bubble-me" : "bubble-peer"}>
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: m.from === "me" ? "var(--text)" : "rgba(232,234,240,0.85)"
                }}
              >
                {m.text}
              </p>
              <p
                style={{
                  fontSize: 10,
                  color: "var(--muted)",
                  marginTop: 6,
                  textAlign: m.from === "me" ? "right" : "left"
                }}
              >
                {m.from === "me" ? "You" : "Peer"} · ratcheted
              </p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* INPUT BAR */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          zIndex: 10,
          borderTop: "1px solid var(--border)",
          background: "rgba(8,10,15,0.9)",
          backdropFilter: "blur(20px)",
          padding: "16px 20px"
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input
              className="field"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && isSecure && input && send()}
              placeholder={isHandshaking ? "Establishing ratchet session…" : "Encrypted ratchet message…"}
              disabled={!isSecure}
              style={{ paddingRight: 44 }}
            />
            <Lock
              size={13}
              style={{
                position: "absolute",
                right: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: isSecure ? "var(--accent)" : "var(--muted)",
                pointerEvents: "none"
              }}
            />
          </div>
          <button
            className="btn-primary"
            onClick={send}
            disabled={!input || !isSecure}
            style={{ padding: "14px 20px", gap: 8 }}
          >
            <Send size={15} />
            Send
          </button>
          <label className="btn-ghost" style={{ padding: "14px", cursor: isSecure ? "pointer" : "not-allowed", opacity: isSecure ? 1 : 0.5 }}>
            File
            <input type="file" hidden disabled={!isSecure} onChange={(event) => {
              selectFile(event.target.files?.[0]);
              event.target.value = "";
            }} />
          </label>
        </div>

        {fileTransfers.length > 0 && (
          <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
            {fileTransfers.map((transfer) => (
              <div key={transfer.transferId} style={{ fontSize: 11, color: "var(--muted)", display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: "var(--text)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{transfer.name}</span>
                <span>{transfer.status} {transfer.progress ? `${transfer.progress}%` : ""}</span>
                {transfer.status === "offered" && <button className="btn-ghost" onClick={() => acceptFile(transfer.transferId)}>Accept</button>}
                {!["sent", "received", "failed", "cancelled"].includes(transfer.status) && <button className="btn-ghost" onClick={() => cancelFile(transfer.transferId)}>Cancel</button>}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em" }}>
            DOUBLE RATCHET · HKDF-SHA256 · AES-256-GCM
          </span>
          <span className="badge" style={{ fontSize: 10, color: "var(--muted)" }}>
            <MessageSquare size={10} />
            {messages.length} message{messages.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROOT EXPORT
───────────────────────────────────────────── */
export default function IronManUI({
  myId,
  peerId,
  setPeerId,
  status,
  trust,
  fingerprint,
  ratchetEpoch,
  messages,
  input,
  setInput,
  connect,
  send,
  trustIdentity,
  disconnect,
  selectFile,
  fileTransfers,
  acceptFile,
  cancelFile,
}) {
  const isConnected = status === "secure" || status === "handshaking" || status === "verification_required";
  const isSelfConnect = myId && peerId && peerId.trim() === myId.trim();

  return (
    <>
      {!isConnected ? (
        <ConnectScreen
          myId={myId}
          peerId={peerId}
          setPeerId={setPeerId}
          connect={connect}
          isSelfConnect={isSelfConnect}
          status={status}
        />
      ) : (
        <ChatScreen
          myId={myId}
          peerId={peerId}
          status={status}
          trust={trust}
          fingerprint={fingerprint}
          ratchetEpoch={ratchetEpoch}
          messages={messages}
          input={input}
          setInput={setInput}
          send={send}
          trustIdentity={trustIdentity}
          disconnect={disconnect}
          selectFile={selectFile}
          fileTransfers={fileTransfers}
          acceptFile={acceptFile}
          cancelFile={cancelFile}
        />
      )}
    </>
  );
}
