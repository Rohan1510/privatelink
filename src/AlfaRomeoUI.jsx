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
  Paperclip,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { parseInvitePayload } from "./friendsStore";

/* ─────────────────────────────────────────────
   ALFA ROMEO MOTORSPORT TELEMETRY EMBLEM
───────────────────────────────────────────── */
function AlfaEmblem({ size = 72 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <polygon
        points="36,4 68,36 36,68 4,36"
        fill="var(--canvas-deep)"
        stroke="var(--brand)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polygon
        points="36,14 58,36 36,58 14,36"
        fill="var(--canvas-dark)"
        stroke="var(--hairline)"
        strokeWidth="0.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <line x1="36" y1="20" x2="36" y2="52" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="36" x2="52" y2="36" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="36" cy="36" r="3" fill="var(--brand)" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   CONNECT SCREEN (CHARCOAL CANVAS & SHARP GEOMETRY)
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
    <div className="connect-wrapper">
      <div className="bg-grid-overlay" />

      <div className="connect-panel">
        {/* TOP BAR: THEME SWITCHER */}
        <div className="flex justify-end w-full mb-3">
          <ThemeToggle showLabel />
        </div>

        {/* BRAND HEADER */}
        <div className="brand-header">
          <AlfaEmblem size={76} />
          <h1 className="brand-title">QUADRIFOGLIO TELEMETRY</h1>
          <p className="brand-subtitle">
            P2P SECURE MESH · DOUBLE RATCHET (PFS) · MOTORSPORT CADENCE
          </p>
          {user && (
            <div className="badge badge-accent mt-3">
              <span>{user?.signInDetails?.loginId || user?.username || "Authenticated Operator"}</span>
              {onSignOut && (
                <button onClick={onSignOut} className="btn-ghost btn-sm ml-2" title="Sign out of AWS Cognito">
                  <LogOut size={11} /> EXIT
                </button>
              )}
            </div>
          )}
        </div>

        {/* INCOMING INVITE NOTIFICATION BANNER */}
        {inboundInvite && (
          <div className="inbound-invite-banner slide-down">
            <div className="inbound-invite-top">
              <UserPlus size={16} className="text-brand" style={{ color: "var(--brand)" }} />
              <span className="inbound-invite-title">INCOMING ALLY REQUEST</span>
            </div>
            <p className="inbound-invite-text">
              <strong>{inboundInvite.displayName}</strong> ({inboundInvite.email || "No email"}) sent you a permanent encrypted contact card.
            </p>
            <div className="inbound-invite-fp">
              <Fingerprint size={12} /> PINNED FP: {inboundInvite.fingerprint.slice(0, 19)}…
            </div>
            <div className="inbound-invite-actions">
              <button className="btn-accent btn-sm" onClick={() => onAcceptInvite(inboundInvite)}>
                <Check size={13} /> Accept & Pin Ally
              </button>
              <button className="btn-ghost btn-sm" onClick={onDismissInvite}>
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* TAB CONTROLS */}
        <div className="connect-tabs-row">
          <button
            className={`connect-tab-btn ${activeTab === "allies" ? "connect-tab-active" : ""}`}
            onClick={() => setActiveTab("allies")}
          >
            <Users size={14} />
            REGISTERED ALLIES [{friends.length}]
          </button>
          <button
            className={`connect-tab-btn ${activeTab === "direct" ? "connect-tab-active" : ""}`}
            onClick={() => setActiveTab("direct")}
          >
            <Lock size={14} />
            DIRECT PEER ID
          </button>
        </div>

        {/* ================= TAB 1: PERMANENT ALLIES ================= */}
        {activeTab === "allies" && (
          <div key="allies" className="allies-tab-content tab-pane-enter">
            {/* MY PERMANENT ENDPOINT & INVITE LINK */}
            <div className="my-ally-card">
              <div className="my-ally-header">
                <span className="label-caps" style={{ color: "var(--canvas-light)" }}>YOUR PERMANENT TELEMETRY ID</span>
                <div className="my-ally-badge">
                  <span className="dot-live" /> ACTIVE ENDPOINT
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

              <div className="flex gap-2">
                <button
                  onClick={copyMyInvite}
                  className="btn-accent btn-sm flex-1"
                  disabled={!myInvite}
                >
                  {copiedInvite ? <Check size={13} /> : <Share2 size={13} />}
                  {copiedInvite ? "Invite Copied!" : "Share Invite Link"}
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
              <form onSubmit={handleManualAddFriend} className="add-ally-panel slide-down">
                <label className="label-caps mb-2 block">Paste Contact Invite Link or Base64 Token</label>
                <div className="add-ally-row">
                  <input
                    className="field add-ally-input"
                    value={inviteInput}
                    onChange={(e) => setInviteInput(e.target.value)}
                    placeholder="https://...#invite=eyNpZ... or raw token"
                  />
                  <button type="submit" className="btn-accent btn-sm">
                    <UserPlus size={13} /> Add
                  </button>
                </div>
                {addError && <div className="error-alert mt-2"><AlertTriangle size={12} /> {addError}</div>}
                {addSuccess && <div className="success-alert mt-2"><CheckCircle size={12} /> {addSuccess}</div>}
              </form>
            )}

            {/* ALLIES LIST */}
            <div className="allies-list-container">
              <div className="flex justify-between items-center mb-3">
                <span className="label-caps" style={{ color: "var(--ink-muted)" }}>ENCRYPTED ROSTER</span>
                <span className="caption">{friends.length} / 100 ALLIES</span>
              </div>

              {friends.length === 0 ? (
                <div className="allies-empty-state">
                  <Users size={28} className="mx-auto mb-2 opacity-40 text-brand" style={{ color: "var(--hairline)" }} />
                  <div className="allies-empty-title">NO PINNED ALLIES IN ROSTER</div>
                  <p className="allies-empty-desc">
                    Click <strong>"Share Invite Link"</strong> above to dispatch your cryptographic contact card to partners.
                  </p>
                </div>
              ) : (
                <div className="allies-grid">
                  {friends.map((friend) => (
                    <div key={friend.id} className="ally-item">
                      <div className="ally-avatar">
                        {friend.displayName ? friend.displayName.slice(0, 2).toUpperCase() : "AR"}
                      </div>
                      <div className="ally-meta">
                        <div className="ally-name-row">
                          <span className="ally-name">{friend.displayName}</span>
                          <span className="ally-pinned-badge">
                            <Shield size={9} /> PINNED
                          </span>
                        </div>
                        <div className="ally-email">{friend.email || friend.id}</div>
                        <div className="ally-fp">
                          <Fingerprint size={10} /> {friend.fingerprint.slice(0, 19)}…
                        </div>
                      </div>

                      <div className="ally-item-actions">
                        <button
                          className="btn-accent btn-sm ally-connect-btn"
                          onClick={() => {
                            setPeerId(friend.id);
                            connect(friend.id);
                          }}
                          disabled={isConnecting}
                          title="Connect to Ally"
                        >
                          <Zap size={12} />
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
          <div key="direct" className="direct-tab-content tab-pane-enter">
            <label className="label-caps mb-2 block">YOUR ACTIVE TELEMETRY PEER ID</label>
            <div className="id-box-row">
              <div className="id-display-box">
                {myId ? myId : <span className="shimmer-text">Initializing Endpoint…</span>}
              </div>
              <button onClick={copyMyId} className="btn-ghost copy-btn" disabled={!myId}>
                {copiedId ? <CheckCircle size={14} /> : <Copy size={14} />}
                {copiedId ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="form-divider">
              <div className="divider-line" />
              <span className="divider-text">MANUAL PEER LINK</span>
              <div className="divider-line" />
            </div>

            <label className="label-caps mb-2 block">REMOTE PEER ENDPOINT</label>
            <input
              className={`field ${isSelfConnect ? "field-error" : ""}`}
              value={peerId}
              onChange={(e) => setPeerId(e.target.value.trim())}
              onKeyPress={(e) => e.key === "Enter" && canConnect && connect()}
              placeholder="Paste remote peer identifier…"
              disabled={isConnecting}
            />

            {isSelfConnect && (
              <div className="error-alert mt-2">
                <AlertTriangle size={13} /> Cannot connect to your own endpoint
              </div>
            )}

            <button
              className="btn-accent w-full mt-4"
              onClick={() => canConnect && connect()}
              disabled={!canConnect}
            >
              <Lock size={15} />
              {isSelfConnect
                ? "INVALID TARGET"
                : isConnecting
                ? "LINKING TELEMETRY…"
                : "INITIATE TELEMETRY SESSION"}
              {canConnect && <ChevronRight size={15} />}
            </button>
          </div>
        )}

        {/* SECURITY FOOTER NOTE */}
        <div className="mt-6 pt-4 border-t border-hairline flex items-center gap-3" style={{ borderColor: "var(--hairline-light)" }}>
          <Shield size={14} style={{ color: "var(--brand)" }} className="flex-shrink-0" />
          <span className="caption" style={{ color: "var(--ink-muted)", fontSize: "11px", lineHeight: "1.5" }}>
            Double Ratchet protocol (AES-256-GCM + ECDH P-256). Verified fingerprints for registered allies are permanently pinned.
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CHAT SCREEN (TELEMETRY HUD & SHARP 0PX CADENCE)
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
    <div className="chat-wrapper">
      <div className="bg-grid-overlay" />

      {/* HEADER */}
      <header className="chat-header">
        <div className="header-brand">
          <AlfaEmblem size={34} />
          <div>
            <div className="header-title">QUADRIFOGLIO TELEMETRY</div>
            <div className="header-peer-id">
              {activeAlly ? (
                <span className="inline-flex items-center gap-2">
                  <Shield size={11} style={{ color: "var(--brand)" }} />
                  <strong>ALLY:</strong> {activeAlly.displayName}
                </span>
              ) : (
                <span>{peerId?.slice(0, 16)}…</span>
              )}
            </div>
          </div>
        </div>

        <div className="header-actions">
          <ThemeToggle />
          {isSecure && (
            <>
              <span className="badge badge-accent">
                <Zap size={12} />
                DOUBLE RATCHET
              </span>
              <span className="badge badge-success">
                <span className="dot-live" />
                EPOCH {ratchetEpoch}
              </span>
            </>
          )}
          {isHandshaking && (
            <span className="badge badge-warn">
              <Zap size={12} />
              HANDSHAKING…
            </span>
          )}
          <button className="btn-danger btn-sm" onClick={disconnect}>
            <Power size={12} /> DISCONNECT
          </button>
          {onSignOut && (
            <button className="btn-ghost btn-sm" onClick={onSignOut} title="Sign Out of AWS Cognito">
              <LogOut size={12} /> EXIT
            </button>
          )}
        </div>
      </header>

      {/* TRUST BANNER */}
      {trust !== "verified" && status !== "handshaking" && (
        <div className="trust-banner-container">
          <div
            className={`trust-banner slide-down ${
              trust === "changed" ? "trust-banner-danger" : "trust-banner-warn"
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={16}
                style={{ color: trust === "changed" ? "var(--error)" : "var(--warn)", flexShrink: 0, marginTop: "2px" }}
              />
              <div>
                <div className="trust-banner-title">
                  {trust === "changed"
                    ? "Identity Changed — Potential MITM Alert"
                    : "Peer Identity Unverified"}
                </div>
                <div className="caption" style={{ color: "var(--ink-muted)" }}>
                  {trust === "changed"
                    ? "Remote key fingerprint differs from previously pinned trust record. Verification required."
                    : "Mutual ECDSA verification complete. Confirm fingerprint to permanently pin identity."}
                </div>
              </div>
            </div>
            <button className="btn-accent btn-sm" onClick={trustIdentity}>
              <CheckCheck size={13} /> Trust Identity
            </button>
          </div>
        </div>
      )}

      {/* FINGERPRINT STATUS STRIP */}
      <div className="px-6 py-2 bg-canvas-deep border-b border-hairline flex items-center gap-3" style={{ background: "var(--canvas-deep)", borderColor: "var(--hairline-light)" }}>
        <Fingerprint size={12} style={{ color: "var(--brand)" }} />
        <span className="label-caps" style={{ color: "var(--brand)" }}>FINGERPRINT:</span>
        <span className="caption font-mono" style={{ color: "var(--canvas-light)", letterSpacing: "1px" }}>
          {fingerprint || "CALCULATING…"}
        </span>
      </div>

      {/* MESSAGE STREAM */}
      <div className="chat-messages-scroll">
        {messages.length === 0 ? (
          <div className="empty-chat-state">
            <MessageSquare size={36} style={{ color: "var(--hairline)" }} />
            <div className="empty-chat-text">ENCRYPTED CHANNEL SECURED</div>
            <div className="caption text-center" style={{ maxWidth: "420px" }}>
              Messages and files stream with zero-knowledge Double Ratchet cryptography and single-use session keys.
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`message-row ${m.from === "me" ? "message-row-me" : "message-row-peer"}`}
            >
              <div className={m.from === "me" ? "bubble-me" : "bubble-peer"}>
                <div className="message-text">{m.text}</div>
                <div className={`message-meta ${m.from === "me" ? "message-meta-me" : "message-meta-peer"}`}>
                  <span className="timestamp-tag">{m.time}</span>
                  {m.from === "me" && (
                    <CheckCheck size={11} style={{ color: "var(--brand)" }} />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* ACTIVE FILE TRANSFERS */}
      {fileTransfers && fileTransfers.length > 0 && (
        <div className="px-6 py-3 border-t border-hairline" style={{ background: "var(--canvas-dark)", borderColor: "var(--hairline)" }}>
          <div className="label-caps mb-2" style={{ color: "var(--ink-muted)" }}>TELEMETRY FILE STREAM</div>
          <div className="file-transfers-grid">
            {fileTransfers.map((ft) => (
              <div key={ft.transferId} className="file-transfer-item flex flex-col items-stretch gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Paperclip size={13} style={{ color: "var(--brand)" }} />
                    <span className="transfer-filename">{ft.name}</span>
                    <span className="caption font-medium" style={{ color: "var(--brand)" }}>
                      {ft.status} ({Math.round(ft.progress || 0)}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {ft.status === "offered" && ft.direction === "in" && (
                      <button className="btn-accent btn-sm" onClick={() => acceptFile(ft.transferId)}>
                        Save
                      </button>
                    )}
                    {(ft.status === "transferring" || ft.status === "offered") && (
                      <button className="btn-ghost btn-sm" onClick={() => cancelFile(ft.transferId)}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--canvas-deep)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round(ft.progress || 0)}%`,
                      background: "linear-gradient(90deg, var(--brand), var(--brand-hover))",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CHAT INPUT BAR */}
      <form
        className="chat-input-bar"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim() && isSecure) {
            send();
          }
        }}
      >
        <div className="input-controls-row">
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
            className="btn-ghost p-3"
            onClick={() => fileInputRef.current?.click()}
            title="Send Encrypted Binary File"
            disabled={!isSecure}
          >
            <Paperclip size={16} />
          </button>
          <div className="input-field-wrapper">
            <input
              className="field chat-input-field"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isSecure ? "Type encrypted message…" : "Waiting for secure telemetry link…"}
              disabled={!isSecure}
            />
            <div className="input-lock-icon">
              <Lock size={14} className={isSecure ? "lock-accent" : "lock-muted"} />
            </div>
          </div>
          <button
            type="submit"
            className="btn-accent p-3"
            disabled={!isSecure || !input.trim()}
            title="Dispatch Message"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="input-bar-footer">
          <span className="crypto-tag">AES-256-GCM · DOUBLE RATCHET PFS</span>
          <span className="crypto-tag" style={{ color: "var(--brand)" }}>
            {isSecure ? "LINK SECURED" : "STANDBY"}
          </span>
        </div>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROOT UI COMPONENT EXPORT
───────────────────────────────────────────── */
export default function AlfaRomeoUI({
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
