/* ========================================================================= */
/* === PEERJS SIGNALING & NETWORK CONFIGURATION ============================ */
/* ========================================================================= */

const TURN_URL = import.meta.env.VITE_TURN_URL;
const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME;
const TURN_CREDENTIAL = import.meta.env.VITE_TURN_CREDENTIAL;

const hasRelayConfiguration = Boolean(TURN_URL && TURN_USERNAME && TURN_CREDENTIAL);

if (import.meta.env.PROD && !hasRelayConfiguration) {
  console.warn("[PeerConfig] VITE_TURN_URL environment variables not configured. Falling back to Google STUN servers.");
}

export const PEER_CONFIG = {
  debug: 0,
  host: "0.peerjs.com",
  port: 443,
  secure: true,
  config: {
    iceTransportPolicy: hasRelayConfiguration ? "relay" : "all",
    iceServers: hasRelayConfiguration
      ? [
          {
            urls: TURN_URL,
            username: TURN_USERNAME,
            credential: TURN_CREDENTIAL,
          },
        ]
      : [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" }
        ],
    sdpSemantics: "unified-plan"
  }
};
