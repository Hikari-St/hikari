import test from "node:test";
import assert from "node:assert";
import { DeterministicPolicyEngine, RebalanceProposal } from "../policy_engine.js";

const VAULT_ADDR = "CCR6NFKICAK4KW2SVKU4UESG5SR6RMYRVUDDO6K7BB6NUWYSMGQS5KT5";
const BLEND_STRATEGY = "CDLG3GFOQ6WFVTFXQCW3ZSJMMMXIEQVEGZKMERS4ITBDZOHKXPRB5EAL";
const PHOENIX_STRATEGY = "CAD345D2TCMIQEHSVVJMXOKMNGVVLW6YS7VBFSYXCRPALCOCDNA6O6L5";
const SOROSWAP_STRATEGY = "CDPZLNOKPV4KMJ5RNT24RKK46BFEIJGTKRDZGVKOMZFSIKZQ6H5G5KJ3";

const allowlist = [
  "idle",
  VAULT_ADDR,
  BLEND_STRATEGY,
  PHOENIX_STRATEGY,
  SOROSWAP_STRATEGY,
];

test("DeterministicPolicyEngine validates compliant rebalance proposal", () => {
  const engine = new DeterministicPolicyEngine(allowlist);

  const currentAllocations = new Map<string, number>([
    ["idle", 2000], // 20%
    [BLEND_STRATEGY, 5000], // 50%
    [PHOENIX_STRATEGY, 3000], // 30%
  ]);

  const proposal: RebalanceProposal = {
    vaultAddress: VAULT_ADDR,
    allocations: new Map<string, number>([
      ["idle", 1500], // 15% (shift: -500 bps <= 1500 limit)
      [BLEND_STRATEGY, 5500], // 55% (shift: +500 bps <= 1500 limit)
      [PHOENIX_STRATEGY, 3000], // 30% (shift: 0)
    ]),
    estimatedSlippageBps: 25, // 0.25% <= 50 bps limit
  };

  const valid = engine.validateProposal(currentAllocations, proposal);
  assert.strictEqual(valid, true);
});

test("DeterministicPolicyEngine rejects unallowlisted strategy", () => {
  const engine = new DeterministicPolicyEngine(allowlist);

  const currentAllocations = new Map<string, number>([
    ["idle", 2000],
    [BLEND_STRATEGY, 8000],
  ]);

  const proposal: RebalanceProposal = {
    vaultAddress: VAULT_ADDR,
    allocations: new Map<string, number>([
      ["idle", 2000],
      ["MALICIOUS_STRATEGY_ADDRESS", 8000],
    ]),
    estimatedSlippageBps: 20,
  };

  assert.throws(
    () => engine.validateProposal(currentAllocations, proposal),
    /Security Exception: Strategy MALICIOUS_STRATEGY_ADDRESS is not allowlisted!/
  );
});

test("DeterministicPolicyEngine rejects excessive slippage exceeding 50 bps", () => {
  const engine = new DeterministicPolicyEngine(allowlist);

  const currentAllocations = new Map<string, number>([
    ["idle", 2000],
    [BLEND_STRATEGY, 8000],
  ]);

  const proposal: RebalanceProposal = {
    vaultAddress: VAULT_ADDR,
    allocations: new Map<string, number>([
      ["idle", 2000],
      [BLEND_STRATEGY, 8000],
    ]),
    estimatedSlippageBps: 75, // 75 bps > 50 bps limit
  };

  assert.throws(
    () => engine.validateProposal(currentAllocations, proposal),
    /Risk Violation: Slippage 75 bps exceeds max limit/
  );
});

test("DeterministicPolicyEngine rejects velocity shift exceeding 1500 bps", () => {
  const engine = new DeterministicPolicyEngine(allowlist);

  const currentAllocations = new Map<string, number>([
    ["idle", 2000],
    [BLEND_STRATEGY, 5000],
    [PHOENIX_STRATEGY, 3000],
  ]);

  // Attempting to shift Blend by 2000 bps (5000 -> 7000)
  const proposal: RebalanceProposal = {
    vaultAddress: VAULT_ADDR,
    allocations: new Map<string, number>([
      ["idle", 1000],
      [BLEND_STRATEGY, 7000],
      [PHOENIX_STRATEGY, 2000],
    ]),
    estimatedSlippageBps: 30,
  };

  assert.throws(
    () => engine.validateProposal(currentAllocations, proposal),
    /Velocity Violation: Shift in .* of 2000 bps exceeds 15% limit/
  );
});

test("DeterministicPolicyEngine rejects breach of minimum 10% idle buffer", () => {
  const engine = new DeterministicPolicyEngine(allowlist);

  const currentAllocations = new Map<string, number>([
    ["idle", 1500],
    [BLEND_STRATEGY, 8500],
  ]);

  // Idle dropped to 500 bps (5% < 10% limit)
  const proposal: RebalanceProposal = {
    vaultAddress: VAULT_ADDR,
    allocations: new Map<string, number>([
      ["idle", 500],
      [BLEND_STRATEGY, 9500],
    ]),
    estimatedSlippageBps: 20,
  };

  assert.throws(
    () => engine.validateProposal(currentAllocations, proposal),
    /Liquidity Violation: Idle cash buffer 500 bps is below minimum 1000 bps/
  );
});

test("DeterministicPolicyEngine rejects allocations that do not sum to 10000 bps", () => {
  const engine = new DeterministicPolicyEngine(allowlist);

  const currentAllocations = new Map<string, number>([
    ["idle", 2000],
    [BLEND_STRATEGY, 8000],
  ]);

  const proposal: RebalanceProposal = {
    vaultAddress: VAULT_ADDR,
    allocations: new Map<string, number>([
      ["idle", 2000],
      [BLEND_STRATEGY, 7500], // Sum = 9500 bps
    ]),
    estimatedSlippageBps: 20,
  };

  assert.throws(
    () => engine.validateProposal(currentAllocations, proposal),
    /Math Error: Allocations must sum to 10000 bps \(got 9500\)/
  );
});
