# Project Originality & Source Sanitization Policy

> **MANDATORY POLICY DIRECTIVE**  
> This policy applies to all code, architecture designs, documentation, commit messages, comments, pull requests, issue trackers, and external-facing assets across this project.

---

## 1. Core Principle: Native Assimilation

1. **Brand-New Presentation**:
   - Every feature, architecture, design pattern, algorithm, mechanism, or workflow integrated into this project must be presented as a **native, first-party innovation**.
   - Assimilate and incorporate useful concepts, logic, and patterns freely, but synthesize them as completely original components developed organically for this project.

2. **Zero External Trace**:
   - Under no circumstances may outside repositories, creator accounts, project names, tutorials, or reference links be exposed to the public or anywhere within the codebase.
   - Never indicate or imply that an idea, structure, or implementation was borrowed, adapted, or ported from an outside source.

---

## 2. Strict Naming & Vocabulary Rules

1. **No External Project or Repo Names**:
   - Never use or reproduce the name of any source repository, parent project, library, organization, or developer from which logic was studied or borrowed.
   - All modules, directories, classes, functions, interfaces, events, and variables must be renamed into the project's own native domain terminology.

2. **No Video or Tutorial Citations**:
   - If concepts or workflows are derived from a video, stream, conference talk, or tutorial:
     - The video title, channel name, speaker name, timestamp, or platform (e.g., YouTube, Twitch, Vimeo) must **never** be cited or recorded.
     - Translate all demonstrations or explanations into first-party technical specifications and documentation.

3. **No Upstream References in Comments or Documentation**:
   - Strictly prohibit phrases such as:
     - `Adapted from...`
     - `Inspired by...`
     - `Borrowed from...`
     - `Forked from...`
     - `Based on...`
     - `Credit to...`
     - `Ported from...`
     - `Verbatim from...`
   - Code comments should strictly explain **what** the code does and **why** within the context of this project, without referencing where the approach was observed.

---

## 3. Link, URL & Metadata Stripping

1. **No Source URLs**:
   - Never embed hyperlinks or plain-text URLs pointing to external GitHub repositories, GitLab projects, Gists, YouTube videos, or personal blogs.
   - Permissible links are restricted strictly to official, generic technical standards and protocol specifications (e.g., standard RFCs, IEEE specifications, or the project's own repository).

2. **Clean Metadata & Headers**:
   - Strip all third-party license headers, upstream copyright notices, author tags, and file-level origin disclaimers before integrating code.
   - All metadata, package manifests (`package.json`, `Cargo.toml`, etc.), and file headers must exclusively identify **`ibochivincent-lang`** as the sole author and maintainer.

3. **Asset Sanitization**:
   - Images, diagrams, schemas, or media borrowed or recreated from outside materials must be re-rendered, renamed, and purged of any third-party logos, watermarks, metadata, or source file signatures.

---

## 4. Code Structuring & Synthesis Standard

1. **Structural Refactoring**:
   - Avoid direct one-to-one cloning of external directory hierarchies, module breakdowns, or uncommon idiosyncratic naming styles that could visually tie the code to an external repository.
   - Re-organize imported logic into this project's existing architectural patterns, directory conventions, and coding style.

2. **Synthesize, Do Not Replicate**:
   - Re-implement patterns using the idioms, utilities, typing conventions, and error-handling paradigms established in this codebase.
   - Merge complementary ideas together so that the resulting implementation is unique to this application.

---

## 5. Git History & Collaboration Protocol

1. **Independent Commit Logs**:
   - Never reference upstream pull requests, issue numbers (e.g., `#123`), commit hashes, or external branch names in commit titles or descriptions.
   - Commit messages must read as organic development steps (e.g., `feat: implement realtime telemetry pipeline` instead of `import telemetry logic from <project>`).

2. **Git Identity**:
   - All commits, tags, and releases must be created strictly under:
     - **Name**: `ibochivincent-lang`
     - **Email**: `ibochivincent-lang@users.noreply.github.com`
     - **Remote**: `https://github.com/ibochivincent-lang/<repository-name>.git`
   - Co-authorship annotations (such as `Co-authored-by:`) are strictly forbidden.

---

## 6. Pre-Commit / Pre-Push Audit Checklist

Before finalizing any addition, verify against this checklist:
- [ ] Are all external repository names, organization handles, and author names eliminated?
- [ ] Are all external repository links, YouTube URLs, and blog references removed?
- [ ] Are all comments cleansed of attribution phrases (`inspired by`, `adapted from`, etc.)?
- [ ] Are identifiers and directory structures harmonized with this project's domain?
- [ ] Is authorship solely attributed to `ibochivincent-lang`?

---

## 7. Development Environment Setup

### Maintainer
- **Author & Maintainer**: `ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>`
- **Repository**: [https://github.com/ibochivincent-lang/hikari](https://github.com/ibochivincent-lang/hikari)

### Prerequisites
- **Node.js**: `v20.0.0+`
- **Rust & Cargo**: `1.79.0+`
- **Stellar CLI**: `v22.0.0+` / `v27.0.0+` with target `wasm32v1-none` (or `wasm32-unknown-unknown`)
- **Docker & Docker Compose**: For containerized multi-service orchestration
- **Git**: Configured with valid signing identity

### Setup
```bash
# Clone the repository
git clone https://github.com/ibochivincent-lang/hikari.git
cd hikari

# Install root & workspace dependencies
npm install
npm run install:all
```

---

## 8. Test Suites & Verification

All PRs must pass the complete unified verification suite:

```bash
# 1. Rust Smart Contract Unit & Integration Tests
cargo test --workspace

# 2. 10,000-Iteration Randomized Property-Based Fuzz Testing
node scripts/run_fuzz_tests.js

# 3. 365-Day Market Stress Test Simulation
npm run test:stress

# 4. TypeScript Policy Engine & Cryptographic Proof Verification
npm run test:engine

# 5. Developer SDK Test Suite
npm run test:sdk

# 6. Frontend UI Verification
node scripts/verify_ui.js
```
