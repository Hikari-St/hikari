// Hikari Protocol: Cryptographic Merkle Proof of Solvency Engine
// Lead Architect & Maintainer: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>

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
  reserveRatioPercent: number; // e.g. 104.8%
  isFullySolvent: boolean;
  leafCount: number;
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
  private depositors: DepositorLiability[] = [];
  private auditedReservesXlm: number = 508280.0; // 104.8% of 485,000 XLM liabilities
  private verifiedLedger: number = 341890;

  constructor() {
    this.seedDepositorRegistry();
  }

  private hash(data: string): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  private seedDepositorRegistry() {
    this.depositors = [
      { address: "GAKN7F4E5678WXYZ", shares: "142500.00", underlyingValueXlm: 148200.0 },
      { address: "GBZX9K2M1234ABCD", shares: "98240.00", underlyingValueXlm: 102169.6 },
      { address: "GCLP3R8W9876EFGH", shares: "64100.00", underlyingValueXlm: 66664.0 },
      { address: "GDTV1B7C5432IJKL", shares: "42800.00", underlyingValueXlm: 44512.0 },
      { address: "GEFM5N0Q1122MNOP", shares: "29450.00", underlyingValueXlm: 30628.0 },
      { address: "GFRT8H3S3344QRST", shares: "21500.00", underlyingValueXlm: 22360.0 },
      { address: "GGHY2U9L5566UVWX", shares: "18900.00", underlyingValueXlm: 19656.0 },
      { address: "GHJK6P4X7788YZAB", shares: "15200.00", underlyingValueXlm: 15808.0 },
      { address: "GIBO1V7L9900CDEF", shares: "52310.00", underlyingValueXlm: 35002.4 }, // Maintainer test account
    ];
  }

  public getLeafHash(depositor: DepositorLiability): string {
    return this.hash(`${depositor.address}:${depositor.shares}:${depositor.underlyingValueXlm}`);
  }

  public computeMerkleTree(): { root: string; leaves: string[]; tree: string[][] } {
    const leaves = this.depositors.map(d => this.getLeafHash(d));
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
    const reserveRatio = (this.auditedReservesXlm / totalLiabilities) * 100;

    return {
      timestamp: new Date().toISOString(),
      verifiedLedger: this.verifiedLedger,
      merkleRoot: root,
      totalLiabilitiesXlm: Math.round(totalLiabilities),
      totalAuditedReservesXlm: this.auditedReservesXlm,
      surplusBufferXlm: Math.round(surplusBuffer),
      reserveRatioPercent: parseFloat(reserveRatio.toFixed(2)),
      isFullySolvent: this.auditedReservesXlm >= totalLiabilities,
      leafCount: leaves.length,
    };
  }

  public getInclusionProof(targetAddress: string): SolvencyInclusionProof | null {
    const depIndex = this.depositors.findIndex(
      d => d.address.toLowerCase() === targetAddress.toLowerCase()
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

if (require.main === module) {
  const engine = new HikariSolvencyEngine();
  const report = engine.generateSolvencyReport();
  console.log("--- SOLVENCY REPORT ---");
  console.log(report);

  const proof = engine.getInclusionProof("GIBO1V7L9900CDEF");
  console.log("\n--- INCLUSION PROOF FOR GIBO... ---");
  console.log(proof);
}

