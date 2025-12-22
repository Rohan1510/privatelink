import { useRef, useEffect, useState } from "react";
import {
  Send,
  Lock,
  Shield,
  Copy,
  CheckCircle,
  Power,
  User,
  MessageSquare,
  Zap,
  AlertTriangle,
  CheckCheck
} from "lucide-react";

export default function IronManUI({
  myId,
  peerId,
  setPeerId,
  status,
  trust,
  fingerprint,
  messages,
  input,
  setInput,
  connect,
  send,
  trustIdentity,
  disconnect
}) {
  const [copiedId, setCopiedId] = useState(false);
  const messagesEndRef = useRef(null);

  const isConnected = status === "secure" || status === "handshaking";
  const isSelfConnect =
    myId && peerId && peerId.trim() === myId.trim();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const copyUserId = () => {
    if (!myId) return;
    navigator.clipboard.writeText(myId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleKeyPress = (e) => {
    if (e.key !== "Enter") return;

    if (status === "secure") {
      send();
      return;
    }

    if (status === "disconnected") {
      if (!peerId || isSelfConnect) return;
      connect();
    }
  };

  /* ===============================
     CONNECTION SCREEN
  =============================== */
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-neutral-900 to-stone-900 text-white font-['Rajdhani'] flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">

          {/* LOGO */}
          <div className="flex justify-center mb-10">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-400 to-red-700 flex items-center justify-center shadow-2xl">
              <Zap className="w-14 h-14 text-amber-200 animate-pulse" />
            </div>
          </div>

          <h1 className="text-5xl font-bold text-center mb-3 bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent font-['Orbitron']">
            STARK SECURE CHAT
          </h1>
          <p className="text-center text-amber-300/60 mb-10">
            End-to-End Encrypted · Zero Trust
          </p>

          <div className="bg-zinc-900/80 rounded-2xl border border-amber-500/30 p-8 shadow-xl">

            {/* YOUR ID */}
            <label className="text-amber-400 text-sm uppercase tracking-wider">
              Your Secure ID
            </label>
            <div className="mt-2 mb-6 flex gap-3">
              <div className="flex-1 bg-black/60 border border-amber-500/40 rounded-xl p-4 font-mono text-amber-300 break-all">
                {myId || "Initializing…"}
              </div>
              {myId && (
                <button
                  onClick={copyUserId}
                  className="px-6 py-4 bg-amber-600 rounded-xl font-semibold flex items-center gap-2"
                >
                  {copiedId ? <CheckCircle /> : <Copy />}
                  {copiedId ? "COPIED" : "COPY"}
                </button>
              )}
            </div>

            <div className="my-8 text-center text-amber-400/50 tracking-wider">
              CONNECT TO PARTNER
            </div>

            {/* PARTNER ID */}
            <label className="text-amber-400 text-sm uppercase tracking-wider">
              Partner ID
            </label>
            <input
              value={peerId}
              onChange={(e) => setPeerId(e.target.value.trim())}
              onKeyPress={handleKeyPress}
              placeholder="ENTER PARTNER ID"
              className={`w-full mt-2 px-4 py-4 rounded-xl font-mono bg-black/60
                ${
                  isSelfConnect
                    ? "border border-red-500/60 text-red-300"
                    : "border border-amber-500/40 text-amber-200"
                }`}
            />

            {/* SELF-CONNECT WARNING */}
            {isSelfConnect && (
              <div className="mt-3 mb-4 text-sm text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                You cannot connect to your own Secure ID
              </div>
            )}

            {/* CONNECT BUTTON */}
            <button
              onClick={() => {
                if (isSelfConnect) return;
                connect();
              }}
              disabled={!peerId || !myId || isSelfConnect}
              className={`w-full py-5 mt-2 rounded-xl font-bold tracking-wider transition
                ${
                  isSelfConnect
                    ? "bg-zinc-700 text-red-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-red-600 to-red-800"
                }`}
            >
              {isSelfConnect
                ? "CANNOT CONNECT TO YOURSELF"
                : "INITIATE SECURE CONNECTION"}
            </button>

            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200/70">
              ECDH P-256 key exchange · AES-256-GCM session encryption
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===============================
     CHAT SCREEN
  =============================== */
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-neutral-900 to-stone-900 text-white font-['Rajdhani'] flex flex-col">

      {/* HEADER */}
      <div className="p-6 border-b border-amber-500/30 flex justify-between items-center bg-zinc-900/90">
        <div>
          <h2 className="text-xl font-bold font-['Orbitron'] text-amber-300">
            STARK SECURE CHAT
          </h2>
          <p className="text-sm text-amber-200/50">
            Connected to {peerId?.slice(0, 12)}…
          </p>
        </div>

        <div className="flex gap-3">
          <div className="px-4 py-2 bg-amber-500/20 border border-amber-500/40 rounded-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400 animate-pulse" />
            <span className="text-xs font-bold">ENCRYPTED</span>
          </div>

          <button
            onClick={disconnect}
            className="px-4 py-2 bg-red-700 rounded-lg flex items-center gap-2"
          >
            <Power className="w-4 h-4" />
            DISCONNECT
          </button>
        </div>
      </div>

      {/* TRUST BANNER */}
      {status === "secure" && trust !== "verified" && (
        <div className={`m-4 p-4 rounded-lg border flex justify-between items-center
          ${
            trust === "changed"
              ? "bg-red-500/10 border-red-500/40"
              : "bg-yellow-500/10 border-yellow-500/40"
          }`}>
          <div className="flex gap-3 items-center">
            <AlertTriangle />
            <div>
              <p className="font-semibold">
                {trust === "changed"
                  ? "Identity changed — possible attack"
                  : "Identity not verified"}
              </p>
              {fingerprint && (
                <p className="text-xs font-mono text-amber-300">
                  {fingerprint}
                </p>
              )}
            </div>
          </div>

          {trust === "unverified" && (
            <button
              onClick={trustIdentity}
              className="px-4 py-2 bg-amber-600 rounded-lg font-semibold"
            >
              TRUST
            </button>
          )}
        </div>
      )}

      {trust === "verified" && (
        <div className="m-4 p-4 rounded-lg border bg-green-500/10 border-green-500/40 flex gap-3 items-center">
          <CheckCheck className="text-green-400" />
          <div>
            <p className="font-semibold text-green-300">
              Identity verified
            </p>
            <p className="text-xs font-mono text-amber-200/60">
              {fingerprint}
            </p>
          </div>
        </div>
      )}

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xl p-4 rounded-2xl ${
                m.from === "me"
                  ? "bg-amber-600 text-black rounded-br-sm"
                  : "bg-zinc-800 text-amber-100 rounded-bl-sm"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <div className="p-6 border-t border-amber-500/30 bg-zinc-900/90">
        <div className="flex gap-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              status === "handshaking"
                ? "Establishing secure channel…"
                : "Type encrypted message…"
            }
            disabled={status !== "secure"}
            className="flex-1 px-6 py-4 bg-black/60 border border-amber-500/40 rounded-xl text-amber-200"
          />
          <button
            onClick={send}
            disabled={!input || status !== "secure"}
            className="px-8 py-4 bg-gradient-to-r from-red-600 to-red-800 rounded-xl font-bold disabled:opacity-40"
          >
            SEND
          </button>
        </div>

        <div className="mt-3 flex justify-between text-xs text-amber-400/60">
          <span>ECDH P-256 + AES-256-GCM</span>
          <span>
            <MessageSquare className="inline w-4 h-4 mr-1" />
            Secure tunnel active
          </span>
        </div>
      </div>
    </div>
  );
}
