// frontend/public/passkey.js
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
// WebAuthn passkey registration/assertion helper for Hikari Protocol.
//
// Status: NOT wired into the wallet-connect flow or into transaction signing (see app.js —
// the "Passkey" wallet option is intentionally disabled as unsupported). Deriving a real
// on-chain Stellar smart-account address from a WebAuthn credential requires the deployed
// PolicyAccount contract's actual derivation logic, which is not implemented here — this
// class no longer fabricates a fake CAPXDOM... address or a random "success" signature to
// stand in for that. If a WebAuthn call fails or is unsupported, methods below report that
// honestly instead of simulating success.

class PasskeySmartAccount {
  constructor() {
    this.storageKey = "hikari_passkey_credential";
  }

  isWebAuthnSupported() {
    return (
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
    );
  }

  async registerPasskey(username = "hikari-user") {
    if (!this.isWebAuthnSupported()) {
      return { success: false, reason: "WebAuthn is not supported in this browser/device." };
    }

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Hikari Protocol", id: window.location.hostname || "localhost" },
          user: { id: userId, name: `${username}@hikari.finance`, displayName: username },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" }, // ES256 (P-256)
            { alg: -257, type: "public-key" }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "preferred",
            residentKey: "preferred",
          },
          timeout: 60000,
          attestation: "none",
        },
      });

      if (!credential) {
        return { success: false, reason: "Passkey creation cancelled or rejected by user." };
      }

      // NOTE: credential.id is a real WebAuthn credential id. It is NOT a Stellar contract
      // address — no on-chain smart-account derivation is implemented yet.
      const session = {
        success: true,
        credentialId: credential.id,
        type: "WebAuthn / Platform Passkey",
        createdAt: Date.now(),
        onChainAddress: null, // intentionally unset — not implemented
      };

      localStorage.setItem(this.storageKey, JSON.stringify(session));
      return session;
    } catch (err) {
      return { success: false, reason: err.message || String(err) };
    }
  }

  async loginPasskey() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) return JSON.parse(saved);
    return this.registerPasskey("hikari-user");
  }

  async signAssertion() {
    if (!this.isWebAuthnSupported() || !localStorage.getItem(this.storageKey)) {
      return { success: false, reason: "No registered passkey or WebAuthn unsupported." };
    }
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const assertion = await navigator.credentials.get({
        publicKey: { challenge, timeout: 60000, userVerification: "preferred" },
      });

      if (!assertion) {
        return { success: false, reason: "Assertion cancelled or rejected by user." };
      }

      const authData = new Uint8Array(assertion.response.authenticatorData);
      const sig = new Uint8Array(assertion.response.signature);
      return {
        success: true,
        authDataHex: Array.from(authData).map((b) => b.toString(16).padStart(2, "0")).join(""),
        signatureHex: Array.from(sig).map((b) => b.toString(16).padStart(2, "0")).join(""),
      };
    } catch (err) {
      return { success: false, reason: err.message || String(err) };
    }
  }
}

window.PasskeySmartAccount = PasskeySmartAccount;
