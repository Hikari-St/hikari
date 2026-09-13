# Hikari Protocol — Canonical JSON Specification

> **Deterministic JSON Hashing & Serialization (RFC-8785) for Staking & Keeper Intents**
> Ensures cross-platform cryptographic determinism for intent hashing and signature verification on Stellar.

---

## 1. Purpose

Staking, rebalancing, and unbonding intents are hashed and signed over deterministic UTF-8 bytes. Without canonical serialization, differing key orders or whitespace could cause identical intents to produce different hashes, breaking signature validation.

---

## 2. Canonicalization Rules

1. **Ascending Key Sort**: Object keys are sorted lexicographically by Unicode code point at every level of nesting.
2. **Compact Formatting**: Zero whitespace between tokens (`:` and `,`).
3. **Number Formatting**: Floats and integers serialized without leading zeroes or exponent notation. Amounts with decimal fractions formatted as strings (e.g. `"100.5000000"`).
4. **UTF-8 Encoding**: Output is encoded directly to UTF-8 byte arrays before SHA-256 computation.

```typescript
export function canonicalizeJson(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalizeJson).join(',')}]`;
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((k) => `${JSON.stringify(k)}:${canonicalizeJson(obj[k])}`);
  return `{${pairs.join(',')}}`;
}
```

---

## 3. Related Documents

- [`docs/INTENT_API.md`](INTENT_API.md) — Signed intent envelope format
- [`docs/SECURITY.md`](SECURITY.md) — Cryptographic signature verification
