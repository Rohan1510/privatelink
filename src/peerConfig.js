/* ========================================================================= */
/* === PEERJS SIGNALING & NETWORK CONFIGURATION ============================ */
/* ========================================================================= */

const TURN_URL = import.meta.env.VITE_TURN_URL;
const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME;
const TURN_CREDENTIAL = import.meta.env.VITE_TURN_CREDENTIAL;

const hasRelayConfiguration = Boolean(TURN_URL && TURN_USERNAME && TURN_CREDENTIAL);

if (import.meta.env.PROD && !hasRelayConfiguration) {
  throw new Error("Production requires VITE_TURN_URL, VITE_TURN_USERNAME, and VITE_TURN_CREDENTIAL to prevent direct peer IP exposure.");
}

export const PEER_CONFIG = {
  debug: 0,
  host: "0.peerjs.com",
  port: 443,
  secure: true,
  config: {
    // Relay-only candidates prevent the remote peer from learning a direct
    // host or server-reflexive IP address. Use short-lived TURN credentials.
    iceTransportPolicy: hasRelayConfiguration ? "relay" : "all",
    iceServers: hasRelayConfiguration ? [{
      urls: TURN_URL,
      username: TURN_USERNAME,
      credential: TURN_CREDENTIAL,
    }] : [],
    sdpSemantics: "unified-plan"
  }
};
