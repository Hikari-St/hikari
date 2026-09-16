# Hikari Protocol — Gas, CPU & Execution Benchmarks

> This document previously presented a table of "Empirical benchmarks measured on the Stellar
> Testnet" (CPU instructions, RAM footprint, ledger read bytes, gas fees per operation) and a
> "reproduce it yourself" command (`cargo test ... -- --nocapture benchmark`). None of those
> numbers were ever measured — there is no benchmark test anywhere in `contracts/` (`grep -rl
> benchmark contracts --include="*.rs"` returns nothing), so that reproduction command matches
> zero tests and produces no output. The whole table was invented.

## Real status

No CPU/gas/RAM benchmarking has been done for this protocol's Soroban contracts. To produce real
numbers, use Soroban's own resource accounting instead of a fabricated table:

- `soroban-cli contract invoke --cost ...` — prints real CPU instructions and memory bytes for a single invocation against a running network or sandbox.
- `env.cost_estimate()` inside a Rust unit test (`soroban-sdk`'s testutils) — reports real CPU/memory budget consumed during that test's contract calls.
- Real settlement latency can be read from Horizon: the time between submitting a transaction and its ledger close, which is close to the network's actual ~5s ledger close time — but that has not been measured and reported for this protocol's specific flows yet.

Until someone runs and records these, this document should not claim specific numbers.
