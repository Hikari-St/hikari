# Hikari Protocol — Intent API Specification

> **Non-Custodial Yield and Staking Intent Primitives on Stellar Protocol 27 (Soroban)**
> Defines the signed intent envelope, canonical hashing, replay prevention, and execution mechanics for staking, rebalancing, and unbonding.

---

## 1. Overview

An **intent** is a user-signed, cryptographically verifiable statement of execution:
> *"Deposit 500 XLM into Hikari Protocol, mint hXLM at an exchange rate $\ge 0.985$, before 2026-09-14T12:00Z."*

Users never hand over private keys or custody. They sign an immutable intent payload via Freighter or Lobstr. The solver or keeper verifies the signature, asserts the deadline and price bounds, and executes the transaction atomically on Soroban.

---

## 2. Intent Schemas

### 2.1 Staking Intent (`StakeIntent`)

| Field | Type | Description |
| ----- | ---- | ----------- |
| `asset` | `string` | Asset code (`XLM`, `USDC`, `EURC`). |
| `amount` | `string` | Decimal amount with $\le 7$ decimal places. |
| `minSharesOut` | `string` | Minimum acceptable `hXLM` receipt shares. |
| `recipient` | `string` | Stellar public key (`G...`, 56 chars). |
| `deadline` | `number` | Unix timestamp in milliseconds after which intent is void. |
| `nonce` | `string` | 32-byte cryptographic random hex string. |

### 2.2 Unbonding Intent (`UnbondIntent`)

| Field | Type | Description |
| ----- | ---- | ----------- |
| `sharesIn` | `string` | Amount of `hXLM` to burn. |
| `exitRoute` | `string` | `QUEUE` (0% fee, 1–3 days) or `DEX_SWAP` (instant). |
| `minAssetsOut`| `string` | Minimum acceptable native XLM payout. |
| `recipient` | `string` | Stellar public key (`G...`, 56 chars). |
| `deadline` | `number` | Expiration timestamp in milliseconds. |
| `nonce` | `string` | Cryptographic random hex string. |

---

## 3. Signed Envelope (`SignedIntentEnvelope`)

To guarantee wire integrity and non-repudiation, intents are wrapped in a signed envelope:

```jsonc
{
  "intent": {
    "asset": "XLM",
    "amount": "500",
    "minSharesOut": "492.5",
    "recipient": "GB7T3PZCHBOMWGJRKZZWWNSUKQLHGOHY7L443QG5P",
    "deadline": 1789400000000,
    "nonce": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  "canonicalHash": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "signature": "base64EncodedEd25519SignatureFromFreighter==",
  "publicKey": "GB7T3PZCHBOMWGJRKZZWWNSUKQLHGOHY7L443QG5P"
}
```

### Signature Generation & Verification Steps
1. **Canonicalize**: Sort JSON keys deterministically (RFC-8785 canonical JSON).
2. **Hash**: Compute `SHA-256` of canonical UTF-8 bytes $\to$ `canonicalHash`.
3. **Sign**: Pass hash to Freighter wallet for Ed25519 signature $\to$ `signature`.
4. **On-Chain Assertion**: Soroban contract asserts `verify_ed25519(publicKey, hash, signature)` and checks that `current_ledger_time < deadline`.

---

## 4. Replay Protection

To prevent replay attacks:
- Each intent hash is written to the on-chain replay registry `used_intents` mapping.
- Once executed, the hash is permanently marked as spent. Subsequent submissions with the same hash immediately revert.

---

## 5. API Endpoints

### Submit Intent
```bash
POST /api/intent/execute
Content-Type: application/json

{
  "intent": { ... },
  "canonicalHash": "4f53...",
  "signature": "...",
  "publicKey": "GB7T..."
}
```

**Response**:
```json
{
  "success": true,
  "transactionHash": "b65736293df0b915037d45f3ef...",
  "sharesMinted": "495.12 hXLM",
  "status": "SETTLED"
}
```
