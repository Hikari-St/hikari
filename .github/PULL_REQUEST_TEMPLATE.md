<!--
Thanks for opening a PR on Hikari Protocol!

Before you submit:
  • Conventional Commits title — the PR title is linted (feat / fix / docs /
    refactor / test / chore / ci / perf / build / style / revert, with an
    optional scope and a short description).
  • One logical change per PR. If you have an unrelated cleanup, split it.
  • Fill in every section below. Delete none of them — leave "N/A" if a
    section genuinely doesn't apply and say *why*.
-->

## Summary

<!--
One or two sentences on what changed and why. Lead with the why.
-->

## Linked issue

<!--
Every PR should link an issue. Use a closing keyword (Closes / Fixes /
Resolves #123) so the issue auto-closes on merge.
-->

Closes #

## Changes

<!--
A tight bullet list of the material changes. Reference files with backticks.
Example:
  - `contracts/hikari_core/src/lib.rs` — enforce minimum 15% liquid reserve ratio
  - `sdk/src/client.ts` — add previewUnbondingCooldown helper
  - `frontend/public/app.html` — place Withdrawals FAQ underneath the functional card
-->

- 
- 
- 

## Invariant and Security Impact

<!--
Does this change alter:
  - hXLM exchange rate / NAV calculation?
  - Unbonding queue settlement order?
  - Strategy adapter allocations (Blend, Phoenix, Soroswap)?
  - Emergency circuit breakers (Safety Sentinel)?
  If YES, describe the mathematical proof and test coverage added.
  If NO, state "No invariant impact".
-->

- 

## Testing notes

<!--
What you ran locally, what tests were added, and how a reviewer can reproduce:
  - `node scripts/verify_ui.js`
  - `npm run test:sdk`
  - `npm run test:engine`
  - `node scripts/verify_backend_security.js`
-->

```bash
node scripts/verify_ui.js
npm run test:sdk
npm run test:engine
```

## Checklist

- [ ] My code follows the code style and Conventional Commits spec.
- [ ] I have run local verification suites and all assertions pass.
- [ ] I have updated relevant documentation in `docs/` if architectural changes were made.
- [ ] No extraneous dependencies or un-scoped changes are bundled.
