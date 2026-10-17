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
  ChevronRight,
  LogOut
} from "lucide-react";

/* ─────────────────────────────────────────────
   ICON LOGO (hexagonal mark)
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
function ConnectScreen({ myId, peerId, setPeerId, connect, isSelfConnect, status, user, onSignOut }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!myId) return;
    navigator.clipboard.writeText(myId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isConnecting = status === "connecting";
  const canConnect = peerId && myId && !isSelfConnect && !isConnecting;

  return (
    <div className="noise connect-wrapper">
      <div className="bg-grid-overlay" />

      <div className="connect-card-container">
        <div className="brand-header">
          <HexLogo size={88} />
          <h1 className="brand-title">STARK SECURE</h1>
          <p className="brand-subtitle">
            End-to-End · Double Ratchet (PFS) · ECDH P-256
          </p>
          {user && (
            <div className="auth-status-pill">
              <span className="auth-user-email">
                {user?.signInDetails?.loginId || user?.username || "Authenticated"}
              </span>
              {onSignOut && (
                <button onClick={onSignOut} className="btn-ghost btn-signout" title="Sign out of AWS Cognito">
                  <LogOut size={12} /> Sign Out
                </button>
              )}
            </div>
          )}
        </div>

        <div className="panel scanline connect-panel">
          <label className="form-label">
            Your Secure ID
          </label>
          <div className="id-box-row">
            <div className="id-display-box">
              {myId ? myId : <span className="shimmer-text">Initializing…</span>}
            </div>
            <button onClick={copy} className="btn-ghost copy-btn" disabled={!myId}>
              {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="form-divider">
            <div className="divider-line" />
            <span className="divider-text">Connect</span>
            <div className="divider-line" />
          </div>

          <label className="form-label">
            Partner ID
          </label>
          <input
            className={`field ${isSelfConnect ? "field-error" : ""}`}
            value={peerId}
            onChange={(e) => setPeerId(e.target.value.trim())}
            onKeyPress={(e) => e.key === "Enter" && canConnect && connect()}
            placeholder="Paste peer identifier…"
            disabled={isConnecting}
          />

          {isSelfConnect && (
            <div className="error-alert">
              <AlertTriangle size={13} /> Cannot connect to your own ID
            </div>
          )}

          <button
            className="btn-primary connect-submit-btn"
            onClick={() => canConnect && connect()}
            disabled={!canConnect}
          >
            <Lock size={15} />
            {isSelfConnect
              ? "Invalid target"
              : isConnecting
              ? "Connecting…"
              : "Initiate Secure Session"}
            {canConnect && <ChevronRight size={15} />}
          </button>

          <div className="security-note">
            <Shield size={13} className="security-note-icon" />
            <span className="security-note-text">
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
  user,
  onSignOut,
}) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isSecure = status === "secure";
  const isHandshaking = status === "handshaking";

  return (
    <div className="noise chat-wrapper">
      <div className="bg-grid-overlay" />

      {/* HEADER */}
      <header className="chat-header">
        <div className="header-brand">
          <HexLogo size={36} />
          <div>
            <div className="header-title">STARK SECURE</div>
            <div className="header-peer-id">
              {peerId?.slice(0, 14)}…
            </div>
          </div>
        </div>

        <div className="header-actions">
          {isSecure && (
            <>
              <span className="badge badge-accent">
                <Zap size={12} />
                Double Ratchet
              </span>
              <span className="badge badge-success">
                <div className="dot-live" />
                PFS Active (Epoch {ratchetEpoch})
              </span>
            </>
          )}
          {isHandshaking && (
            <span className="badge badge-warn">
              <Zap size={12} className="blink" />
              Handshaking
            </span>
          )}
          <button className="btn-danger" onClick={disconnect}>
            <Power size={13} /> Disconnect
          </button>
          {onSignOut && (
            <button className="btn-ghost btn-sm" onClick={onSignOut} title="Sign Out of AWS Cognito">
              <LogOut size={13} /> Sign Out
            </button>
          )}
        </div>
      </header>

      {/* TRUST BANNER */}
      {trust !== "verified" && status !== "handshaking" && (
        <div className="trust-banner-container">
          <div
            className={`trust-banner fade-in ${
              trust === "changed" ? "trust-banner-danger" : "trust-banner-warn"
            }`}
          >
            <div className="trust-banner-content">
              <AlertTriangle
                size={15}
                className={trust === "changed" ? "text-danger" : "text-warn"}
              />
              <div>
                <div className="trust-banner-title">
                  {trust === "changed"
                    ? "Identity Changed — Possible MITM Attack"
                    : "Peer Identity Unverified"}
                </div>
                {fingerprint && (
                  <div className="trust-fingerprint">
                    Canonical FP: {fingerprint}
                  </div>
                )}
              </div>
            </div>
            {trust === "unverified" && (
              <button className="btn-ghost trust-confirm-btn" onClick={trustIdentity}>
                <Fingerprint size={13} /> Confirm & Trust Fingerprint
              </button>
            )}
          </div>
        </div>
      )}

      {trust === "verified" && (
        <div className="trust-banner-container">
          <div className="trust-banner-verified fade-in">
            <CheckCheck size={15} className="text-success flex-shrink-0" />
            <div>
              <div className="verified-title">Identity Trusted Locally</div>
              <div className="trust-fingerprint">Canonical FP: {fingerprint}</div>
            </div>
          </div>
        </div>
      )}

      {/* MESSAGES LIST */}
      <div className="chat-messages-scroll">
        {messages.length === 0 && (
          <div className="empty-chat-state">
            <Lock size={28} />
            <p className="empty-chat-text">
              {isHandshaking ? "Establishing ratchet session…" : "No messages yet. Say hello."}
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`message-row ${m.from === "me" ? "message-row-me" : "message-row-peer"}`}
          >
            <div className={m.from === "me" ? "bubble-me" : "bubble-peer"}>
              <p
                className={`message-text ${
                  m.from === "me" ? "message-text-me" : "message-text-peer"
                }`}
              >
                {m.text}
              </p>
              <p
                className={`message-meta ${
                  m.from === "me" ? "message-meta-me" : "message-meta-peer"
                }`}
              >
                {m.from === "me" ? "You" : "Peer"} · ratcheted
              </p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* INPUT BAR */}
      <div className="chat-input-bar">
        <div className="input-controls-row">
          <div className="input-field-wrapper">
            <input
              className="field chat-input-field"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && isSecure && input && send()}
              placeholder={
                isHandshaking
                  ? "Establishing ratchet session…"
                  : isSecure
                  ? "Encrypted ratchet message…"
                  : "Verify identity above to enable chat…"
              }
              disabled={!isSecure}
            />
            <Lock
              size={13}
              className={`input-lock-icon ${isSecure ? "lock-accent" : "lock-muted"}`}
            />
          </div>
          <button
            className="btn-primary send-btn"
            onClick={send}
            disabled={!input || !isSecure}
          >
            <Send size={15} />
            Send
          </button>
          <label className={`btn-ghost file-btn ${isSecure ? "file-btn-active" : "file-btn-disabled"}`}>
            File
            <input
              type="file"
              hidden
              disabled={!isSecure}
              onChange={(event) => {
                selectFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
        </div>

        {fileTransfers.length > 0 && (
          <div className="file-transfers-grid">
            {fileTransfers.map((transfer) => (
              <div key={transfer.transferId} className="file-transfer-item">
                <span className="transfer-filename">{transfer.name}</span>
                <span>{transfer.status} {transfer.progress ? `${transfer.progress}%` : ""}</span>
                {transfer.status === "offered" && (
                  <button className="btn-ghost btn-sm" onClick={() => acceptFile(transfer.transferId)}>
                    Accept
                  </button>
                )}
                {transfer.status === "received" && transfer.downloadUrl && (
                  <a className="btn-ghost btn-sm" href={transfer.downloadUrl} download={transfer.name}>
                    Save
                  </a>
                )}
                {!["sent", "received", "failed", "cancelled"].includes(transfer.status) && (
                  <button className="btn-ghost btn-sm" onClick={() => cancelFile(transfer.transferId)}>
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="input-bar-footer">
          <span className="crypto-tag">
            DOUBLE RATCHET · HKDF-SHA256 · AES-256-GCM
          </span>
          <span className="badge badge-subtle">
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
  user,
  onSignOut,
}) {
  const isConnected =
    status === "secure" || status === "handshaking" || status === "verification_required";
  const isSelfConnect = Boolean(myId && peerId && peerId.trim() === myId.trim());

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
          user={user}
          onSignOut={onSignOut}
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
          user={user}
          onSignOut={onSignOut}
        />
      )}
    </>
  );
}
