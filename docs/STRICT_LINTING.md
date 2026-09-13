# Hikari Protocol — Strict Linting & CI Quality Gates

> **Code Quality Philosophy, TypeScript Flags, and Automated Verification Gates**
> Enforces zero-warning linting, Conventional Commits, invariant verification, and multi-layer CI.

---

## 1. Quality Philosophy

1. **Keystroke Over Review**: Catching bugs at write-time through TypeScript strictness and local pre-commit hooks is exponentially cheaper than discovering bugs during manual review or post-deployment.
2. **Zero-Warning Policy**: Lint warnings are treated as build errors in CI. Unused variables, unresolved promises, and implicit `any` types block merge.
3. **Formal Invariant Gates**: Mathematical invariants ($R_t \ge S_t \times P_t$, 15% reserve floor) are checked on every commit via automated unit and fuzz testing.

---

## 2. CI Verification Pipeline

Every Pull Request must pass the following gates:

| Gate | Verification Command | Purpose |
| ---- | -------------------- | ------- |
| **Commitlint** | `.github/workflows/commitlint.yml` | Validates Conventional Commits `<type>(<scope>): <subject>`. |
| **PR Title** | `.github/workflows/pr-title.yml` | Enforces conventional semantic title formatting. |
| **UI Assertions** | `node scripts/verify_ui.js` | Validates 38 landing & DApp workspace structural assertions. |
| **SDK Unit Tests** | `npm run test:sdk` | Asserts NAV math, virtual shares, and deposit transaction builders. |
| **Policy & Risk Engine** | `npm run test:engine` | Asserts drawdown triggers, Bunker Mode, and GateSeal pause mechanics. |
| **Backend Security** | `node scripts/verify_backend_security.js` | Asserts anti-mixup address isolation, challenge nonces, and audit log. |
| **Security Scanning** | `.github/workflows/codeql.yml` | CodeQL static security analysis for JavaScript & TypeScript. |

---

## 3. Local Pre-Commit Verification

Before pushing to git, run:
```bash
node scripts/verify_ui.js
npm run test:sdk
npm run test:engine
node scripts/verify_backend_security.js
```
All commands must exit with code `0`.
