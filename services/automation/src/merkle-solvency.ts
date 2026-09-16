// Hikari Protocol: Cryptographic Merkle Proof of Solvency Engine
// Lead Architect & Maintainer: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
//
// This engine builds a real SHA-256 Merkle tree over whatever depositor data it is given — the
// cryptography is genuine. What it does NOT do is invent that data. A previous version shipped
// a hardcoded list of 9 fake depositors (using addresses shorter than a real Stellar strkey) and
// a reserve constant deliberately chosen to print "104.8% over-collateralized" — that produced a
// real Merkle proof over fabricated numbers, which is worse than an obviously-fake stat because
// it *looks* verified. Callers now MUST supply real on-chain-sourced reserves/ledger; there is no
// seeded fallback data.

import crypto from "crypto";

export interface DepositorLiability {
  address: string;
  shares: string;
  underlyingValueXlm: number;
}

export interface SolvencyReport {
  timestamp: string;
  verifiedLedger: number;
  merkleRoot: string;
  totalLiabilitiesXlm: number;
  totalAuditedReservesXlm: number;
  surplusBufferXlm: number;
  reserveRatioPercent: number | null; // null when there are no tracked liabilities yet
  isFullySolvent: boolean;
  leafCount: number;
  depositorRegistryStatus: "REAL" | "EMPTY_NOT_YET_TRACKED";
}

export interface SolvencyInclusionProof {
  address: string;
  shares: string;
  underlyingValueXlm: number;
  leafHash: string;
  merkleRoot: string;
  proof: Array<{ position: "left" | "right"; hash: string }>;
  isVerified: boolean;
}

export class HikariSolvencyEngine {
  private depositors: DepositorLiability[];
  private auditedReservesXlm: number;
  private verifiedLedger: number;

  /**
   * @param auditedReservesXlm Real on-chain vault reserves (e.g. from total_assets()). Required —
   *        no fabricated default.
   * @param verifiedLedger Real current Horizon/Soroban ledger sequence. Required.
   * @param depositors Real registered depositor liabilities, if any are tracked yet. Defaults to
   *        empty — this protocol does not yet maintain a real per-depositor liability registry,
   *        and an empty list is the honest representation of that, not a fabricated one.
   */
  constructor(auditedReservesXlm: number, verifiedLedger: number, depositors: DepositorLiability[] = []) {
    this.auditedReservesXlm = auditedReservesXlm;
    this.verifiedLedger = verifiedLedger;
    this.depositors = depositors;
  }

  private hash(data: string): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  public getLeafHash(depositor: DepositorLiability): string {
    return this.hash(`${depositor.address}:${depositor.shares}:${depositor.underlyingValueXlm}`);
  }

  public computeMerkleTree(): { root: string; leaves: string[]; tree: string[][] } {
    const leaves = this.depositors.map((d) => this.getLeafHash(d));
    let currentLevel = [...leaves];
    const tree: string[][] = [currentLevel];

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        nextLevel.push(this.hash(left + right));
      }
      currentLevel = nextLevel;
      tree.push(currentLevel);
    }

    const root = currentLevel[0] || this.hash("EMPTY_TREE");
    return { root, leaves, tree };
  }

  public generateSolvencyReport(): SolvencyReport {
    const { root, leaves } = this.computeMerkleTree();
    const totalLiabilities = this.depositors.reduce((sum, d) => sum + d.underlyingValueXlm, 0);
    const surplusBuffer = this.auditedReservesXlm - totalLiabilities;
    const reserveRatio = totalLiabilities > 0 ? (this.auditedReservesXlm / totalLiabilities) * 100 : null;

    return {
      timestamp: new Date().toISOString(),
      verifiedLedger: this.verifiedLedger,
      merkleRoot: root,
      totalLiabilitiesXlm: Math.round(totalLiabilities),
      totalAuditedReservesXlm: this.auditedReservesXlm,
      surplusBufferXlm: Math.round(surplusBuffer),
      reserveRatioPercent: reserveRatio !== null ? parseFloat(reserveRatio.toFixed(2)) : null,
      isFullySolvent: this.auditedReservesXlm >= totalLiabilities,
      leafCount: leaves.length,
      depositorRegistryStatus: this.depositors.length > 0 ? "REAL" : "EMPTY_NOT_YET_TRACKED",
    };
  }

  public getInclusionProof(targetAddress: string): SolvencyInclusionProof | null {
    const depIndex = this.depositors.findIndex(
      (d) => d.address.toLowerCase() === targetAddress.toLowerCase()
    );
    if (depIndex === -1) return null;

    const depositor = this.depositors[depIndex];
    const { root, tree } = this.computeMerkleTree();
    const proof: Array<{ position: "left" | "right"; hash: string }> = [];

    let currentIndex = depIndex;
    for (let level = 0; level < tree.length - 1; level++) {
      const currentLevel = tree[level];
      const isRight = currentIndex % 2 === 1;
      const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;

      if (siblingIndex < currentLevel.length) {
        proof.push({
          position: isRight ? "left" : "right",
          hash: currentLevel[siblingIndex],
        });
      } else {
        proof.push({
          position: "right",
          hash: currentLevel[currentIndex],
        });
      }
      currentIndex = Math.floor(currentIndex / 2);
    }

    const leafHash = this.getLeafHash(depositor);
    const isVerified = this.verifyInclusion(leafHash, proof, root);

    return {
      address: depositor.address,
      shares: depositor.shares,
      underlyingValueXlm: depositor.underlyingValueXlm,
      leafHash,
      merkleRoot: root,
      proof,
      isVerified,
    };
  }

  public verifyInclusion(
    leafHash: string,
    proof: Array<{ position: "left" | "right"; hash: string }>,
    expectedRoot: string
  ): boolean {
    let currentHash = leafHash;
    for (const step of proof) {
      if (step.position === "left") {
        currentHash = this.hash(step.hash + currentHash);
      } else {
        currentHash = this.hash(currentHash + step.hash);
      }
    }
    return currentHash === expectedRoot;
  }
}

// Backwards-compatibility alias
export const HakiruSolvencyEngine = HikariSolvencyEngine;
export type HakiruSolvencyEngine = HikariSolvencyEngine;
