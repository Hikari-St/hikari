# Hikari Protocol — Contributor Ladder

> **Governance, Role Definitions & Contributor Progression Framework**
> Outlines the formal progression from first pull request to core maintainer. Roles are earned through sustained, high-quality technical contributions.

---

## 1. Contributor Rungs

### Contributor
Anyone who opens a PR or contributes documentation/code.
- **Starting Point**: Pick an issue tagged [`good-first-issue`](https://github.com/ibochivincent-lang/hikari/labels/good-first-issue).
- **Requirements**: Conventional Commits, local tests green (`scripts/verify_ui.js`, `npm run test:sdk`), PR template fully completed.

### Triager
Trusted community member responsible for reviewing, labeling, and routing new issues.
- **Criteria**: ~5 merged PRs, active participation in discussions, clear understanding of protocol scopes.
- **Privileges**: Issue labeling, closing duplicates, triage permissions; credited in release notes.

### Reviewer
Domain expert trusted to review code and approve PRs in specific subsystems.
- **Criteria**: ~15 merged PRs, deep expertise in at least one area (Soroban Rust contracts, TypeScript SDK, risk engine, or UI).
- **Privileges**: PR review and approval authority; listed in `CODEOWNERS` for their module.

### Core Maintainer
Trusted steward with repository write and release management authority.
- **Criteria**: Substantial ongoing ownership of a core subsystem, impeccable security hygiene, and trust of current maintainers.
- **Privileges**: Merge rights, npm publish permissions, release tagging, and roadmap stewardship.

---

## 2. Promotion & Consensus

Promotions are proposed by existing maintainers and confirmed via consensus in GitHub Discussions. Inactive maintainers may transition to alumni status after 6 months of inactivity and re-activate upon resuming contributions.

---

## 3. Related Documents

- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — Contribution guidelines
- [`CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md) — Code of conduct
