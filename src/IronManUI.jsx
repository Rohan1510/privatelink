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
  LogOut,
  Users,
  UserPlus,
  Trash2,
  Share2,
  Check,
  Plus,
  Sparkles,
} from "lucide-react";
import { parseInvitePayload } from "./friendsStore";

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
   CONNECTION SCREEN WITH PERMANENT ALLIES
───────────────────────────────────────────── */
function ConnectScreen({
  myId,
  peerId,
  setPeerId,
  connect,
  isSelfConnect,
  status,
  user,
  onSignOut,
  friends = [],
  onAddFriend,
  onRemoveFriend,
  myInvite,
  inboundInvite,
  onAcceptInvite,
  onDismissInvite,
}) {
  const [activeTab, setActiveTab] = useState(friends.length > 0 ? "allies" : "allies");
  const [copiedId, setCopiedId] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");

  const copyMyId = () => {
    if (!myId) return;
    navigator.clipboard.writeText(myId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const copyMyInvite = () => {
    if (!myInvite?.url && !myInvite?.token) return;
    const textToCopy = myInvite.url || myInvite.token;
    navigator.clipboard.writeText(textToCopy);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleManualAddFriend = (e) => {
    e.preventDefault();
    setAddError("");
    setAddSuccess("");

    if (!inviteInput.trim()) {
      setAddError("Please paste an ally invite link or token.");
      return;
    }

    const parsed = parseInvitePayload(inviteInput.trim());
    if (!parsed) {
      setAddError("Invalid invite format. Please check the invite link or token.");
      return;
    }

    if (parsed.id === myId) {
      setAddError("You cannot add yourself as an ally.");
      return;
    }

    const saved = onAddFriend(parsed);
    if (saved) {
      setAddSuccess(`Added ally: ${parsed.displayName}`);
      setInviteInput("");
      setTimeout(() => {
        setShowAddModal(false);
        setAddSuccess("");
      }, 1500);
    } else {
      setAddError("Failed to save ally. Please check contact details.");
    }
  };

  const isConnecting = status === "connecting";
  const canConnect = peerId && myId && !isSelfConnect && !isConnecting;

  return (
    <div className="noise connect-wrapper">
      <div className="bg-grid-overlay" />

      <div className="connect-card-container">
        {/* BRAND HEADER */}
        <div className="brand-header">
          <HexLogo size={88} />
          <h1 className="brand-title">STARK SECURE</h1>
          <p className="brand-subtitle">
            End-to-End · Double Ratchet (PFS) · Permanent Allies
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

        {/* INCOMING INVITE NOTIFICATION BANNER */}
        {inboundInvite && (
          <div className="inbound-invite-banner fade-in">
            <div className="inbound-invite-top">
              <UserPlus size={16} className="text-accent" />
              <span className="inbound-invite-title">INCOMING ALLY REQUEST</span>
            </div>
            <p className="inbound-invite-text">
              <strong>{inboundInvite.displayName}</strong> ({inboundInvite.email || "No email"}) sent you a permanent encrypted link.
            </p>
            <div className="inbound-invite-fp">
              <Fingerprint size={12} /> PINNED: {inboundInvite.fingerprint.slice(0, 19)}…
            </div>
            <div className="inbound-invite-actions">
              <button className="btn-primary btn-sm" onClick={() => onAcceptInvite(inboundInvite)}>
                <Check size={13} /> Accept & Add Ally
              </button>
              <button className="btn-ghost btn-sm" onClick={onDismissInvite}>
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* MAIN PANEL */}
        <div className="panel scanline connect-panel">
          {/* TAB CONTROLS */}
          <div className="connect-tabs-row">
            <button
              className={`connect-tab-btn ${activeTab === "allies" ? "connect-tab-active" : ""}`}
              onClick={() => setActiveTab("allies")}
            >
              <Users size={14} />
              Permanent Allies
              <span className="badge-pill">{friends.length}</span>
            </button>
            <button
              className={`connect-tab-btn ${activeTab === "direct" ? "connect-tab-active" : ""}`}
              onClick={() => setActiveTab("direct")}
            >
              <Lock size={14} />
              Direct Peer ID
            </button>
          </div>

          {/* ================= TAB 1: PERMANENT ALLIES ================= */}
          {activeTab === "allies" && (
            <div className="allies-tab-content fade-in">
              {/* MY PERMANENT ENDPOINT & INVITE LINK */}
              <div className="my-ally-card">
                <div className="my-ally-header">
                  <span className="form-label" style={{ margin: 0 }}>Your Permanent Stark ID</span>
                  <div className="my-ally-badge">
                    <Sparkles size={11} /> Active Identity
                  </div>
                </div>

                <div className="id-box-row" style={{ marginBottom: "12px" }}>
                  <div className="id-display-box">
                    {myId ? myId : <span className="shimmer-text">Initializing Identity…</span>}
                  </div>
                  <button onClick={copyMyId} className="btn-ghost copy-btn" disabled={!myId} title="Copy Peer ID">
                    {copiedId ? <CheckCircle size={14} /> : <Copy size={14} />}
                    {copiedId ? "Copied" : "Copy"}
                  </button>
                </div>

                <div className="invite-actions-row">
                  <button
                    onClick={copyMyInvite}
                    className="btn-primary btn-sm invite-share-btn"
                    disabled={!myInvite}
                  >
                    {copiedInvite ? <Check size={13} /> : <Share2 size={13} />}
                    {copiedInvite ? "Invite Link Copied!" : "Copy Shareable Invite Link"}
                  </button>
                  <button
                    onClick={() => setShowAddModal(!showAddModal)}
                    className="btn-ghost btn-sm"
                  >
                    <Plus size={13} />
                    {showAddModal ? "Cancel" : "Add Ally"}
                  </button>
                </div>
              </div>

              {/* INLINE ADD ALLY MODAL */}
              {showAddModal && (
                <form onSubmit={handleManualAddFriend} className="add-ally-panel fade-in">
                  <label className="form-label">Paste Friend Invite Link or Token</label>
                  <div className="add-ally-row">
                    <input
                      className="field add-ally-input"
                      value={inviteInput}
                      onChange={(e) => setInviteInput(e.target.value)}
                      placeholder="https://...#invite=eyNpZ... or paste token"
                    />
                    <button type="submit" className="btn-primary btn-sm">
                      <UserPlus size={13} /> Add
                    </button>
                  </div>
                  {addError && <div className="error-alert mt-2"><AlertTriangle size={12} /> {addError}</div>}
                  {addSuccess && <div className="success-alert mt-2"><CheckCircle size={12} /> {addSuccess}</div>}
                </form>
              )}

              {/* ALLIES LIST */}
              <div className="allies-list-container">
                <div className="allies-list-header">
                  <span className="form-label" style={{ margin: 0 }}>Registered Encrypted Contacts</span>
                  <span className="allies-count">{friends.length} / 100</span>
                </div>

                {friends.length === 0 ? (
                  <div className="allies-empty-state">
                    <Users size={32} className="allies-empty-icon" />
                    <div className="allies-empty-title">NO SAVED ALLIES YET</div>
                    <p className="allies-empty-desc">
                      Click <strong>"Copy Shareable Invite Link"</strong> above and send it to your partner. When they open it, you will be permanently linked with zero manual fingerprint checks.
                    </p>
                  </div>
                ) : (
                  <div className="allies-grid">
                    {friends.map((friend) => (
                      <div key={friend.id} className="ally-item">
                        <div className="ally-avatar">
                          {friend.displayName ? friend.displayName.slice(0, 2).toUpperCase() : "PL"}
                        </div>
                        <div className="ally-meta">
                          <div className="ally-name-row">
                            <span className="ally-name">{friend.displayName}</span>
                            <span className="ally-pinned-badge">
                              <Shield size={10} /> PINNED
                            </span>
                          </div>
                          <div className="ally-email">{friend.email || friend.id}</div>
                          <div className="ally-fp">
                            <Fingerprint size={10} /> {friend.fingerprint.slice(0, 19)}…
                          </div>
                        </div>

                        <div className="ally-item-actions">
                          <button
                            className="btn-primary btn-sm ally-connect-btn"
                            onClick={() => {
                              setPeerId(friend.id);
                              connect(friend.id);
                            }}
                            disabled={isConnecting}
                            title="Connect to Ally"
                          >
                            <Zap size={13} />
                            {isConnecting && peerId === friend.id ? "Linking…" : "Connect"}
                          </button>
                          <button
                            className="btn-icon-danger"
                            onClick={() => onRemoveFriend(friend.id)}
                            title="Remove Ally"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 2: DIRECT PEER ID ================= */}
          {activeTab === "direct" && (
            <div className="direct-tab-content fade-in">
              <label className="form-label">Your Current Peer ID</label>
              <div className="id-box-row">
                <div className="id-display-box">
                  {myId ? myId : <span className="shimmer-text">Initializing…</span>}
                </div>
                <button onClick={copyMyId} className="btn-ghost copy-btn" disabled={!myId}>
                  {copiedId ? <CheckCircle size={14} /> : <Copy size={14} />}
                  {copiedId ? "Copied" : "Copy"}
                </button>
              </div>

              <div className="form-divider">
                <div className="divider-line" />
                <span className="divider-text">Connect Directly</span>
                <div className="divider-line" />
              </div>

              <label className="form-label">Partner Peer ID</label>
              <input
                className={`field ${isSelfConnect ? "field-error" : ""}`}
                value={peerId}
                onChange={(e) => setPeerId(e.target.value.trim())}
                onKeyPress={(e) => e.key === "Enter" && canConnect && connect()}
                placeholder="Paste partner's peer identifier…"
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
            </div>
          )}

          {/* SECURITY FOOTER NOTE */}
          <div className="security-note">
            <Shield size={13} className="security-note-icon" />
            <span className="security-note-text">
              Double Ratchet E2EE protocol. Fingerprints for registered allies are automatically verified and pinned.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CHAT SCREEN WITH ALLY AWARENESS
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
  friends = [],
  onAddFriend,
}) {
  const endRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isSecure = status === "secure";
  const isHandshaking = status === "handshaking";

  // Check if connected peer is in our allies list
  const activeAlly = friends.find((f) => f.id === peerId);

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
              {activeAlly ? (
                <span className="ally-header-badge">
                  <Shield size={11} className="text-accent" />
                  <strong>ALLY:</strong> {activeAlly.displayName}
                </span>
              ) : (
                <span>{peerId?.slice(0, 16)}…</span>
              )}
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
                <div className="trust-banner-desc">
                  {trust === "changed"
                    ? "Remote key fingerprint differs from previously pinned trust record. Verification required."
                    : "Mutual ECDSA verification complete. Confirm out-of-band to permanently pin identity."}
                </div>
              </div>
            </div>
            <button className="btn-primary btn-sm" onClick={trustIdentity}>
              <CheckCheck size={13} /> Trust Identity
            </button>
          </div>
        </div>
      )}

      {/* FINGERPRINT STATUS BAR */}
      <div className="fingerprint-bar">
        <Fingerprint size={12} />
        <span>FINGERPRINT:</span>
        <span className="fingerprint-value">{fingerprint || "CALCULATING…"}</span>
      </div>

      {/* MESSAGE STREAM */}
      <div className="message-container">
        {messages.length === 0 ? (
          <div className="empty-chat-state">
            <MessageSquare size={36} className="empty-chat-icon" />
            <div className="empty-chat-title">E2EE CHANNEL ESTABLISHED</div>
            <div className="empty-chat-subtitle">
              Messages are encrypted client-side with AES-256-GCM and single-use ratchet keys.
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`message-row ${m.from === "me" ? "message-me" : "message-them"}`}
            >
              <div className="message-bubble">
                <div className="message-text">{m.text}</div>
                <div className="message-meta">
                  <span className="message-time">{m.time}</span>
                  {m.from === "me" && (
                    <span className="message-checks">
                      <CheckCheck size={11} className="text-accent" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* ACTIVE FILE TRANSFERS DRAWER */}
      {fileTransfers && fileTransfers.length > 0 && (
        <div className="file-transfers-drawer">
          {fileTransfers.map((ft) => (
            <div key={ft.transferId} className="file-transfer-card">
              <div className="file-transfer-info">
                <span className="file-transfer-name">{ft.name}</span>
                <span className="file-transfer-status">{ft.status} ({Math.round(ft.progress || 0)}%)</span>
              </div>
              <div className="file-transfer-progress-bar">
                <div
                  className="file-transfer-progress-fill"
                  style={{ width: `${Math.round(ft.progress || 0)}%` }}
                />
              </div>
              <div className="file-transfer-actions">
                {ft.status === "offered" && ft.direction === "in" && (
                  <button className="btn-primary btn-sm" onClick={() => acceptFile(ft.transferId)}>
                    Save to Disk
                  </button>
                )}
                {(ft.status === "transferring" || ft.status === "offered") && (
                  <button className="btn-ghost btn-sm" onClick={() => cancelFile(ft.transferId)}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CHAT INPUT FORM */}
      <form
        className="chat-input-bar"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim() && isSecure) {
            send();
          }
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              selectFile(file);
              e.target.value = "";
            }
          }}
        />
        <button
          type="button"
          className="btn-ghost chat-attach-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Send Encrypted File"
          disabled={!isSecure}
        >
          📎
        </button>
        <input
          className="field chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isSecure ? "Type encrypted message…" : "Waiting for secure handshake…"}
          disabled={!isSecure}
        />
        <button
          type="submit"
          className="btn-primary chat-send-btn"
          disabled={!isSecure || !input.trim()}
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROOT UI COMPONENT EXPORT
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
  friends = [],
  onAddFriend,
  onRemoveFriend,
  myInvite,
  inboundInvite,
  onAcceptInvite,
  onDismissInvite,
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
          friends={friends}
          onAddFriend={onAddFriend}
          onRemoveFriend={onRemoveFriend}
          myInvite={myInvite}
          inboundInvite={inboundInvite}
          onAcceptInvite={onAcceptInvite}
          onDismissInvite={onDismissInvite}
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
          friends={friends}
          onAddFriend={onAddFriend}
        />
      )}
    </>
  );
}
