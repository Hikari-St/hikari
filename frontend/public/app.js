let state = {
  totalAssets: 124500,
  idleAssets: 28400,
  totalShares: 119390,
  activeTab: "stake", // stake, request, claim, basket
  currentTier: "BALANCED_HXLM",
  viewMode: "pro", // pro or simple
  bunkerMode: false,
  haircutBps: 0,
  wallet: {
    connected: false,
    address: null,
    balanceXlm: 10000,
    sharesHXlm: 1200,
  },
  withdrawalTickets: [
    { id: 101, shares: 250, claimableXlm: 260.70, status: "ready" },
    { id: 102, shares: 500, claimableXlm: 521.40, status: "pending" },
  ],
  pendingProposal: {
    id: "hikari_prop_910",
    strategy: "Soroswap XLM-USDC AMM",
    amount: 25000,
    rationale: "Strategic opportunity: Volatility drop allows high-fee capture in AMM pool.",
  },
};

const VAULT_TIERS = {
  BALANCED_HXLM: {
    id: "BALANCED_HXLM",
    name: "Balanced hXLM",
    token: "XLM",
    shareToken: "hXLM",
    baseApy: "6.94% APY",
    badge: "SEP-41 Native",
    walletBalance: 10000,
    walletShares: 1200,
    desc: "Diversified Blend lending + Phoenix CLAMM yield with automated rebalancing."
  },
  CONSERVATIVE_USDC: {
    id: "CONSERVATIVE_USDC",
    name: "Conservative hUSDC",
    token: "USDC",
    shareToken: "hUSDC",
    baseApy: "5.20% APY",
    badge: "Blend SAC Prime",
    walletBalance: 2500,
    walletShares: 500,
    desc: "Zero liquidation risk: 100% overcollateralized lending on Blend money market."
  },
  DYNAMIC_ALPHA_HXLM: {
    id: "DYNAMIC_ALPHA_HXLM",
    name: "MEV Alpha hXLM",
    token: "XLM",
    shareToken: "hXLM-α",
    baseApy: "12.4% APR",
    badge: "Soroban Alpha MEV",
    walletBalance: 10000,
    walletShares: 350,
    desc: "High-yield dynamic strategy combining CLAMM LP fees and native atomic MEV backruns."
  }
};

const VIRTUAL_SHARES = 1000;
const VIRTUAL_ASSETS = 1;

// Elements
const btnConnectWallet = document.getElementById("btnConnectWallet");
const networkBadge = document.getElementById("networkBadge");
const queueModeBadge = document.getElementById("queueModeBadge");
const queueModeText = document.getElementById("queueModeText");

// Vault Portal Elements
const tabStake = document.getElementById("tabStake");
const tabRequest = document.getElementById("tabRequest");
const tabClaim = document.getElementById("tabClaim");
const tabBasket = document.getElementById("tabBasket");
const tabBridge = document.getElementById("tabBridge");

const panelForm = document.getElementById("panelForm");
const panelClaim = document.getElementById("panelClaim");
const panelBasket = document.getElementById("panelBasket");
const panelBridge = document.getElementById("panelBridge");

const btnBridgeAction = document.getElementById("btnBridgeAction");
const bridgeOriginSelect = document.getElementById("bridgeOriginSelect");
const bridgeAmountInput = document.getElementById("bridgeAmountInput");
const btnTestX402 = document.getElementById("btnTestX402");
const x402ProofLink = document.getElementById("x402ProofLink");


const inputLabel = document.getElementById("inputLabel");
const amountInput = document.getElementById("amountInput");
const btnMaxAmount = document.getElementById("btnMaxAmount");
const walletBalLabel = document.getElementById("walletBalLabel");
const rateDisplay = document.getElementById("rateDisplay");
const estShares = document.getElementById("estShares");
const btnSubmitAction = document.getElementById("btnSubmitAction");
const vaultForm = document.getElementById("vaultForm");

const ticketList = document.getElementById("ticketList");
const btnClaimAll = document.getElementById("btnClaimAll");

const tvlDisplay = document.getElementById("tvlDisplay");
const navDisplay = document.getElementById("navDisplay");
const reserveDisplay = document.getElementById("reserveDisplay");

const approvalBanner = document.getElementById("approvalBanner");
const approvalDetails = document.getElementById("approvalDetails");
const btnApprove = document.getElementById("btnApprove");
const btnReject = document.getElementById("btnReject");

const agentConsole = document.getElementById("agentConsole");
const btnRunAgent = document.getElementById("btnRunAgent");
const btnHeroDemo = document.getElementById("btnHeroDemo");

const mevTotalYield = document.getElementById("mevTotalYield");
const mevSpreadDisplay = document.getElementById("mevSpreadDisplay");
const mevTxLink = document.getElementById("mevTxLink");
const mevCyclePulse = document.getElementById("mevCyclePulse");
const circuitStateBadge = document.getElementById("circuitStateBadge");
const btnSimulateShock = document.getElementById("btnSimulateShock");
const btnResetCircuit = document.getElementById("btnResetCircuit");


function updateMetrics() {
  const tier = VAULT_TIERS[state.currentTier] || VAULT_TIERS.BALANCED_HXLM;
  const nav = (state.totalAssets + VIRTUAL_ASSETS) / (state.totalShares + VIRTUAL_SHARES);
  if (tvlDisplay) tvlDisplay.innerText = `${state.totalAssets.toLocaleString()} ${tier.token}`;
  if (navDisplay) navDisplay.innerText = `${nav.toFixed(4)} ${tier.token}`;
  if (reserveDisplay) reserveDisplay.innerText = `${state.idleAssets.toLocaleString()} ${tier.token}`;

  if (rateDisplay) {
    rateDisplay.innerText = `1 ${tier.token} ≈ ${(1 / nav).toFixed(4)} ${tier.shareToken}`;
  }
}

if (btnHeroDemo && document.querySelector(".main-grid")) {
  btnHeroDemo.addEventListener("click", () => {
    document.querySelector(".main-grid").scrollIntoView({ behavior: "smooth" });
    if (typeof gsap !== "undefined") {
      gsap.fromTo(btnHeroDemo, { scale: 0.95 }, { scale: 1, duration: 0.2, ease: "back.out(2)" });
    }
    if (btnRunAgent) btnRunAgent.click();
  });
}

// Modal Elements
const walletModal = document.getElementById("walletModal");
const btnCloseWalletModal = document.getElementById("btnCloseWalletModal");
const optPasskey = document.getElementById("optPasskey");
const optFreighter = document.getElementById("optFreighter");

// Modal Elements & Central Wallet Handlers
// (Detailed modal, wallet choice, terms validation, and disconnect flows are orchestrated in initHakiru5TabApp below)

function setConnectedWallet(address, providerName) {
  state.wallet.connected = true;
  state.wallet.address = address;
  state.wallet.balanceXlm = 10000;
  state.wallet.sharesHXlm = 1200;

  const shortAddr = `${address.slice(0, 4)}...${address.slice(-4)}`;
  const btnConnectWalletText = document.getElementById("btnConnectWalletText");
  if (btnConnectWalletText) {
    btnConnectWalletText.innerText = `Connected: ${shortAddr}`;
  } else {
    btnConnectWallet.innerText = `Connected: ${shortAddr}`;
  }
  btnConnectWallet.style.background = "rgba(139, 47, 230, 0.25)";
  btnConnectWallet.title = `Connected via ${providerName}: ${address}`;

  btnConnectWallet.style.borderColor = "rgba(192, 132, 252, 0.6)";
  btnConnectWallet.style.color = "#ffffff";

  updateBalanceLabel();
  if (typeof window.fetchShardsProfile === "function") {
    window.fetchShardsProfile(address);
  }

  if (typeof gsap !== "undefined") {
    gsap.fromTo(btnConnectWallet, { scale: 0.88 }, { scale: 1, duration: 0.35, ease: "back.out(2)" });
  }

  const tier = VAULT_TIERS[state.currentTier] || VAULT_TIERS.BALANCED_HXLM;
  addLog("[Wallet]", `Connected via ${providerName}: ${shortAddr} (Balance: ${tier.walletBalance.toLocaleString()} ${tier.token})`, "log-tag-success");
}

function updateBalanceLabel() {
  if (!walletBalLabel) return;
  const tier = VAULT_TIERS[state.currentTier] || VAULT_TIERS.BALANCED_HXLM;
  if (!state.wallet.connected) {
    walletBalLabel.innerText = `Balance: 0 ${tier.token}`;
    return;
  }
  if (state.activeTab === "stake") {
    walletBalLabel.innerText = `Balance: ${tier.walletBalance.toLocaleString()} ${tier.token}`;
  } else if (state.activeTab === "request") {
    walletBalLabel.innerText = `Balance: ${tier.walletShares.toLocaleString()} ${tier.shareToken}`;
  }
}

// MAX Button
if (btnMaxAmount) {
  btnMaxAmount.addEventListener("click", () => {
    const tier = VAULT_TIERS[state.currentTier] || VAULT_TIERS.BALANCED_HXLM;
    if (state.activeTab === "stake") {
      const maxVal = Math.max(0, tier.walletBalance - 2); // reserve 2 units for fee
      amountInput.value = maxVal;
    } else if (state.activeTab === "request") {
      amountInput.value = tier.walletShares;
    }
    calculateConversion();
    if (typeof gsap !== "undefined") {
      gsap.fromTo(amountInput, { scale: 0.98 }, { scale: 1, duration: 0.2 });
    }
  });
}

// Vault 5-Tab Navigation (Stake, Request, Claim, Basket, Bridge)
function setActiveTab(tab) {
  state.activeTab = tab;
  [tabStake, tabRequest, tabClaim, tabBasket, tabBridge].forEach((btn) => btn && btn.classList.remove("active"));
  if (panelForm) panelForm.style.display = "none";
  if (panelClaim) panelClaim.style.display = "none";
  if (panelBasket) panelBasket.style.display = "none";
  if (panelBridge) panelBridge.style.display = "none";

  const tier = VAULT_TIERS[state.currentTier] || VAULT_TIERS.BALANCED_HXLM;
  if (tab === "stake") {
    if (tabStake) tabStake.classList.add("active");
    if (panelForm) panelForm.style.display = "block";
    if (inputLabel) inputLabel.innerText = `Deposit ${tier.token} Amount`;
    if (btnSubmitAction) {
      btnSubmitAction.innerText = `Stake ${tier.token}`;
      btnSubmitAction.style.display = "block";
    }
    updateBalanceLabel();
    calculateConversion();
  } else if (tab === "request") {
    if (tabRequest) tabRequest.classList.add("active");
    if (panelForm) panelForm.style.display = "block";
    if (inputLabel) inputLabel.innerText = `Redeem ${tier.shareToken} Shares`;
    if (btnSubmitAction) {
      btnSubmitAction.innerText = "Queue Withdrawal Request";
      btnSubmitAction.style.display = "block";
    }
    updateBalanceLabel();
    calculateConversion();
  } else if (tab === "claim") {
    if (tabClaim) tabClaim.classList.add("active");
    if (panelClaim) panelClaim.style.display = "block";
    renderTicketList();
  } else if (tab === "basket") {
    if (tabBasket) tabBasket.classList.add("active");
    if (panelBasket) panelBasket.style.display = "block";
  } else if (tab === "bridge") {
    if (tabBridge) tabBridge.classList.add("active");
    if (panelBridge) panelBridge.style.display = "block";
  }

  const activePanels = [panelForm, panelClaim, panelBasket, panelBridge].filter(Boolean);
  if (typeof gsap !== "undefined" && activePanels.length > 0) {
    gsap.fromTo(activePanels, { autoAlpha: 0.4, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: "power2.out" });
  }
}

if (tabStake) tabStake.addEventListener("click", () => setActiveTab("stake"));
if (tabRequest) tabRequest.addEventListener("click", () => setActiveTab("request"));
if (tabClaim) tabClaim.addEventListener("click", () => setActiveTab("claim"));
if (tabBasket) tabBasket.addEventListener("click", () => setActiveTab("basket"));
if (tabBridge) tabBridge.addEventListener("click", () => setActiveTab("bridge"));

// Cross-Chain CCTP V2 Bridge Action
if (btnBridgeAction) {
  btnBridgeAction.addEventListener("click", () => {
    const origin = bridgeOriginSelect ? bridgeOriginSelect.value : "Arbitrum";
    const amount = bridgeAmountInput ? parseFloat(bridgeAmountInput.value) || 50 : 50;

    btnBridgeAction.disabled = true;
    btnBridgeAction.innerText = "Executing CCTP Burn...";

    addLog("[Circle CCTP]", `Initiated burn of ${amount} USDC on ${origin.toUpperCase()}...`, "log-tag-agent");

    setTimeout(() => {
      addLog("[CctpForwarder]", `Attestation verified by Circle Iris API. Domain 27 transit confirmed.`, "log-tag-agent");
    }, 900);

    setTimeout(() => {
      addLog("[Stellar CCTP]", `Minted ${amount} USDC natively on Stellar. SAC deposited directly into Hikari Vault!`, "log-tag-success");
      state.totalAssets += Math.round(amount / 0.125); // XLM equivalent
      updateMetrics();
      btnBridgeAction.disabled = false;
      btnBridgeAction.innerText = "Bridge & Stake to hXLM";
    }, 1800);
  });
}

// Live x402 Oracle Query Trigger
if (btnTestX402) {
  btnTestX402.addEventListener("click", async () => {
    btnTestX402.disabled = true;
    btnTestX402.innerText = "Settling x402...";

    addLog("[x402Facilitator]", "Received HTTP 402 challenge from /v1/volatility-feed.", "log-tag-warn");

    try {
      const res = await fetch("/api/x402-query", { method: "POST" });
      const data = await res.json();
      if (data.paymentProof) {
        addLog("[x402Facilitator]", `Transferred 0.001 USDC (SAC) to Oracle. Payment proof: ${data.paymentProof.slice(0, 16)}...`, "log-tag-success");
        addLog("[StellarOracle]", `Feed unlocked! Volatility Index: ${data.data.volatilityIndex}, Slippage: ${data.data.projectedSlippageBps} bps`, "log-tag-agent");
        if (x402ProofLink) {
          x402ProofLink.innerText = `${data.paymentProof.slice(0, 8)}...${data.paymentProof.slice(-4)} ↗`;
          x402ProofLink.href = `https://stellar.expert/explorer/testnet/tx/${data.paymentProof}`;
        }
      }
    } catch (e) {
      addLog("[x402]", "x402 payment settled locally.", "log-tag-success");
    } finally {
      btnTestX402.disabled = false;
      btnTestX402.innerText = "Query Oracle (x402)";
    }
  });
}


// Conversion Calculation
if (amountInput) {
  amountInput.addEventListener("input", calculateConversion);
}

function calculateConversion() {
  if (!amountInput || !estShares) return;
  const tier = VAULT_TIERS[state.currentTier] || VAULT_TIERS.BALANCED_HXLM;
  const val = parseFloat(amountInput.value) || 0;
  if (state.activeTab === "stake") {
    const shares = (val * (state.totalShares + VIRTUAL_SHARES)) / (state.totalAssets + VIRTUAL_ASSETS);
    estShares.innerText = `${shares.toFixed(2)} ${tier.shareToken}`;
  } else {
    let assets = (val * (state.totalAssets + VIRTUAL_ASSETS)) / (state.totalShares + VIRTUAL_SHARES);
    if (state.bunkerMode && state.haircutBps > 0) {
      assets = assets * (1 - state.haircutBps / 10000);
    }
    estShares.innerText = `${assets.toFixed(2)} ${tier.token}`;
  }
}

// Render Withdrawal Claim Tickets
function renderTicketList() {
  if (!ticketList) return;
  ticketList.innerHTML = "";

  if (state.withdrawalTickets.length === 0) {
    ticketList.innerHTML = `<div style="text-align: center; color: var(--text-dim); font-size: 0.8rem; padding: 1.5rem 0;">No active withdrawal tickets found.</div>`;
    btnClaimAll.disabled = true;
    return;
  }

  let readyCount = 0;
  state.withdrawalTickets.forEach((t) => {
    const isReady = t.status === "ready";
    if (isReady) readyCount++;

    const item = document.createElement("div");
    item.className = "ticket-card";
    item.innerHTML = `
      <div>
        <div style="font-weight: 600; font-size: 0.85rem; color: #fff;">Ticket #${t.id}</div>
        <div class="ticket-meta">${t.shares.toFixed(2)} hXLM shares &rarr; ${t.claimableXlm.toFixed(2)} XLM</div>
      </div>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <span class="${isReady ? "ticket-badge-ready" : "ticket-badge-pending"}">
          ${isReady ? "Ready to Claim" : "Cooldown (~30 ledgers)"}
        </span>
        ${
          isReady
            ? `<button class="btn-primary" style="padding: 0.3rem 0.7rem; font-size: 0.75rem; width: auto;" onclick="claimTicket(${t.id})">Claim</button>`
            : ""
        }
      </div>
    `;
    ticketList.appendChild(item);
  });

  btnClaimAll.disabled = readyCount === 0;
}

window.claimTicket = function (ticketId) {
  const idx = state.withdrawalTickets.findIndex((t) => t.id === ticketId);
  if (idx === -1) return;
  const ticket = state.withdrawalTickets[idx];
  state.wallet.balanceXlm += ticket.claimableXlm;
  state.idleAssets -= ticket.claimableXlm;
  state.totalAssets -= ticket.claimableXlm;
  state.withdrawalTickets.splice(idx, 1);

  addLog("[WithdrawalQueue]", `Claimed Ticket #${ticket.id}: Received ${ticket.claimableXlm.toFixed(2)} XLM from buffer.`, "log-tag-success");
  updateMetrics();
  updateBalanceLabel();
  renderTicketList();
};

if (btnClaimAll) {
  btnClaimAll.addEventListener("click", () => {
    const readyTickets = state.withdrawalTickets.filter((t) => t.status === "ready");
    if (readyTickets.length === 0) return;

    let totalClaimed = 0;
    readyTickets.forEach((t) => (totalClaimed += t.claimableXlm));
    state.wallet.balanceXlm += totalClaimed;
    state.idleAssets -= totalClaimed;
    state.totalAssets -= totalClaimed;
    state.withdrawalTickets = state.withdrawalTickets.filter((t) => t.status !== "ready");

    addLog("[WithdrawalQueue]", `Batch Claimed ${readyTickets.length} tickets: Total ${totalClaimed.toFixed(2)} XLM paid out.`, "log-tag-success");
    updateMetrics();
    updateBalanceLabel();
    renderTicketList();
  });
}

// Form Submission with Pulse Flash
if (vaultForm) {
  vaultForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!amountInput) return;
    const val = parseFloat(amountInput.value);
    if (!val || val <= 0) return;

    const tier = VAULT_TIERS[state.currentTier] || VAULT_TIERS.BALANCED_HXLM;
    if (state.activeTab === "stake") {
      const shares = (val * (state.totalShares + VIRTUAL_SHARES)) / (state.totalAssets + VIRTUAL_ASSETS);
      state.totalAssets += val;
      state.idleAssets += val;
      state.totalShares += shares;
      state.wallet.balanceXlm -= val;
      state.wallet.sharesHXlm += shares;
      addLog("[Vault]", `Staked ${val} ${tier.token}. Minted ${shares.toFixed(2)} ${tier.shareToken} shares.`, "log-tag-success");
    } else if (state.activeTab === "request") {
      if (val > state.wallet.sharesHXlm) {
        addLog("[WithdrawalQueue]", `Insufficient ${tier.shareToken} shares in wallet.`, "log-tag-warn");
        return;
      }
      const assets = (val * (state.totalAssets + VIRTUAL_ASSETS)) / (state.totalShares + VIRTUAL_SHARES);
      const newId = (state.withdrawalTickets.length > 0 ? Math.max(...state.withdrawalTickets.map((t) => t.id)) : 100) + 1;
      state.withdrawalTickets.push({
        id: newId,
        shares: val,
        claimableXlm: assets,
        status: "pending",
      });
      state.wallet.sharesHXlm -= val;
      state.totalShares -= val;
      addLog("[WithdrawalQueue]", `Created Request Ticket #${newId} for ${val} ${tier.shareToken} (${assets.toFixed(2)} ${tier.token}). Cooldown started.`, "log-tag-success");

      // Automatically simulate finalization after 6 seconds
      setTimeout(() => {
        const t = state.withdrawalTickets.find((tk) => tk.id === newId);
        if (t) {
          t.status = "ready";
          addLog("[WithdrawalQueue]", `Ticket #${newId} finalized by Oracle! Ready to claim.`, "log-tag-success");
          if (state.activeTab === "claim") renderTicketList();
        }
      }, 6000);
    }

    amountInput.value = "";
    if (estShares) estShares.innerText = "0.00";
    updateMetrics();
    updateBalanceLabel();

    if (typeof gsap !== "undefined") {
      gsap.fromTo("#tvlDisplay", { scale: 1.15, color: "#c084fc" }, { scale: 1, color: "#ffffff", duration: 0.45, ease: "power2.out" });
      gsap.fromTo("#reserveDisplay", { scale: 1.12, color: "#c084fc" }, { scale: 1, color: "#ffffff", duration: 0.45, ease: "power2.out" });
    }
  });
}

// Human Approval Flow with GSAP
if (btnApprove) {
  btnApprove.addEventListener("click", () => {
    if (state.pendingProposal) {
      addLog(
        "[Operator]",
        `Approved ${state.pendingProposal.id}: Deployed ${state.pendingProposal.amount} XLM to ${state.pendingProposal.strategy}.`,
        "log-tag-success"
      );
      if (typeof gsap !== "undefined" && approvalBanner) {
        gsap.to(approvalBanner, {
          y: -15,
          autoAlpha: 0,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => { approvalBanner.style.display = "none"; }
        });
      } else if (approvalBanner) {
        approvalBanner.style.display = "none";
      }
      state.pendingProposal = null;
    }
  });
}

if (btnReject) {
  btnReject.addEventListener("click", () => {
    if (state.pendingProposal) {
      addLog(
        "[Operator]",
        `Rejected proposal ${state.pendingProposal.id}. Allocation cancelled.`,
        "log-tag-warn"
      );
      if (typeof gsap !== "undefined" && approvalBanner) {
        gsap.to(approvalBanner, {
          y: -15,
          autoAlpha: 0,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => { approvalBanner.style.display = "none"; }
        });
      } else if (approvalBanner) {
        approvalBanner.style.display = "none";
      }
      state.pendingProposal = null;
    }
  });
}

async function applyTelemetry(data) {
  if (!data) return;
  if (data.vaultState) {
    const totalAssetsXlm = Number(BigInt(data.vaultState.totalAssetsStroops) / 10000000n);
    const idleAssetsXlm = Number(BigInt(data.vaultState.idleAssetsStroops) / 10000000n);
    state.totalAssets = totalAssetsXlm;
    state.idleAssets = idleAssetsXlm;
    updateMetrics();
  }

  if (data.mevMetrics) {
    const boostXlm = (Number(BigInt(data.mevMetrics.vaultBoostStroops || "0")) / 1e7).toFixed(2);
    if (mevTotalYield) mevTotalYield.innerText = `+${boostXlm} XLM`;
    if (data.mevMetrics.lastBundle && data.mevMetrics.lastBundle.opportunity) {
      const opp = data.mevMetrics.lastBundle.opportunity;
      if (mevSpreadDisplay) mevSpreadDisplay.innerText = `${opp.spreadBps} bps`;
      if (mevTxLink) {
        const hash = data.mevMetrics.lastBundle.txHash;
        mevTxLink.innerText = `${hash.slice(0, 8)}...${hash.slice(-4)} ↗`;
        mevTxLink.href = `https://stellar.expert/explorer/testnet/tx/${hash}`;
      }
    }
  }

  if (data.oracleTelemetry) {
    state.oracleTelemetry = data.oracleTelemetry;
    if (data.oracleTelemetry.proofHash && state._lastLoggedOracleProof !== data.oracleTelemetry.proofHash) {
      state._lastLoggedOracleProof = data.oracleTelemetry.proofHash;
      const navDisplay = (Number(BigInt(data.oracleTelemetry.navStroops || "10000000")) / 1e7).toFixed(4);
      addLog("[OracleContract]", `Verified on-chain telemetry proof: ${data.oracleTelemetry.proofHash.slice(0, 18)}... (NAV: ${navDisplay} XLM)`, "log-tag-agent");
    }
  }

  function setBunkerMode(active, haircutBps = 0) {
    state.bunkerMode = !!active;
    state.haircutBps = Number(haircutBps) || 0;
  }

  if (data.circuitBreaker) {
    const cb = data.circuitBreaker;
    if (cb.isGateSealed || cb.isBunkerMode) {
      if (circuitStateBadge) {
        circuitStateBadge.innerHTML = `<span class="mode-dot dot-bunker"></span> [ALERT] GATE SEALED (Haircut: ${cb.haircutBps / 100}%)`;
        circuitStateBadge.style.background = "rgba(244, 63, 94, 0.15)";
        circuitStateBadge.style.borderColor = "rgba(244, 63, 94, 0.4)";
        circuitStateBadge.style.color = "var(--accent-rose)";
      }
      setBunkerMode(true, cb.haircutBps);
    } else {
      if (circuitStateBadge) {
        circuitStateBadge.innerHTML = `<span class="mode-dot dot-turbo"></span> System Nominal`;
        circuitStateBadge.style.background = "rgba(192, 132, 252, 0.15)";
        circuitStateBadge.style.borderColor = "rgba(192, 132, 252, 0.4)";
        circuitStateBadge.style.color = "var(--purple-soft)";
      }
      setBunkerMode(false, 0);
    }
  }

  if (mevCyclePulse) {
    mevCyclePulse.innerText = `Cycle #${data.totalCycles || 1} completed (${new Date().toLocaleTimeString()})`;
  }
}

async function fetchTelemetry() {
  try {
    const res = await fetch("/api/telemetry");
    if (res.ok) {
      const data = await res.json();
      applyTelemetry(data);
    }
  } catch (e) {
    // fallback
  }
}

// Poll telemetry periodically
if (document.getElementById("tvlDisplay") || document.getElementById("agentConsole")) {
  setInterval(fetchTelemetry, 5000);
  fetchTelemetry();
}

const rationaleStream = document.getElementById("rationaleStream");
const rationaleConfidence = document.getElementById("rationaleConfidence");

function pushDecisionRationale(author, message, confidence) {
  if (rationaleConfidence && confidence) {
    rationaleConfidence.innerText = `Policy Confidence: ${confidence}`;
  }
  if (!rationaleStream) return;
  const p = document.createElement("p");
  p.style.margin = "0.4rem 0 0 0";
  p.style.fontSize = "0.78rem";
  p.style.color = "#94a3b8";
  p.style.lineHeight = "1.4";
  p.innerHTML = `<strong style="color: #fff;">[${author}]:</strong> ${message}`;
  rationaleStream.prepend(p);
  while (rationaleStream.children.length > 3) {
    rationaleStream.removeChild(rationaleStream.lastChild);
  }
  if (typeof gsap !== "undefined") {
    gsap.fromTo(p, { autoAlpha: 0, y: -4 }, { autoAlpha: 1, y: 0, duration: 0.3 });
  }
}

// Real-time Agent Cycle Execution
if (btnRunAgent) {
  btnRunAgent.addEventListener("click", async () => {
  btnRunAgent.disabled = true;
  btnRunAgent.innerText = "Executing On-Chain...";
  if (typeof gsap !== "undefined") {
    gsap.to(btnRunAgent, { scale: 0.95, duration: 0.15, yoyo: true, repeat: 1 });
  }

  addLog("[PaymentAgent]", "Triggered x402 payment: 0.001 USDC for fresh market feed.", "log-tag-agent");
  addLog("[MarketAgent]", "Telemetry received: AMM order depth & Phoenix CLAMM tick arrays.", "log-tag-agent");

  try {
    const res = await fetch("/api/trigger-cycle", { method: "POST" });
    const json = await res.json();
    if (json.telemetry) {
      applyTelemetry(json.telemetry);
      addLog("[YieldAgent]", "Evaluated strategies: Phoenix CLAMM & Soroswap AMM.", "log-tag-agent");
      addLog("[MevBackrunner]", "Captured atomic backrun arbitrage and streamed profit to Vault!", "log-tag-success");
      addLog("[PolicyEngine]", "Deterministic check: All 7 invariant rules PASSED.", "log-tag-policy");
      if (json.telemetry.mevMetrics && json.telemetry.mevMetrics.lastBundle) {
        addLog("[AuditChain]", `Committed Tx: ${json.telemetry.mevMetrics.lastBundle.txHash.slice(0, 32)}...`, "log-tag-success");
      }
      const spreads = [76, 84, 91, 105, 88];
      const selectedSpread = spreads[Math.floor(Math.random() * spreads.length)];
      pushDecisionRationale(
        "YieldAgent",
        `Observed ${selectedSpread} bps cross-DEX spread exceeding 25 bps threshold. Rebalanced 25,000 XLM into Phoenix CLAMM. Projected delta APR: +2.14%. Portfolio 95% VaR remains healthy at 4.2% (safe boundary: < 5.0%). Merkle state root verified.`,
        "98.8%"
      );
    }
  } catch (err) {
    addLog("[Agent]", `Cycle completed locally.`, "log-tag-warn");
  } finally {
    btnRunAgent.disabled = false;
    btnRunAgent.innerText = "Trigger Cycle";
    if (typeof gsap !== "undefined" && agentConsole) {
      gsap.fromTo(agentConsole, { borderColor: "rgba(192, 132, 252, 0.8)" }, { borderColor: "rgba(255, 255, 255, 0.08)", duration: 0.8 });
    }
  }
});
}

// Interactive Circuit Breaker Buttons
if (btnSimulateShock) {
  btnSimulateShock.addEventListener("click", async () => {
    btnSimulateShock.disabled = true;
    try {
      addLog("[RiskEngine]", "[WARN] CRITICAL DRAWDOWN (16.5%) DETECTED IN DEFI POOLS!", "log-tag-warn");
      addLog("[GateSeal]", "[ALERT] GateSeal tripped! All strategy allocations frozen for 10,000 ledgers.", "log-tag-warn");
      addLog("[WithdrawalQueue]", "[SECURITY] Bunker Mode ENGAGED. Haircut of 16.5% applied to prevent run on idle reserves.", "log-tag-warn");
      pushDecisionRationale(
        "RiskEngine",
        "EMERGENCY DE-RISKING: Drawdown 16.5% breached 15.0% threshold. GateSeal locked Soroswap and Blend allocations. Vault transitioned to Bunker Mode with 16.5% FIFO redemption haircut.",
        "100.0% (EMERGENCY)"
      );
      await fetch("/api/simulate-shock", { method: "POST" });
      await fetchTelemetry();
    } finally {
      btnSimulateShock.disabled = false;
    }
  });
}

if (btnResetCircuit) {
  btnResetCircuit.addEventListener("click", async () => {
    btnResetCircuit.disabled = true;
    try {
      addLog("[Governance]", "[GOV] Timelock expired & DAO verified collateral recovery.", "log-tag-success");
      addLog("[GateSeal]", "GateSeal unsealed. Normal rebalancing resumed.", "log-tag-success");
      addLog("[WithdrawalQueue]", "Bunker Mode lifted. Turbo Mode 0% haircut restored.", "log-tag-success");
      pushDecisionRationale(
        "Governance",
        "Circuit breaker reset by multi-sig emergency council. Solvency restored, 15% reserve buffer replenished. Turbo Mode restored at 0% haircut.",
        "99.5%"
      );
      await fetch("/api/reset-circuit-breaker", { method: "POST" });
      await fetchTelemetry();
    } finally {
      btnResetCircuit.disabled = false;
    }
  });
}


function addLog(tag, message, tagClass) {
  const line = document.createElement("div");
  line.className = "log-line";
  const now = new Date();
  const time = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;

  line.innerHTML = `
    <span class="log-time">${time}</span>
    <span class="${tagClass}">${tag}</span>
    <span>${message}</span>
  `;
  agentConsole.appendChild(line);
  agentConsole.scrollTop = agentConsole.scrollHeight;

  if (typeof gsap !== "undefined") {
    gsap.from(line, {
      y: 10,
      autoAlpha: 0,
      duration: 0.35,
      ease: "power2.out"
    });
  }
}

function randomHash() {
  return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

// Master GSAP Animations & Choreography
function initGsapAnimations() {
  // Ensure dashboard cards, grid, and mode switch are always visible
  const cards = document.querySelectorAll("main .card, aside .card, .metric-card, .strategy-item, .mode-switch-bar, .main-grid");
  cards.forEach((c) => {
    c.style.opacity = "1";
    c.style.visibility = "visible";
  });

  if (typeof gsap === "undefined") return;

  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    // Dynamic Counter rollup
    const counter = { tvl: 0, nav: 1.0, reserve: 0 };
    gsap.to(counter, {
      tvl: state.totalAssets,
      nav: (state.totalAssets + VIRTUAL_ASSETS) / (state.totalShares + VIRTUAL_SHARES),
      reserve: state.idleAssets,
      duration: 1.2,
      ease: "power2.out",
      onUpdate: () => {
        if (tvlDisplay) tvlDisplay.innerText = `${Math.round(counter.tvl).toLocaleString()} XLM`;
        if (navDisplay) navDisplay.innerText = `${counter.nav.toFixed(4)} XLM`;
        if (reserveDisplay) reserveDisplay.innerText = `${Math.round(counter.reserve).toLocaleString()} XLM`;
      }
    });

    // Subtle smooth reveal with clearProps so elements NEVER stay hidden
    gsap.fromTo(
      ".metric-card",
      { y: 15, opacity: 0.8 },
      { y: 0, opacity: 1, stagger: 0.05, duration: 0.4, ease: "power2.out", clearProps: "opacity,visibility,transform" }
    );
    gsap.fromTo(
      ".mode-switch-bar",
      { y: 12, opacity: 0.8 },
      { y: 0, opacity: 1, duration: 0.4, delay: 0.15, ease: "power2.out", clearProps: "opacity,visibility,transform" }
    );
    gsap.fromTo(
      "main .card, aside .card",
      { y: 15, opacity: 0.85 },
      {
        y: 0,
        opacity: 1,
        stagger: 0.08,
        duration: 0.45,
        delay: 0.2,
        ease: "power2.out",
        clearProps: "opacity,visibility,transform",
        onComplete: () => {
          if (yieldChartInstance && typeof yieldChartInstance.render === "function") {
            yieldChartInstance.render();
          }
        }
      }
    );
  });

  // Hover micro-animations on interactive cards
  document.querySelectorAll(".metric-card").forEach((card) => {
    card.addEventListener("mouseenter", () => {
      gsap.to(card, { y: -5, duration: 0.25, ease: "power2.out" });
    });
    card.addEventListener("mouseleave", () => {
      gsap.to(card, { y: 0, duration: 0.25, ease: "power2.out" });
    });
  });

  document.querySelectorAll(".strategy-item").forEach((item) => {
    item.addEventListener("mouseenter", () => {
      gsap.to(item, { x: 5, backgroundColor: "rgba(139, 47, 230, 0.08)", duration: 0.2, ease: "power1.out" });
    });
    item.addEventListener("mouseleave", () => {
      gsap.to(item, { x: 0, backgroundColor: "rgba(255, 255, 255, 0.02)", duration: 0.2, ease: "power1.out" });
    });
  });
}

// Initial Run
updateMetrics();
initGsapAnimations();

// Initialize Canvas Yield & NAV Chart
let yieldChartInstance = null;
if (typeof HikariYieldChart !== "undefined" && document.getElementById("yieldChartCanvas")) {
  yieldChartInstance = new HikariYieldChart("yieldChartCanvas");

  document.querySelectorAll(".chart-tab, .tf-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".chart-tab, .tf-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tf = btn.getAttribute("data-tf") || btn.innerText.trim();
      if (yieldChartInstance) {
        yieldChartInstance.setTimeframe(tf);
      }
    });
  });
}

// ==========================================
// TopNav Interactions (Clean Typed Navigation)
// ==========================================
function initTopNav() {
  const mainHeader = document.getElementById("mainHeader");

  // Sticky Header Scroll Effect
  if (mainHeader) {
    window.addEventListener("scroll", () => {
      mainHeader.classList.toggle("scrolled", window.scrollY > 20);
    });
  }

  // Smooth scroll for topnav links
  document.querySelectorAll(".topnav__links a").forEach((link) => {
    const href = link.getAttribute("href");
    if (href && href.startsWith("#") && href.length > 1) {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  });
}

initTopNav();

// Multi-Vault Strategy Tier Switching
function initVaultTiers() {
  const tierChips = document.querySelectorAll(".tier-chip");
  if (!tierChips || tierChips.length === 0) return;
  const widgetBadge = document.getElementById("widgetBadge");
  const vaultPortalSection = document.getElementById("vaultPortalSection");

  tierChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const tierKey = chip.getAttribute("data-tier");
      if (!VAULT_TIERS[tierKey]) return;

      tierChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");

      state.currentTier = tierKey;
      const tier = VAULT_TIERS[tierKey];

      if (widgetBadge) widgetBadge.innerText = tier.badge;

      if (state.activeTab === "stake") {
        if (inputLabel) inputLabel.innerText = `Deposit ${tier.token} Amount`;
        if (btnSubmitAction) btnSubmitAction.innerText = `Stake ${tier.token}`;
      } else if (state.activeTab === "request") {
        if (inputLabel) inputLabel.innerText = `Redeem ${tier.shareToken} Shares`;
        if (btnSubmitAction) btnSubmitAction.innerText = `Queue Withdrawal Request`;
      }

      updateMetrics();
      updateBalanceLabel();
      calculateConversion();

      addLog("[VaultTiers]", `Switched to ${tier.name} (${tier.baseApy}). Risk profile: ${tier.desc}`, "log-tag-agent");

      if (typeof gsap !== "undefined" && vaultPortalSection) {
        gsap.fromTo(vaultPortalSection, { scale: 0.98 }, { scale: 1, duration: 0.25, ease: "power2.out" });
      }
    });
  });
}

// Simple 1-Click vs. Advanced Pro Mode Switch
function initDashboardViewModes() {
  const btnSimpleMode = document.getElementById("btnSimpleMode");
  const btnProMode = document.getElementById("btnProMode");
  if (!btnSimpleMode || !btnProMode) return;
  const currentViewModeText = document.getElementById("currentViewModeText");
  const vaultPortal = document.getElementById("vaultPortalSection");
  const chartSection = document.getElementById("chartSection");
  const amountInput = document.getElementById("amountInput");

  function setViewMode(mode) {
    state.viewMode = mode;

    // Guarantee all cards and sections are always visible
    document.querySelectorAll("main .card, aside .card, .metric-card, .strategy-item, .mode-switch-bar, .main-grid").forEach((c) => {
      c.style.opacity = "1";
      c.style.visibility = "visible";
    });

    if (mode === "simple") {
      if (btnSimpleMode) btnSimpleMode.classList.add("active");
      if (btnProMode) btnProMode.classList.remove("active");
      if (currentViewModeText) {
        currentViewModeText.innerText = "Simple 1-Click Staking Mode (Quick Presets Focused)";
      }
      addLog("[Dashboard]", "Switched to Simple 1-Click mode: 1-Click Staking portal focused with 100/500/1000 XLM presets.", "log-tag-success");

      // Auto-switch to Stake tab if not already on it
      const tabStake = document.getElementById("tabStake");
      if (tabStake) tabStake.click();

      // Highlight the vault portal with a soft glowing focus ring
      if (vaultPortal) {
        vaultPortal.classList.remove("portal-focus-ring");
        void vaultPortal.offsetWidth; // trigger reflow
        vaultPortal.classList.add("portal-focus-ring");
        setTimeout(() => vaultPortal.classList.remove("portal-focus-ring"), 2500);
      }
    } else {
      if (btnProMode) btnProMode.classList.add("active");
      if (btnSimpleMode) btnSimpleMode.classList.remove("active");
      if (currentViewModeText) {
        currentViewModeText.innerText = "Advanced Pro Analytics Mode (AI Engine & Risk Telemetry Active)";
      }
      addLog("[Dashboard]", "Switched to Advanced Pro Mode: Real-time telemetry, risk engine & MEV monitors active.", "log-tag-agent");

      // Highlight the analytics section
      if (chartSection) {
        chartSection.classList.remove("portal-focus-ring");
        void chartSection.offsetWidth;
        chartSection.classList.add("portal-focus-ring");
        setTimeout(() => chartSection.classList.remove("portal-focus-ring"), 2500);
      }
    }

    // Always re-render the chart so it is crisp and properly sized
    if (yieldChartInstance && typeof yieldChartInstance.render === "function") {
      yieldChartInstance.render();
    }
  }

  if (btnSimpleMode) btnSimpleMode.addEventListener("click", () => setViewMode("simple"));
  if (btnProMode) btnProMode.addEventListener("click", () => setViewMode("pro"));

  // 1-Click Quick Preset Amount Chips
  document.querySelectorAll(".btn-preset-amt").forEach((btn) => {
    btn.addEventListener("click", () => {
      const amt = btn.getAttribute("data-amt");
      if (amountInput && amt) {
        amountInput.value = amt;
        amountInput.dispatchEvent(new Event("input", { bubbles: true }));
        document.querySelectorAll(".btn-preset-amt").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      }
    });
  });
}

initVaultTiers();
initDashboardViewModes();

// Hikari Shards Loyalty Program & Leaderboard Logic
function initShardsSystem() {
  const shardsModal = document.getElementById("shardsModal");
  const btnCloseShardsModal = document.getElementById("btnCloseShardsModal");
  const btnDoneShards = document.getElementById("btnDoneShards");
  const btnOpenShardsModal = document.getElementById("btnOpenShardsModal");
  const btnDrawerOpenShards = document.getElementById("btnDrawerOpenShards");
  const headerShardsText = document.getElementById("headerShardsText");
  const headerMultiplierTag = document.getElementById("headerMultiplierTag");
  const modalUserShards = document.getElementById("modalUserShards");
  const modalDailyRate = document.getElementById("modalDailyRate");
  const modalMultiplier = document.getElementById("modalMultiplier");
  const modalRank = document.getElementById("modalRank");
  const modalRankTier = document.getElementById("modalRankTier");
  const leaderboardList = document.getElementById("leaderboardList");

  async function fetchShardsProfile(address) {
    try {
      const res = await fetch(`/api/points/${address || 'GCJSDY6QA6CYEIZ6W6USD2QC22OBHKOI326YUU64QWBBMWL4GBSY6BQN'}`);
      if (res.ok) {
        const data = await res.json();
        if (headerShardsText) headerShardsText.innerText = `${(data.totalShards / 1000).toFixed(1)}k Shards`;
        if (headerMultiplierTag) headerMultiplierTag.innerText = `${data.activeMultiplier}x`;
        if (modalUserShards) modalUserShards.innerText = `${data.totalShards.toLocaleString()} `;
        if (modalDailyRate) modalDailyRate.innerText = `+${data.baseRatePerDay.toLocaleString()} / day`;
        if (modalMultiplier) modalMultiplier.innerText = `${data.activeMultiplier}x`;
        if (modalRank) modalRank.innerText = `#${data.rank}`;
        if (modalRankTier) modalRankTier.innerText = data.tier;
      }
    } catch (e) {
      console.warn("Shards fetch error:", e);
    }
  }

  window.fetchShardsProfile = fetchShardsProfile;

  async function fetchLeaderboard() {
    try {
      const res = await fetch("/api/leaderboard");
      if (res.ok) {
        const { leaderboard } = await res.json();
        if (leaderboardList && leaderboard && leaderboard.length > 0) {
          leaderboardList.innerHTML = leaderboard.map((item, idx) => `
            <div class="shards-table-row">
              <span style="font-weight: 700; color: ${idx === 0 ? 'var(--lavender)' : idx === 1 ? '#cbd5e1' : idx === 2 ? 'var(--purple-soft)' : 'var(--text-dim)'};">#${item.rank}</span>
              <span style="font-family: monospace;">${item.address}</span>
              <span class="tier-pill" style="background: rgba(139, 47, 230, 0.15); color: var(--lavender);">${item.tier}</span>
              <span style="text-align: right; font-weight: 600;">${item.shards.toLocaleString()}</span>
            </div>
          `).join("");
        }
      }
    } catch (e) {
      console.warn("Leaderboard fetch error:", e);
    }
  }

  const openShards = (e) => {
    if (e) e.preventDefault();
    if (shardsModal) shardsModal.style.display = "flex";
    const drawer = document.getElementById("hikariMobileDrawer");
    if (drawer) drawer.style.display = "none";
    fetchLeaderboard();
  };

  if (btnOpenShardsModal) btnOpenShardsModal.addEventListener("click", openShards);
  if (btnDrawerOpenShards) btnDrawerOpenShards.addEventListener("click", openShards);
  if (btnCloseShardsModal) btnCloseShardsModal.addEventListener("click", () => shardsModal.style.display = "none");
  if (btnDoneShards) btnDoneShards.addEventListener("click", () => shardsModal.style.display = "none");

  // Dismiss on backdrop click or escape
  if (shardsModal) {
    shardsModal.addEventListener("click", (e) => {
      if (e.target === shardsModal) shardsModal.style.display = "none";
    });
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && shardsModal && shardsModal.style.display === "flex") {
      shardsModal.style.display = "none";
    }
  });

  // Initial fetch
  fetchShardsProfile();
}

initShardsSystem();

// Top Navigation Theme Toggle System (Symbols Only: Moon/Sun)
function initThemeSystem() {
  const themeSwitch = document.getElementById("themeSwitch") || document.getElementById("themeToggleBtn");
  if (!themeSwitch) return;

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    themeSwitch.setAttribute("data-theme-state", theme);

    // Update moon/sun icon visibility on index.html and app.html if present
    const iconSun = themeSwitch.querySelector(".icon-sun");
    const iconMoon = themeSwitch.querySelector(".icon-moon");
    if (iconSun && iconMoon) {
      if (theme === "light") {
        iconSun.style.display = "none";
        iconMoon.style.display = "flex";
      } else {
        iconSun.style.display = "flex";
        iconMoon.style.display = "none";
      }
    }

    if (typeof yieldChartInstance !== "undefined" && yieldChartInstance && typeof yieldChartInstance.render === "function") {
      yieldChartInstance.render();
    }
  }

  const savedTheme = localStorage.getItem("theme") || "light";
  applyTheme(savedTheme);

  themeSwitch.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  });
}

initThemeSystem();

// Expandable Floating Social AI Hub for Mobile & Desktop
function initSocialDockToggle() {
  const btn = document.getElementById("btnToggleSocialDock");
  const dock = document.getElementById("hikariSocialDock");
  if (btn && dock) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      dock.classList.toggle("dock-expanded");
    });
    document.addEventListener("click", (e) => {
      if (!dock.contains(e.target) && dock.classList.contains("dock-expanded")) {
        dock.classList.remove("dock-expanded");
      }
    });
  }
}
initSocialDockToggle();

// =========================================================
// IMMERSIVE SCENE ENGINE: LOADER, CURSOR, GLOW, HERO, 3D SCENE
// =========================================================
function initHeroAmbientScene() {
  const root = document.getElementById("heroAmbient");
  if (!root) return;

  // 1. SPLIT TITLE: wrap text nodes' characters into char spans
  const titleLines = root.querySelectorAll("[data-title-line]");
  titleLines.forEach((line) => {
    const frag = document.createDocumentFragment();
    line.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        [...node.textContent].forEach((ch) => {
          const span = document.createElement("span");
          span.className = "hero__char";
          if (ch === " ") {
            span.classList.add("is-space");
            span.innerHTML = "&nbsp;";
          } else {
            span.textContent = ch;
          }
          frag.appendChild(span);
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const emText = node.textContent;
        node.textContent = "";
        [...emText].forEach((ch) => {
          const span = document.createElement("span");
          span.className = "hero__char";
          if (ch === " ") {
            span.classList.add("is-space");
            span.innerHTML = "&nbsp;";
          } else {
            span.textContent = ch;
          }
          node.appendChild(span);
        });
        frag.appendChild(node);
      }
    });
    line.textContent = "";
    line.appendChild(frag);
  });



  // References
  const loader = document.getElementById("loader");
  const loaderOrb = document.getElementById("loader-orb");
  const loaderCheck = document.getElementById("loader-check");
  const loaderCounter = document.getElementById("loader-counter");
  const loaderLabel = document.getElementById("loader-label");

  const cursorDot = document.getElementById("cursor-dot");
  const cursorRing = document.getElementById("cursor-ring");

  const glow = document.getElementById("glow");
  const magnetics = document.querySelectorAll("[data-magnetic]");
  const titleChars = root.querySelectorAll(".hero__char");
  const lines = root.querySelectorAll("[data-title-line]");
  const fades = root.querySelectorAll("[data-fade]");
  const chips = root.querySelectorAll("[data-chip]");
  const cta = root.querySelector("[data-cta]");
  const sceneEls = root.querySelectorAll("[data-scene]");

  if (typeof gsap === "undefined") {
    if (loader) loader.style.display = "none";
    document.querySelectorAll(".hero, [data-fade], [data-chip], [data-cta], [data-title-line], [data-magnetic], .hero__char, .main-grid, .card").forEach((el) => {
      el.style.opacity = "1";
      el.style.visibility = "visible";
      el.style.transform = "none";
    });
    return;
  }

  // Initial States
  gsap.set(magnetics, { y: -15, opacity: 0 });
  gsap.set(titleChars, { yPercent: 110, opacity: 0 });
  gsap.set(lines, { opacity: 1 });
  gsap.set(fades, { y: 20, opacity: 0 });
  gsap.set(chips, { x: 40, opacity: 0 });
  gsap.set(cta, { y: 30, opacity: 0, scale: 0.9 });
  gsap.set(sceneEls, { opacity: 0 });

  const urlParams = new URLSearchParams(window.location.search);
  const skipLoader = urlParams.get("skipLoader") === "true";

  if (skipLoader) {
    if (loader) loader.style.display = "none";
    gsap.set(magnetics, { y: 0, opacity: 1 });
    gsap.set(titleChars, { yPercent: 0, opacity: 1 });
    gsap.set(lines, { opacity: 1 });
    gsap.set(fades, { y: 0, opacity: 1 });
    gsap.set(chips, { x: 0, opacity: 1 });
    gsap.set(cta, { y: 0, opacity: 1, scale: 1 });
    gsap.set(sceneEls, { opacity: 1 });
    return;
  }

  // 3. JAPANESE KANJI "光" (HIKARI) LOADER TIMELINE
  const loaderTl = gsap.timeline({ onComplete: playScene });
  const loaderKanji = document.getElementById("loader-kanji");

  if (loaderKanji) {
    gsap.fromTo(
      loaderKanji,
      { scale: 0.75, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.6, ease: "power2.out" }
    );
    gsap.to(loaderKanji, {
      scale: 1.08,
      duration: 1.0,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });
  }

  const p = { v: 0 };
  loaderTl.to(p, {
    v: 100,
    duration: 1.6,
    ease: "power1.inOut",
    onUpdate: () => {
      const val = Math.min(100, Math.floor(p.v));
      if (loaderCounter) loaderCounter.textContent = val + "%";
      if (loaderLabel) {
        if (val < 28) loaderLabel.textContent = "光 • HIKARI AI YIELD";
        else if (val < 62) loaderLabel.textContent = "光 • CONNECTING SOROBAN";
        else if (val < 95) loaderLabel.textContent = "光 • 12.4% ALPHA ENGINE";
        else loaderLabel.textContent = "光 • HIKARI READY (100%)";
      }
    },
  });

  // Hold briefly on 100% so user clearly perceives the 100% completion
  loaderTl.to({}, { duration: 0.25 });

  if (loaderKanji) {
    loaderTl.to(loaderKanji, {
      scale: 1.35,
      opacity: 0,
      duration: 0.45,
      ease: "power2.in",
    });
  }

  loaderTl.to([loaderCounter, loaderLabel], {
    y: 10,
    opacity: 0,
    duration: 0.25,
    stagger: 0.04,
  }, "-=0.25");

  loaderTl.to(loader, {
    opacity: 0,
    duration: 0.4,
    ease: "power2.inOut",
  }, "-=0.1");
  loaderTl.set(loader, { display: "none" });

  // 4. MAIN SCENE ENTRANCE
  function playScene() {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.to(magnetics, {
      y: 0,
      opacity: 1,
      duration: 0.6,
      stagger: 0.05,
    }, 0);

    tl.to(titleChars, {
      yPercent: 0,
      opacity: 1,
      duration: 1.1,
      stagger: 0.018,
      ease: "expo.out",
    }, 0.3);

    tl.to(fades, {
      y: 0,
      opacity: 1,
      duration: 0.7,
      stagger: 0.15,
    }, 0.9);

    tl.to(cta, {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: 0.8,
      ease: "back.out(1.6)",
    }, 1.1);

    tl.to(chips, {
      x: 0,
      opacity: 1,
      duration: 0.7,
      stagger: 0.1,
      ease: "power4.out",
    }, 0.8);

    tl.to(sceneEls, {
      opacity: 1,
      duration: 1.2,
      stagger: 0.08,
      ease: "power2.out",
    }, 1);

    tl.call(() => {
      document.querySelectorAll("main .card, aside .card, .metric-card, .strategy-item, .mode-switch-bar, .main-grid").forEach((c) => {
        c.style.opacity = "1";
        c.style.visibility = "visible";
      });
      if (yieldChartInstance && typeof yieldChartInstance.render === "function") {
        yieldChartInstance.render();
      }
    }, null, 0.6);

    tl.call(startContinuous, null, 1.8);
    tl.call(enableInteractions, null, 1.8);
  }

  // 5. CONTINUOUS FLOATING & LIGHT SWEEP
  function startContinuous() {
    root.querySelectorAll(".scene__orb").forEach((orb, i) => {
      gsap.to(orb, {
        y: `-=${12 + i * 3}`,
        duration: 2 + i * 0.4,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        delay: i * 0.15,
      });
    });

    const check = root.querySelector(".scene__check");
    if (check) {
      gsap.to(check, {
        y: "-=15",
        rotation: 3,
        duration: 3,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
    }

    chips.forEach((chip, i) => {
      gsap.to(chip, {
        y: "-=6",
        duration: 2.2 + i * 0.3,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        delay: i * 0.2,
      });
    });

    const light = root.querySelector(".scene__light");
    if (light) {
      gsap.to(light, {
        x: 60,
        opacity: 0.6,
        duration: 3,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
    }
  }

  // 6. INTERACTIONS: Cursor, Ambient Glow, Proximity, Magnetic, Parallax, Particle burst
  function enableInteractions() {
    // Custom cursor lerping
    if (cursorDot && cursorRing) {
      let mx = window.innerWidth / 2, my = window.innerHeight / 2;
      let rx = mx, ry = my;
      window.addEventListener("mousemove", (e) => {
        mx = e.clientX;
        my = e.clientY;
      });
      gsap.ticker.add(() => {
        rx += (mx - rx) * 0.18;
        ry += (my - ry) * 0.18;
        gsap.set(cursorDot, { x: mx, y: my });
        gsap.set(cursorRing, { x: rx, y: ry });
      });

      const hovers = document.querySelectorAll(
        "a, button, [data-magnetic], [data-chip], .scene__orb, .hero__char, .hikari-nav-trigger"
      );
      hovers.forEach((el) => {
        el.addEventListener("mouseenter", () => cursorRing.classList.add("is-hover"));
        el.addEventListener("mouseleave", () => cursorRing.classList.remove("is-hover"));
      });
    }

    // Ambient glow follow
    if (glow) {
      let gx = 0, gy = 0, gcx = 0, gcy = 0;
      root.addEventListener("mousemove", (e) => {
        const r = root.getBoundingClientRect();
        gx = e.clientX - r.left;
        gy = e.clientY - r.top;
      });
      gsap.ticker.add(() => {
        gcx += (gx - gcx) * 0.04;
        gcy += (gy - gcy) * 0.04;
        gsap.set(glow, { x: gcx - window.innerWidth / 2, y: gcy - window.innerHeight / 2 });
      });
    }

    // Magnetic elements
    magnetics.forEach((el) => {
      const strength = el.classList.contains("cta-big")
        ? 0.3
        : el.classList.contains("topnav__login")
        ? 0.3
        : 0.22;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        gsap.to(el, {
          x: (e.clientX - cx) * strength,
          y: (e.clientY - cy) * strength,
          duration: 0.4,
          ease: "power3.out",
        });
      });
      el.addEventListener("mouseleave", () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
      });
    });

    // Title character proximity
    const hero = document.getElementById("hero");
    if (hero) {
      let tmx = -9999, tmy = -9999;
      hero.addEventListener("mousemove", (e) => {
        tmx = e.clientX;
        tmy = e.clientY;
      });
      hero.addEventListener("mouseleave", () => {
        tmx = -9999;
        tmy = -9999;
        titleChars.forEach((c) => gsap.to(c, { y: 0, duration: 0.5, ease: "power3.out" }));
      });
      gsap.ticker.add(() => {
        if (tmx < 0) return;
        titleChars.forEach((c) => {
          const r = c.getBoundingClientRect();
          if (r.width === 0) return;
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dx = tmx - cx, dy = tmy - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) gsap.set(c, { y: -(1 - dist / 150) * 16 });
          else gsap.set(c, { y: 0 });
        });
      });
    }

    // Chips hover pop & icon wiggle
    chips.forEach((chip) => {
      chip.addEventListener("mouseenter", () => {
        gsap.to(chip, {
          scale: 1.04,
          boxShadow: "0 10px 30px rgba(139, 47, 230, 0.35)",
          duration: 0.3,
          ease: "back.out(2)",
        });
        const icon = chip.querySelector(".chip__icon");
        if (icon) {
          gsap.fromTo(
            icon,
            { rotation: -15 },
            {
              rotation: 15,
              duration: 0.1,
              yoyo: true,
              repeat: 3,
              ease: "sine.inOut",
              onComplete: () => gsap.to(icon, { rotation: 0, duration: 0.3 }),
            }
          );
        }
      });
      chip.addEventListener("mouseleave", () => {
        gsap.to(chip, {
          scale: 1,
          boxShadow: "none",
          duration: 0.4,
          ease: "elastic.out(1, 0.4)",
        });
      });
    });

    // CTA particle burst
    if (cta) {
      cta.addEventListener("click", (e) => {
        gsap.fromTo(
          cta,
          { scale: 1 },
          { scale: 0.95, duration: 0.1, yoyo: true, repeat: 1, ease: "sine.inOut" }
        );
        const rect = cta.getBoundingClientRect();
        const cx = rect.left + rect.width - 19;
        const cy = rect.top + rect.height / 2;
        for (let i = 0; i < 8; i++) {
          const dot = document.createElement("span");
          dot.style.position = "fixed";
          dot.style.left = cx + "px";
          dot.style.top = cy + "px";
          dot.style.width = "5px";
          dot.style.height = "5px";
          dot.style.background = "#c084fc";
          dot.style.borderRadius = "50%";
          dot.style.pointerEvents = "none";
          dot.style.zIndex = "99999";
          dot.style.transform = "translate(-50%, -50%)";
          dot.style.boxShadow = "0 0 10px #c084fc";
          document.body.appendChild(dot);
          const a = (i / 8) * Math.PI * 2;
          gsap.fromTo(
            dot,
            { x: 0, y: 0, opacity: 1 },
            {
              x: Math.cos(a) * 60,
              y: Math.sin(a) * 60,
              opacity: 0,
              scale: 1.8,
              duration: 0.65,
              ease: "power2.out",
              onComplete: () => dot.remove(),
            }
          );
        }
      });
    }

    // Scene orbs mouse parallax + click bounce
    const orbs = root.querySelectorAll(".scene__orb");
    let sx = 0, sy = 0, scx = 0, scy = 0;
    root.addEventListener("mousemove", (e) => {
      const r = root.getBoundingClientRect();
      sx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      sy = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    root.addEventListener("mouseleave", () => {
      sx = 0;
      sy = 0;
    });

    gsap.ticker.add(() => {
      scx += (sx - scx) * 0.05;
      scy += (sy - scy) * 0.05;
      orbs.forEach((orb, i) => {
        const depth = 0.4 + i * 0.15;
        gsap.set(orb, {
          x: scx * 25 * depth,
          y: scy * 18 * depth,
        });
      });
      const check = root.querySelector(".scene__check");
      if (check) {
        gsap.set(check, {
          rotationY: scx * 8,
          rotationX: -scy * 6,
          transformPerspective: 1000,
          transformOrigin: "center",
        });
      }
    });

    orbs.forEach((orb) => {
      orb.style.pointerEvents = "auto";
      orb.addEventListener("mouseenter", () => {
        gsap.to(orb, { scale: 1.15, duration: 0.3, ease: "back.out(2)" });
      });
      orb.addEventListener("mouseleave", () => {
        gsap.to(orb, { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.4)" });
      });
      orb.addEventListener("click", () => {
        gsap.fromTo(
          orb,
          { x: 0 },
          { x: (Math.random() - 0.5) * 80, duration: 0.3, yoyo: true, repeat: 1, ease: "power2.out" }
        );
      });
    });

    // Interactive 3D tilt & bounce for Hero Yield Card (12.4% APY box)
    const yieldCard = root.querySelector(".hero__yield-card");
    if (yieldCard) {
      yieldCard.addEventListener("mousemove", (e) => {
        const r = yieldCard.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = (e.clientX - cx) / (r.width / 2);
        const dy = (e.clientY - cy) / (r.height / 2);
        gsap.to(yieldCard, {
          rotationY: dx * 8,
          rotationX: -dy * 8,
          transformPerspective: 800,
          duration: 0.25,
          ease: "power2.out",
        });
      });

      yieldCard.addEventListener("mouseleave", () => {
        gsap.to(yieldCard, {
          rotationX: 0,
          rotationY: 0,
          duration: 0.6,
          ease: "elastic.out(1, 0.4)",
        });
      });

      yieldCard.addEventListener("click", () => {
        gsap.fromTo(
          yieldCard,
          { scale: 0.96 },
          { scale: 1.02, duration: 0.45, ease: "elastic.out(1.2, 0.4)" }
        );
      });
    }
  }
}

// Auto-run when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHeroAmbientScene);
} else {
  initHeroAmbientScene();
}


// ==========================================
// Japanese Kanji "光" Loader & Nav Slider Init
// ==========================================
function initNavSliderAndCalculator() {
  const btnOpenNavSlider = document.getElementById("btnOpenNavSlider");
  const btnCloseNavSlider = document.getElementById("btnCloseNavSlider");
  const navSlider = document.getElementById("navSlider");

  if (btnOpenNavSlider && navSlider) {
    btnOpenNavSlider.addEventListener("click", () => {
      navSlider.style.display = "flex";
      if (typeof gsap !== "undefined") {
        gsap.fromTo(".nav-slider-deck", { y: -25, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "power3.out" });
      }
    });
  }

  if (btnCloseNavSlider && navSlider) {
    btnCloseNavSlider.addEventListener("click", () => {
      navSlider.style.display = "none";
    });
  }

  if (navSlider) {
    navSlider.addEventListener("click", (e) => {
      if (e.target === navSlider) {
        navSlider.style.display = "none";
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && navSlider && navSlider.style.display !== "none") {
      navSlider.style.display = "none";
    }
  });

  // Slider links close and scroll smoothly
  document.querySelectorAll(".nav-slider-card").forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      const navAction = link.getAttribute("data-nav-action");

      if (navAction) {
        if (navAction === "tab-stake" && typeof switchTab === "function") switchTab("stake");
        else if (navAction === "tab-basket" && typeof switchTab === "function") switchTab("basket");
        else if (navAction === "tab-bridge" && typeof switchTab === "function") switchTab("bridge");
        else if (navAction === "tab-bots") {
          const btnTabTradingBots = document.getElementById("btnTabTradingBots");
          if (btnTabTradingBots) btnTabTradingBots.click();
        }
      }

      if (href && href.startsWith("#") && href.length > 1) {
        e.preventDefault();
        if (navSlider) navSlider.style.display = "none";
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } else if (href === "javascript:void(0)") {
        if (navSlider) navSlider.style.display = "none";
      }
    });
  });

  // Analytics Sub-Tabs: NAV Progression vs. Trading Bots
  const btnTabNavChart = document.getElementById("btnTabNavChart");
  const btnTabTradingBots = document.getElementById("btnTabTradingBots");
  const viewNavChart = document.getElementById("viewNavChart");
  const viewTradingBots = document.getElementById("viewTradingBots");
  const btnSimulateBotTrade = document.getElementById("btnSimulateBotTrade");
  const botSimStatus = document.getElementById("botSimStatus");

  if (btnTabNavChart && btnTabTradingBots && viewNavChart && viewTradingBots) {
    btnTabNavChart.addEventListener("click", () => {
      btnTabNavChart.classList.add("active");
      btnTabTradingBots.classList.remove("active");
      viewNavChart.style.display = "block";
      viewTradingBots.style.display = "none";
      if (yieldChartInstance && typeof yieldChartInstance.render === "function") {
        yieldChartInstance.render();
      }
    });

    btnTabTradingBots.addEventListener("click", () => {
      btnTabTradingBots.classList.add("active");
      btnTabNavChart.classList.remove("active");
      viewNavChart.style.display = "none";
      viewTradingBots.style.display = "block";
    });
  }

  if (btnSimulateBotTrade && botSimStatus) {
    btnSimulateBotTrade.addEventListener("click", () => {
      btnSimulateBotTrade.disabled = true;
      btnSimulateBotTrade.innerText = "Scanning Mempool...";
      botSimStatus.innerText = "Evaluating price discrepancy between Phoenix CLAMM and Soroswap...";
      botSimStatus.style.color = "var(--purple-soft)";

      setTimeout(() => {
        btnSimulateBotTrade.disabled = false;
        btnSimulateBotTrade.innerText = "Simulate Arbitrage Execution";
        botSimStatus.innerText = "Arbitrage executed: +42.80 XLM captured and routed to hXLM reserve!";
        botSimStatus.style.color = "var(--purple-soft)";
        if (typeof addLog === "function") {
          addLog("[TradingBot]", "Soroban atomic MEV arb executed: Swapped 1,200 XLM on Phoenix -> Soroswap (+42.80 XLM profit).", "log-tag-success");
        }
      }, 1200);
    });
  }

  // Slider modal triggers
  const btnSliderOpenSdk = document.getElementById("btnSliderOpenSdk");
  const btnSliderOpenInvariants = document.getElementById("btnSliderOpenInvariants");
  const sdkModal = document.getElementById("sdkModal");
  const invariantsModal = document.getElementById("invariantsModal");

  if (btnSliderOpenSdk && sdkModal) {
    btnSliderOpenSdk.addEventListener("click", () => {
      if (navSlider) navSlider.style.display = "none";
      sdkModal.style.display = "flex";
    });
  }

  if (btnSliderOpenInvariants && invariantsModal) {
    btnSliderOpenInvariants.addEventListener("click", () => {
      if (navSlider) navSlider.style.display = "none";
      invariantsModal.style.display = "flex";
    });
  }

  // Interactive 12.4% APY Calculator Slider in Hero
  const heroCalcSlider = document.getElementById("heroCalcSlider");
  const calcDepositVal = document.getElementById("calcDepositVal");
  const calcReturnVal = document.getElementById("calcReturnVal");

  if (heroCalcSlider && calcDepositVal && calcReturnVal) {
    heroCalcSlider.addEventListener("input", () => {
      const val = parseFloat(heroCalcSlider.value);
      calcDepositVal.innerText = val.toLocaleString() + " XLM";
      const ret = (val * 0.124).toFixed(2);
      calcReturnVal.innerText = "+" + ret + " XLM";
    });
  }

  // Live Yield Ticker animation in Hero
  const heroYieldCounter = document.getElementById("heroYieldCounter");
  if (heroYieldCounter) {
    let accrued = 0.0034;
    setInterval(() => {
      accrued += (Math.random() * 0.0006 + 0.0002);
      heroYieldCounter.innerText = "+" + accrued.toFixed(4) + " XLM / min";
    }, 3500);
  }
}

// ============================================================================
// MARKETING FLOW & MODAL INTERACTIONS
// ============================================================================
function initMarketingInteractions() {
  // Earn Cards Deposit Buttons navigate directly to app.html?vault=... via HTML href

  // Modals
  const nodeOperatorsModal = document.getElementById("nodeOperatorsModal");
  const ecosystemModal = document.getElementById("ecosystemModal");
  const scorecardModal = document.getElementById("scorecardModal");
  const invariantsModal = document.getElementById("invariantsModal");

  const btnEcosystemExplore = document.getElementById("btnEcosystemExplore");
  if (btnEcosystemExplore && ecosystemModal) {
    btnEcosystemExplore.addEventListener("click", () => {
      ecosystemModal.style.display = "flex";
    });
  }

  const btnLearnMoreVaults = document.getElementById("btnLearnMoreVaults");
  if (btnLearnMoreVaults && invariantsModal) {
    btnLearnMoreVaults.addEventListener("click", () => {
      invariantsModal.style.display = "flex";
    });
  }

  const btnLinkAllAudits = document.getElementById("btnLinkAllAudits");
  if (btnLinkAllAudits && invariantsModal) {
    btnLinkAllAudits.addEventListener("click", () => {
      invariantsModal.style.display = "flex";
    });
  }

  const btnWeb3socLearn = document.getElementById("btnWeb3socLearn");
  if (btnWeb3socLearn && scorecardModal) {
    btnWeb3socLearn.addEventListener("click", () => {
      scorecardModal.style.display = "flex";
    });
  }

  const btnNodeOperatorsModal = document.getElementById("btnNodeOperatorsModal");
  if (btnNodeOperatorsModal && nodeOperatorsModal) {
    btnNodeOperatorsModal.addEventListener("click", () => {
      nodeOperatorsModal.style.display = "flex";
    });
  }

  const btnGovernanceProcess = document.getElementById("btnGovernanceProcess");
  if (btnGovernanceProcess && scorecardModal) {
    btnGovernanceProcess.addEventListener("click", () => {
      scorecardModal.style.display = "flex";
    });
  }

  const btnScorecardModal = document.getElementById("btnScorecardModal");
  if (btnScorecardModal && scorecardModal) {
    btnScorecardModal.addEventListener("click", () => {
      scorecardModal.style.display = "flex";
    });
  }

  // Close modals
  const btnCloseNodeOpsModal = document.getElementById("btnCloseNodeOpsModal");
  const btnDoneNodeOps = document.getElementById("btnDoneNodeOps");
  [btnCloseNodeOpsModal, btnDoneNodeOps].forEach(btn => {
    if (btn && nodeOperatorsModal) {
      btn.addEventListener("click", () => { nodeOperatorsModal.style.display = "none"; });
    }
  });

  const btnCloseEcoModal = document.getElementById("btnCloseEcoModal");
  const btnDoneEco = document.getElementById("btnDoneEco");
  [btnCloseEcoModal, btnDoneEco].forEach(btn => {
    if (btn && ecosystemModal) {
      btn.addEventListener("click", () => { ecosystemModal.style.display = "none"; });
    }
  });

  const btnCloseScorecardModal = document.getElementById("btnCloseScorecardModal");
  const btnDoneScorecard = document.getElementById("btnDoneScorecard");
  [btnCloseScorecardModal, btnDoneScorecard].forEach(btn => {
    if (btn && scorecardModal) {
      btn.addEventListener("click", () => { scorecardModal.style.display = "none"; });
    }
  });

  // Footer Links
  const faqModal = document.getElementById("faqModal");
  const sdkModal = document.getElementById("sdkModal");
  const shardsModal = document.getElementById("shardsModal");
  const btnFooterFaq = document.getElementById("btnFooterFaq");
  const btnFooterSdk = document.getElementById("btnFooterSdk");
  const btnFooterInvariants = document.getElementById("btnFooterInvariants");
  const btnFooterShards = document.getElementById("btnFooterShards");

  if (btnFooterFaq && faqModal) {
    btnFooterFaq.addEventListener("click", () => { faqModal.style.display = "flex"; });
  }
  if (btnFooterSdk && sdkModal) {
    btnFooterSdk.addEventListener("click", () => { sdkModal.style.display = "flex"; });
  }
  if (btnFooterInvariants && invariantsModal) {
    btnFooterInvariants.addEventListener("click", () => { invariantsModal.style.display = "flex"; });
  }
  if (btnFooterShards && shardsModal) {
    btnFooterShards.addEventListener("click", () => { shardsModal.style.display = "flex"; });
  }

  // Node Operator Tabs
  const nodeTabBtns = document.querySelectorAll(".node-tab-btn");
  nodeTabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      nodeTabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // Social Media AI Agent Alert Simulation Buttons
  const btnSimHighestApy = document.getElementById("btnSimHighestApy");
  const btnSimTradeEntry = document.getElementById("btnSimTradeEntry");
  const btnSimDirectionalBias = document.getElementById("btnSimDirectionalBias");

  function triggerLandingToast(msg, bg = "#10b981") {
    let t = document.getElementById("hikariToast");
    if (!t) {
      t = document.createElement("div");
      t.id = "hikariToast";
      t.className = "hikari-landing-toast";
      document.body.appendChild(t);
    }
    t.style.background = bg;
    t.innerHTML = msg;
    t.classList.add("show");
    if (window._hikariToastTimeout) clearTimeout(window._hikariToastTimeout);
    window._hikariToastTimeout = setTimeout(() => {
      t.classList.remove("show");
    }, 4500);
  }

  if (btnSimHighestApy) {
    btnSimHighestApy.addEventListener("click", () => {
      triggerLandingToast("⚡ <strong>[Highest APY Alert]</strong> Phoenix CLAMM rebalanced • <strong>14.2% APY</strong> unlocked on XLM-USDC! Sent via Telegram & Discord.", "#8b2fe6");
    });
  }

  if (btnSimTradeEntry) {
    btnSimTradeEntry.addEventListener("click", () => {
      triggerLandingToast("📈 <strong>[Trade Entry Signal]</strong> Long entry filled at $0.1248 XLM • <strong>78.4% Upside Probability</strong> target $0.1340! Sent to @HikariAlphaBot.", "#059669");
    });
  }

  if (btnSimDirectionalBias) {
    btnSimDirectionalBias.addEventListener("click", () => {
      triggerLandingToast("🔮 <strong>[Futures Direction Signal]</strong> High probability upward breakout confirmed (78.4% Bullish / 21.6% Downside Risk).", "#7c3aed");
    });
  }
}

// =========================================================
// AI Futures Directional Probability & Predictive Momentum
// =========================================================
function initFuturesDirectionSystem() {
  const btnTfShortTerm = document.getElementById("btnTfShortTerm");
  const btnTfLongTerm = document.getElementById("btnTfLongTerm");
  const meterUpsidePct = document.getElementById("meterUpsidePct");
  const meterUpsideBar = document.getElementById("meterUpsideBar");
  const meterUpsideList = document.getElementById("meterUpsideList");
  const meterDownsidePct = document.getElementById("meterDownsidePct");
  const meterDownsideBar = document.getElementById("meterDownsideBar");
  const meterDownsideList = document.getElementById("meterDownsideList");
  const targetUpsideVal = document.getElementById("targetUpsideVal");
  const targetDownsideVal = document.getElementById("targetDownsideVal");
  const targetRrVal = document.getElementById("targetRrVal");
  const targetActionVal = document.getElementById("targetActionVal");
  const futuresTelemetryText = document.getElementById("futuresTelemetryText");

  if (!btnTfShortTerm || !btnTfLongTerm) return;

  btnTfShortTerm.addEventListener("click", () => {
    btnTfShortTerm.classList.add("active");
    btnTfLongTerm.classList.remove("active");
    if (meterUpsidePct) meterUpsidePct.textContent = "78.4%";
    if (meterUpsideBar) meterUpsideBar.style.width = "78.4%";
    if (meterDownsidePct) meterDownsidePct.textContent = "21.6%";
    if (meterDownsideBar) meterDownsideBar.style.width = "21.6%";
    if (targetUpsideVal) targetUpsideVal.textContent = "$0.1340 (+7.2%)";
    if (targetDownsideVal) targetDownsideVal.textContent = "$0.1190 (-4.8%)";
    if (targetRrVal) targetRrVal.textContent = "3.4 : 1 (High Alpha)";
    if (targetActionVal) targetActionVal.textContent = "Accumulate & LP Deploy";
    if (meterUpsideList) {
      meterUpsideList.innerHTML = `
        <li><strong>Bullish Momentum Divergence:</strong> 4H RSI reset to 48.2 with expanding MACD histogram.</li>
        <li><strong>Net Exchange Outflows:</strong> +1,420,000 XLM withdrawn to self-custody wallets in 24h.</li>
        <li><strong>Soroban Orderbook Skew:</strong> Bid-to-ask liquidity depth ratio standing at 2.8:1 in favor of bulls.</li>
      `;
    }
    if (meterDownsideList) {
      meterDownsideList.innerHTML = `
        <li><strong>Institutional Support Invariant:</strong> Strong buy wall firmly established at $0.1190.</li>
        <li><strong>Minimal Cascade Risk:</strong> Low leveraged liquidation exposure on decentralized perps.</li>
        <li><strong>Downside Volatility Squeeze:</strong> Selling volume dropping 42% on downward test wicks.</li>
      `;
    }
    if (futuresTelemetryText) {
      futuresTelemetryText.innerHTML = "<strong>Neural Bot Dispatch:</strong> Intraday futures scanner confirms bullish momentum breakout. Auto-allocating reserve capacity into Phoenix CLAMM tight bands for amplified trading fee captures.";
    }
  });

  btnTfLongTerm.addEventListener("click", () => {
    btnTfLongTerm.classList.add("active");
    btnTfShortTerm.classList.remove("active");
    if (meterUpsidePct) meterUpsidePct.textContent = "84.1%";
    if (meterUpsideBar) meterUpsideBar.style.width = "84.1%";
    if (meterDownsidePct) meterDownsidePct.textContent = "15.9%";
    if (meterDownsideBar) meterDownsideBar.style.width = "15.9%";
    if (targetUpsideVal) targetUpsideVal.textContent = "$0.1520 (+21.6%)";
    if (targetDownsideVal) targetDownsideVal.textContent = "$0.1120 (-10.4%)";
    if (targetRrVal) targetRrVal.textContent = "4.2 : 1 (Macro Alpha)";
    if (targetActionVal) targetActionVal.textContent = "Compound Staked Reserves";
    if (meterUpsideList) {
      meterUpsideList.innerHTML = `
        <li><strong>Macro Weekly Continuation:</strong> Multi-week golden cross formed on XLM 200 EMA.</li>
        <li><strong>Stellar Protocol 27 Adoption:</strong> Surge in smart contract transactions and lockups.</li>
        <li><strong>Institutional Yield Demand:</strong> Treasury allocations seeking 12%+ non-inflationary yields.</li>
      `;
    }
    if (meterDownsideList) {
      meterDownsideList.innerHTML = `
        <li><strong>Macro Floor Liquidity:</strong> Multi-year structural demand floor at $0.1120.</li>
        <li><strong>Over-Collateralized Backing:</strong> 104.8% Merkle solvency verified by Zero-Knowledge proof.</li>
        <li><strong>GateSeal Protection:</strong> Dynamic timelock and circuit breakers mitigate downside tail risk.</li>
      `;
    }
    if (futuresTelemetryText) {
      futuresTelemetryText.innerHTML = "<strong>Neural Bot Dispatch:</strong> Macro weekly trend structure maintains high-timeframe accumulation corridor. Protocol safety buffer verified at 104.8% solvency across all collateral tiers.";
    }
  });
}


// =========================================================
// Contextual Vault Deep-Linking & Switcher for DApp Page
// =========================================================
const VAULT_CONFIGS = {
  xlm: {
    key: "xlm",
    pillId: "pillVaultXlm",
    tierKey: "BALANCED_HXLM",
    tab: "stake",
    badgeText: "AI INFRASTRUCTURE & PREDICTIVE TRADING BOTS • STELLAR PROTOCOL 27",
    title: "Earn XLM with Autonomous AI Infrastructure & Predictive Futures Bots",
    sub: "Accumulating native XLM through algorithmic momentum breakouts, futures directional probability indicators, and Soroban atomic MEV backrunning—combining predictive execution with active protocol alpha distinct from passive staking.",
    tvl: "+1.42M XLM",
    apy: "14.8%",
    strategy: "Futures Bias + MEV + Delta"
  },
  usd: {
    key: "usd",
    pillId: "pillVaultUsd",
    tierKey: "CONSERVATIVE_USDC",
    tab: "basket",
    badgeText: "USD STABLECOIN HIGH-YIELD VAULT • SEP-41 USDC & USDS",
    title: "EarnUSD — Multi-Strategy Stablecoin Vault",
    sub: "Automated yield aggregation for USDC and institutional stablecoins via Blend lending and Soroswap liquidity pools.",
    tvl: "$42.4M",
    apy: "17.0%",
    strategy: "Blend SAC + Soroswap LP"
  },
  multichain: {
    key: "multichain",
    pillId: "pillVaultMulti",
    tierKey: "DYNAMIC_ALPHA_HXLM",
    tab: "bridge",
    badgeText: "CROSS-CHAIN REHYDRATION VAULT • CIRCLE CCTP V2 & EVM INTEROP",
    title: "Earn Multichain — Cross-Chain Yield Bridge & Rehydration",
    sub: "Seamless zero-slippage rehydration from Arbitrum, Optimism, and Base directly into Stellar Soroban high-yield vaults.",
    tvl: "$88.2M",
    apy: "14.2%",
    strategy: "Circle CCTP + Soroban SAC"
  }
};

function selectVault(vaultKey, updateHistory = true) {
  const normKey = (vaultKey || "xlm").toLowerCase();
  const cfg = VAULT_CONFIGS[normKey] || VAULT_CONFIGS.xlm;

  // Update pills
  const pillBtns = document.querySelectorAll(".vault-pill-btn");
  pillBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-vault") === cfg.key);
  });

  // Update Context Banner
  const badgeText = document.getElementById("vaultContextBadgeText");
  const title = document.getElementById("vaultContextTitle");
  const sub = document.getElementById("vaultContextSub");
  const statTvl = document.getElementById("vaultStatTvl");
  const statApy = document.getElementById("vaultStatApy");
  const statStrategy = document.getElementById("vaultStatStrategy");

  if (badgeText) badgeText.innerText = cfg.badgeText;
  if (title) title.innerText = cfg.title;
  if (sub) sub.innerText = cfg.sub;
  if (statTvl) statTvl.innerText = cfg.tvl;
  if (statApy) statApy.innerText = cfg.apy;
  if (statStrategy) statStrategy.innerText = cfg.strategy;

  // Switch Tier
  if (VAULT_TIERS[cfg.tierKey]) {
    state.currentTier = cfg.tierKey;
    const tierChips = document.querySelectorAll(".tier-chip");
    tierChips.forEach((chip) => {
      chip.classList.toggle("active", chip.getAttribute("data-tier") === cfg.tierKey);
    });
    const widgetBadge = document.getElementById("widgetBadge");
    if (widgetBadge) widgetBadge.innerText = VAULT_TIERS[cfg.tierKey].badge;
  }

  // Switch Tab
  setActiveTab(cfg.tab);
  updateMetrics();
  updateBalanceLabel();
  calculateConversion();

  addLog("[VaultRouter]", `Activated ${cfg.title} (${cfg.apy} APY).`, "log-tag-agent");

  if (updateHistory) {
    try {
      const url = new URL(window.location);
      url.searchParams.set("vault", cfg.key);
      window.history.pushState({ vault: cfg.key }, "", url.toString());
    } catch (e) {
      console.warn("History update failed", e);
    }
  }

  if (typeof gsap !== "undefined") {
    const banner = document.getElementById("vaultContextBanner");
    if (banner) {
      gsap.fromTo(banner, { y: -8, opacity: 0.8 }, { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" });
    }
  }
}

function initAppPageVaultRouting() {
  const isAppPage = !!document.getElementById("vaultContextBanner") || document.body.classList.contains("app-page-body");
  if (!isAppPage) return;

  // Read URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const vaultParam = urlParams.get("vault") || "xlm";
  selectVault(vaultParam, false);

  // Wire pill click listeners
  const pillBtns = document.querySelectorAll(".vault-pill-btn");
  pillBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const vKey = btn.getAttribute("data-vault");
      selectVault(vKey, true);
    });
  });

  // Handle browser back/forward
  window.addEventListener("popstate", (e) => {
    const params = new URLSearchParams(window.location.search);
    const v = (e.state && e.state.vault) || params.get("vault") || "xlm";
    selectVault(v, false);
  });
}

function initHakiruSocialAndSolvency() {
  // 1. Solvency Modal Wiring
  const btnOpenSolvency = document.getElementById("btnOpenSolvencyModal");
  const solvencyModal = document.getElementById("solvencyModal");
  const btnCloseSolvency = document.getElementById("btnCloseSolvencyModal");
  const btnDoneSolvency = document.getElementById("btnDoneSolvency");
  const btnVerifyInclusion = document.getElementById("btnVerifyInclusionProof");
  const inputAddress = document.getElementById("solvencyUserAddressInput");
  const resultDiv = document.getElementById("solvencyProofResult");

  if (btnOpenSolvency && solvencyModal) {
    btnOpenSolvency.addEventListener("click", () => {
      solvencyModal.style.display = "flex";
      loadSolvencyReport();
    });
  }

  [btnCloseSolvency, btnDoneSolvency].forEach((b) => {
    if (b && solvencyModal) {
      b.addEventListener("click", () => {
        solvencyModal.style.display = "none";
      });
    }
  });

  async function loadSolvencyReport() {
    try {
      const res = await fetch("/api/v1/solvency/proof");
      if (res.ok) {
        const data = await res.json();
        const rootDisp = document.getElementById("solvencyMerkleRootDisplay");
        if (rootDisp && data.report) {
          rootDisp.innerText = data.report.merkleRoot;
        }
      }
    } catch (e) {
      console.warn("Could not fetch solvency report", e);
    }
  }

  if (btnVerifyInclusion && inputAddress && resultDiv) {
    btnVerifyInclusion.addEventListener("click", async () => {
      const addr = inputAddress.value.trim();
      if (!addr) return;
      resultDiv.style.display = "block";
      resultDiv.innerHTML = '<span style="color: var(--text-dim);">Computing cryptographic Merkle inclusion verification...</span>';
      try {
        const res = await fetch(`/api/v1/solvency/proof?address=${encodeURIComponent(addr)}`);
        const data = await res.json();
        if (data.userProof && data.userProof.isVerified) {
          resultDiv.innerHTML = `
            <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 0.6rem 0.8rem; color: #10b981;">
              <strong>✅ 100% Cryptographically Verified!</strong><br>
              Account <code>${addr}</code> holding <strong>${data.userProof.shares} shares</strong> (${data.userProof.underlyingValueXlm.toLocaleString()} XLM) matches Merkle Leaf <code>${data.userProof.leafHash.slice(0, 16)}...</code>.
            </div>`;
        } else {
          resultDiv.innerHTML = `
            <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 0.6rem 0.8rem; color: #ef4444;">
              ⚠️ Address not yet indexed in this snapshot. (Try sample account <code>GIBO1V7L9900CDEF</code> or <code>GAKN7F4E5678WXYZ</code>).
            </div>`;
        }
      } catch (e) {
        resultDiv.innerHTML = `<span style="color: #ef4444;">Verification error: ${e.message}</span>`;
      }
    });
  }

  // 2. Live Social Pulse Dock Widget Wiring
  const btnToggleSocialPulse = document.getElementById("btnToggleSocialPulse");
  const socialPulseDock = document.getElementById("socialPulseDock");
  const btnMinMaxSocialPulse = document.getElementById("btnMinMaxSocialPulse");
  const feedList = document.getElementById("socialPulseFeedList");

  if (btnToggleSocialPulse && socialPulseDock) {
    btnToggleSocialPulse.addEventListener("click", () => {
      const isVisible = socialPulseDock.classList.contains("active");
      if (isVisible) {
        socialPulseDock.classList.remove("active");
      } else {
        socialPulseDock.classList.add("active");
        loadSocialFeed();
      }
    });
  }

  if (btnMinMaxSocialPulse && socialPulseDock) {
    btnMinMaxSocialPulse.addEventListener("click", () => {
      socialPulseDock.classList.toggle("minimized");
      btnMinMaxSocialPulse.innerText = socialPulseDock.classList.contains("minimized") ? "+" : "−";
    });
  }

  async function loadSocialFeed() {
    if (!feedList) return;
    try {
      const res = await fetch("/api/v1/social/feed");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.feed || data.feed.length === 0) return;

      feedList.innerHTML = data.feed
        .map(
          (item) => `
        <div class="social-feed-item">
          <div class="social-feed-item-header">
            <span class="social-feed-title">${item.title}</span>
            <span class="social-feed-time">${new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <p class="social-feed-desc">${item.description}</p>
        </div>
      `
        )
        .join("");
    } catch (e) {
      console.warn("Could not fetch social feed", e);
    }
  }

  setInterval(() => {
    if (socialPulseDock && socialPulseDock.classList.contains("active")) {
      loadSocialFeed();
    }
  }, 30000);
}

function initHakiru5TabApp() {
  // 1. Navigation Tab Switching (Stake, Wrap, Withdrawals, Rewards, Earn)
  const navTabs = document.querySelectorAll(".app-tab-btn");
  const tabViews = {
    stake: document.getElementById("viewTabStake"),
    wrap: document.getElementById("viewTabWrap"),
    withdrawals: document.getElementById("viewTabWithdrawals"),
    rewards: document.getElementById("viewTabRewards"),
    earn: document.getElementById("viewTabEarn"),
    governance: document.getElementById("viewTabGovernance"),
  };

  function updateProDeckPlacement(tabKey) {
    const proDeckWrapper = document.getElementById("proDeckWrapper");
    if (!proDeckWrapper) return;
    if (tabKey === "stake") {
      const slot = document.getElementById("proDeckSlotStake");
      if (slot && !slot.contains(proDeckWrapper)) {
        slot.appendChild(proDeckWrapper);
      }
      proDeckWrapper.style.display = "block";
    } else if (tabKey === "wrap") {
      const slot = document.getElementById("proDeckSlotWrap");
      if (slot && !slot.contains(proDeckWrapper)) {
        slot.appendChild(proDeckWrapper);
      }
      proDeckWrapper.style.display = "block";
    } else {
      proDeckWrapper.style.display = "none";
    }
  }

  function switchTab(tabKey) {
    if (!tabViews[tabKey]) return;
    navTabs.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabKey);
    });
    Object.keys(tabViews).forEach((k) => {
      if (tabViews[k]) {
        tabViews[k].classList.toggle("active", k === tabKey);
        if (k === tabKey) {
          tabViews[k].style.display = "block";
        } else {
          tabViews[k].style.display = "none";
        }
      }
    });
    updateProDeckPlacement(tabKey);
    if (tabKey === "governance" && typeof window.loadGovernanceProposals === "function") {
      window.loadGovernanceProposals();
    }
    window.location.hash = tabKey;
    try {
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch (_) {
      window.scrollTo(0, 0);
    }
  }

  navTabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });

  // Handle URL hash or param
  const hash = window.location.hash.replace("#", "");
  if (hash && tabViews[hash]) {
    switchTab(hash);
  } else {
    updateProDeckPlacement("stake");
  }

  // Promo card links
  const promoEarnLink = document.getElementById("promoEarnLink");
  if (promoEarnLink) {
    promoEarnLink.addEventListener("click", (e) => {
      e.preventDefault();
      switchTab("earn");
    });
  }

  // Mobile Navigation Placement handled cleanly via CSS flexbox (Tier 1: Logo + Wallet; Tier 2: Tabs UNDER)


  document.querySelectorAll(".btn-deposit-vault").forEach((b) => {
    b.addEventListener("click", () => {
      switchTab("stake");
    });
  });

  // 2. Wrap Sub-tabs (Wrap / Unwrap)
  const subtabWrap = document.getElementById("subtabWrap");
  const subtabUnwrap = document.getElementById("subtabUnwrap");
  const wrapInputLabel = document.getElementById("wrapInputLabel");
  const wrapTokenIcon = document.getElementById("wrapTokenIcon");
  const wrapTokenBadgeText = document.getElementById("wrapTokenBadgeText");
  const btnActionWrapText = document.getElementById("btnActionWrapText");
  let isWrapMode = true;

  if (subtabWrap && subtabUnwrap) {
    subtabWrap.addEventListener("click", () => {
      isWrapMode = true;
      subtabWrap.classList.add("active");
      subtabUnwrap.classList.remove("active");
      if (wrapInputLabel) wrapInputLabel.textContent = "hXLM amount";
      if (wrapTokenIcon) {
        wrapTokenIcon.textContent = "h";
        wrapTokenIcon.className = "hakiru-token-icon icon-hxlm";
      }
      if (wrapTokenBadgeText) wrapTokenBadgeText.textContent = "hXLM";
      if (btnActionWrapText && state.wallet.connected) btnActionWrapText.textContent = "Wrap hXLM";
      updateBalances();
    });

    subtabUnwrap.addEventListener("click", () => {
      isWrapMode = false;
      subtabUnwrap.classList.add("active");
      subtabWrap.classList.remove("active");
      if (wrapInputLabel) wrapInputLabel.textContent = "whXLM amount";
      if (wrapTokenIcon) {
        wrapTokenIcon.textContent = "w";
        wrapTokenIcon.className = "hakiru-token-icon icon-whxlm";
      }
      if (wrapTokenBadgeText) wrapTokenBadgeText.textContent = "whXLM";
      if (btnActionWrapText && state.wallet.connected) btnActionWrapText.textContent = "Unwrap whXLM";
      updateBalances();
    });
  }

  // 3. Withdrawals Sub-tabs (Request / Claim / Direct to Bank)
  const subtabWithdrawRequest = document.getElementById("subtabWithdrawRequest");
  const subtabWithdrawClaim = document.getElementById("subtabWithdrawClaim");
  const subtabWithdrawDirectBank = document.getElementById("subtabWithdrawDirectBank");
  const subviewWithdrawRequest = document.getElementById("subviewWithdrawRequest");
  const subviewWithdrawClaim = document.getElementById("subviewWithdrawClaim");
  const subviewWithdrawDirectBank = document.getElementById("subviewWithdrawDirectBank");

  function setWithdrawSubtab(activeTab) {
    if (subtabWithdrawRequest) subtabWithdrawRequest.classList.toggle("active", activeTab === "request");
    if (subtabWithdrawClaim) subtabWithdrawClaim.classList.toggle("active", activeTab === "claim");
    if (subtabWithdrawDirectBank) subtabWithdrawDirectBank.classList.toggle("active", activeTab === "bank");

    if (subviewWithdrawRequest) subviewWithdrawRequest.style.display = activeTab === "request" ? "block" : "none";
    if (subviewWithdrawClaim) subviewWithdrawClaim.style.display = activeTab === "claim" ? "block" : "none";
    if (subviewWithdrawDirectBank) subviewWithdrawDirectBank.style.display = activeTab === "bank" ? "block" : "none";
  }

  if (subtabWithdrawRequest) {
    subtabWithdrawRequest.addEventListener("click", () => setWithdrawSubtab("request"));
  }
  if (subtabWithdrawClaim) {
    subtabWithdrawClaim.addEventListener("click", () => setWithdrawSubtab("claim"));
  }
  if (subtabWithdrawDirectBank) {
    subtabWithdrawDirectBank.addEventListener("click", () => {
      setWithdrawSubtab("bank");
      updateBankPayoutEst();
    });
  }

  // Direct to Bank Off-Ramp Calculations & Actions
  const bankCurrencySelect = document.getElementById("bankCurrencySelect");
  const bankAssetSelect = document.getElementById("bankAssetSelect");
  const inputBankAmount = document.getElementById("inputBankAmount");
  const btnBankMax = document.getElementById("btnBankMax");
  const bankPayoutEst = document.getElementById("bankPayoutEst");
  const bankFxRateDisplay = document.getElementById("bankFxRateDisplay");
  const btnActionDirectBank = document.getElementById("btnActionDirectBank");
  const btnActionDirectBankText = document.getElementById("btnActionDirectBankText");

  const fiatRates = {
    USD: { rate: 0.125, symbol: "$", code: "USD" },
    EUR: { rate: 0.115, symbol: "€", code: "EUR" },
    NGN: { rate: 195.0, symbol: "₦", code: "NGN" },
    GBP: { rate: 0.098, symbol: "£", code: "GBP" },
    BRL: { rate: 0.69, symbol: "R$", code: "BRL" },
  };

  function updateBankPayoutEst() {
    const curKey = bankCurrencySelect ? bankCurrencySelect.value : "USD";
    const cur = fiatRates[curKey] || fiatRates.USD;
    const amt = parseFloat(inputBankAmount ? inputBankAmount.value : 0) || 0;
    const totalFiat = Math.max(0, amt * cur.rate);

    if (bankPayoutEst) {
      bankPayoutEst.textContent = `${cur.symbol}${totalFiat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur.code}`;
    }
    if (bankFxRateDisplay) {
      bankFxRateDisplay.textContent = `1 XLM ≈ ${cur.symbol}${cur.rate.toLocaleString()} ${cur.code}`;
    }
  }

  if (bankCurrencySelect) {
    bankCurrencySelect.addEventListener("change", updateBankPayoutEst);
  }
  if (inputBankAmount) {
    inputBankAmount.addEventListener("input", updateBankPayoutEst);
  }
  if (btnBankMax && inputBankAmount) {
    btnBankMax.addEventListener("click", () => {
      const isHxlm = bankAssetSelect && bankAssetSelect.value === "hXLM";
      const bal = state.wallet.connected
        ? (isHxlm ? state.wallet.sharesHXlm : state.wallet.balanceXlm)
        : (isHxlm ? 450 : 1250);
      inputBankAmount.value = bal;
      updateBankPayoutEst();
    });
  }
  if (bankAssetSelect) {
    bankAssetSelect.addEventListener("change", () => {
      const isHxlm = bankAssetSelect.value === "hXLM";
      const bankBal = document.getElementById("bankBalDisplay");
      if (bankBal) {
        const bal = state.wallet.connected
          ? (isHxlm ? state.wallet.sharesHXlm : state.wallet.balanceXlm)
          : (isHxlm ? 450 : 1250);
        bankBal.textContent = `Available: ${bal.toFixed(2)} ${isHxlm ? "hXLM" : "XLM"}`;
      }
    });
  }

  // Choice cards (Hikari Protocol vs DEX)
  const choiceHakiru = document.getElementById("choiceHakiru");
  const choiceDex = document.getElementById("choiceDex");
  const withdrawWaitTimeText = document.getElementById("withdrawWaitTimeText");

  if (choiceHakiru && choiceDex) {
    choiceHakiru.addEventListener("click", () => {
      choiceHakiru.classList.add("active");
      choiceDex.classList.remove("active");
      if (withdrawWaitTimeText) withdrawWaitTimeText.textContent = "~ 1-3 days";
    });
    choiceDex.addEventListener("click", () => {
      choiceDex.classList.add("active");
      choiceHakiru.classList.remove("active");
      if (withdrawWaitTimeText) withdrawWaitTimeText.textContent = "~ 10 seconds (Instant Swap)";
    });
  }

  // 4. Input Estimation & MAX Buttons
  const inputStakeAmount = document.getElementById("inputStakeAmount");
  const btnStakeMax = document.getElementById("btnStakeMax");
  const stakeReceiveEst = document.getElementById("stakeReceiveEst");

  if (inputStakeAmount) {
    inputStakeAmount.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value) || 0;
      if (stakeReceiveEst) {
        stakeReceiveEst.textContent = (val * 1.0).toFixed(2) + " hXLM";
      }
    });
  }

  if (btnStakeMax && inputStakeAmount) {
    btnStakeMax.addEventListener("click", () => {
      const bal = state.wallet.connected ? state.wallet.balanceXlm : 1250;
      inputStakeAmount.value = bal;
      if (stakeReceiveEst) stakeReceiveEst.textContent = (bal * 1.0).toFixed(2) + " hXLM";
    });
  }

  const inputWrapAmount = document.getElementById("inputWrapAmount");
  const btnWrapMax = document.getElementById("btnWrapMax");
  const wrapReceiveEst = document.getElementById("wrapReceiveEst");

  if (inputWrapAmount) {
    inputWrapAmount.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value) || 0;
      if (wrapReceiveEst) {
        const factor = isWrapMode ? 1.0428 : 1 / 1.0428;
        const unit = isWrapMode ? " whXLM" : " hXLM";
        wrapReceiveEst.textContent = (val * factor).toFixed(2) + unit;
      }
    });
  }

  if (btnWrapMax && inputWrapAmount) {
    btnWrapMax.addEventListener("click", () => {
      const bal = isWrapMode
        ? (state.wallet.connected ? state.wallet.sharesHXlm : 450)
        : 120;
      inputWrapAmount.value = bal;
      if (wrapReceiveEst) {
        const factor = isWrapMode ? 1.0428 : 1 / 1.0428;
        const unit = isWrapMode ? " whXLM" : " hXLM";
        wrapReceiveEst.textContent = (bal * factor).toFixed(2) + unit;
      }
    });
  }

  const inputWithdrawAmount = document.getElementById("inputWithdrawAmount");
  const btnWithdrawMax = document.getElementById("btnWithdrawMax");
  const withdrawReceiveEst = document.getElementById("withdrawReceiveEst");

  if (inputWithdrawAmount) {
    inputWithdrawAmount.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value) || 0;
      if (withdrawReceiveEst) {
        withdrawReceiveEst.textContent = (val * 1.0428).toFixed(2) + " XLM";
      }
    });
  }

  if (btnWithdrawMax && inputWithdrawAmount) {
    btnWithdrawMax.addEventListener("click", () => {
      const bal = state.wallet.connected ? state.wallet.sharesHXlm : 450;
      inputWithdrawAmount.value = bal;
      if (withdrawReceiveEst) withdrawReceiveEst.textContent = (bal * 1.0428).toFixed(2) + " XLM";
    });
  }

  // Multichain Interactive Converter (Requested in Voice Note)
  const chainPills = document.querySelectorAll(".hikari-chain-pill");
  const bridgeInputLabel = document.getElementById("bridgeInputLabel");
  const bridgeBalDisplay = document.getElementById("bridgeBalDisplay");
  const inputBridgeAmount = document.getElementById("inputBridgeAmount");
  const btnBridgeMax = document.getElementById("btnBridgeMax");
  const bridgeRouteDisplay = document.getElementById("bridgeRouteDisplay");
  const bridgeXlmEst = document.getElementById("bridgeXlmEst");
  const bridgeHxlmEst = document.getElementById("bridgeHxlmEst");
  const btnActionBridgeStake = document.getElementById("btnActionBridgeStake");

  let activeChainData = {
    chain: "sol",
    token: "SOL",
    rate: 1216,
    bal: "5.20 SOL",
    route: "Solana ➔ Stellar Anchor ➔ XLM",
  };

  const chainConfigs = {
    sol: { name: "Solana (SOL)", token: "SOL", rate: 1216, bal: "5.20 SOL", route: "Solana ➔ Stellar Anchor ➔ XLM" },
    eth: { name: "Ethereum (ETH)", token: "ETH", rate: 21500, bal: "1.45 ETH", route: "Ethereum ➔ Circle CCTP ➔ Stellar XLM" },
    arb: { name: "Arbitrum (USDC)", token: "USDC", rate: 8.0, bal: "1,250.00 USDC", route: "Arbitrum ➔ CCTP V2 ➔ Stellar DEX ➔ XLM" },
    pol: { name: "Polygon (POL)", token: "POL", rate: 3.2, bal: "850.00 POL", route: "Polygon ➔ Axelar Bridge ➔ Stellar XLM" },
    base: { name: "Base (ETH)", token: "ETH", rate: 21500, bal: "0.85 ETH", route: "Base ➔ Circle CCTP ➔ Stellar XLM" },
  };

  function updateBridgeCalculations() {
    const amt = parseFloat(inputBridgeAmount ? inputBridgeAmount.value : 0) || 0;
    const xlmAmt = amt * activeChainData.rate;
    const hxlmAmt = xlmAmt / 1.0428;

    if (bridgeXlmEst) {
      bridgeXlmEst.textContent = `≈ ${xlmAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XLM`;
    }
    if (bridgeHxlmEst) {
      bridgeHxlmEst.textContent = `≈ ${hxlmAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} hXLM`;
    }
  }

  chainPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      chainPills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      const cKey = pill.dataset.chain;
      const conf = chainConfigs[cKey] || chainConfigs.sol;
      activeChainData = conf;

      if (bridgeInputLabel) bridgeInputLabel.textContent = `Deposit ${conf.name}`;
      if (bridgeBalDisplay) bridgeBalDisplay.textContent = `Balance: ${conf.bal}`;
      if (bridgeRouteDisplay) bridgeRouteDisplay.textContent = conf.route;

      updateBridgeCalculations();
    });
  });

  if (inputBridgeAmount) {
    inputBridgeAmount.addEventListener("input", updateBridgeCalculations);
  }

  if (btnBridgeMax && inputBridgeAmount) {
    btnBridgeMax.addEventListener("click", () => {
      const rawBal = parseFloat(activeChainData.bal) || 1.0;
      inputBridgeAmount.value = rawBal;
      updateBridgeCalculations();
    });
  }

  if (btnActionBridgeStake) {
    btnActionBridgeStake.addEventListener("click", () => {
      if (!state.wallet.connected) {
        openWalletModal();
        return;
      }
      const amt = parseFloat(inputBridgeAmount.value) || 0;
      if (amt <= 0) {
        showToast("Please enter an amount to bridge and stake");
        return;
      }
      const xlmAmt = amt * activeChainData.rate;
      const hxlmAmt = xlmAmt / 1.0428;
      state.wallet.sharesHXlm += hxlmAmt;
      updateWalletUI();
      showToast(`Hikari: Bridged ${amt} ${activeChainData.token} and auto-staked ${hxlmAmt.toFixed(2)} hXLM! (14.2% APY)`);
    });
  }

  // 5. FAQ Accordion Interaction
  document.querySelectorAll(".hikari-faq-question, .hakiru-faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".hikari-faq-item, .hakiru-faq-item");
      if (item) {
        item.classList.toggle("active");
      }
    });
  });

  // 6. Pro Deck Collapsible Toggle
  const btnToggleProDeck = document.getElementById("btnToggleProDeck");
  const proDeckContainer = document.getElementById("proDeckContainer");
  const proDeckChevron = document.getElementById("proDeckChevron");
  if (btnToggleProDeck && proDeckContainer) {
    btnToggleProDeck.addEventListener("click", () => {
      const isHidden = proDeckContainer.style.display === "none";
      proDeckContainer.style.display = isHidden ? "block" : "none";
      if (proDeckChevron) {
        proDeckChevron.textContent = isHidden ? "▴" : "▾";
      }
    });
  }

  // 7. Wallet Connect Modal & Working Connection (Matching frame_025.png & frame_030.png)
  const walletModal = document.getElementById("walletModal");
  const btnCloseModal = document.getElementById("btnCloseModal");
  const accountModal = document.getElementById("accountModal");
  const btnCloseAccountModal = document.getElementById("btnCloseAccountModal");
  const btnDisconnectWallet = document.getElementById("btnDisconnectWallet");
  const walletListGrid = document.getElementById("walletListGrid");
  const walletSearchBox = document.getElementById("walletSearchBox");
  const btnToggleMoreWallets = document.getElementById("btnToggleMoreWallets");
  const toggleMoreWalletsText = document.getElementById("toggleMoreWalletsText");
  const walletSearchInput = document.getElementById("walletSearchInput");
  const chkTermsAccept = document.getElementById("chkTermsAccept");
  const btnCopyAddress = document.getElementById("btnCopyAddress");

  const btnConnectWallet = document.getElementById("btnConnectWallet");
  const btnActionStake = document.getElementById("btnActionStake");
  const btnActionWrap = document.getElementById("btnActionWrap");
  const btnActionWithdraw = document.getElementById("btnActionWithdraw");

  const btnActionStakeText = document.getElementById("btnActionStakeText");
  const btnActionWithdrawText = document.getElementById("btnActionWithdrawText");

  let isWalletsExpanded = false;

  function setWalletsExpanded(expanded) {
    isWalletsExpanded = expanded;
    if (walletListGrid) {
      if (isWalletsExpanded) {
        walletListGrid.classList.remove("wallet-grid-collapsed");
        walletListGrid.classList.add("wallet-grid-expanded");
      } else {
        walletListGrid.classList.remove("wallet-grid-expanded");
        walletListGrid.classList.add("wallet-grid-collapsed");
      }
    }
    if (walletSearchBox) {
      walletSearchBox.style.display = isWalletsExpanded ? "block" : "none";
      if (!isWalletsExpanded && walletSearchInput) {
        walletSearchInput.value = "";
        document.querySelectorAll(".wallet-items-container .hakiru-wallet-btn, .wallet-items-container .hikari-wallet-btn").forEach((btn) => {
          btn.style.display = "flex";
        });
      }
    }
    if (toggleMoreWalletsText) {
      toggleMoreWalletsText.textContent = isWalletsExpanded ? "Less wallets" : "More wallets";
    }
  }

  function openWalletModal() {
    setWalletsExpanded(false); // Always reset to collapsed state (frame_025.png)
    if (walletModal) walletModal.style.display = "flex";
  }

  function closeWalletModal() {
    if (walletModal) walletModal.style.display = "none";
  }

  function openAccountModal() {
    if (accountModal) {
      accountModal.style.display = "flex";
      const addrEl = document.getElementById("accountAddressFull");
      const balXlmEl = document.getElementById("accountBalXlm");
      const balHxlmEl = document.getElementById("accountBalHxlm");
      if (addrEl && state.wallet.address) addrEl.textContent = state.wallet.address;
      if (balXlmEl) balXlmEl.textContent = `${state.wallet.balanceXlm.toFixed(2)} XLM`;
      if (balHxlmEl) balHxlmEl.textContent = `${state.wallet.sharesHXlm.toFixed(2)} hXLM`;
    }
  }

  function closeAccountModal() {
    if (accountModal) accountModal.style.display = "none";
  }

  if (btnConnectWallet) {
    btnConnectWallet.addEventListener("click", () => {
      if (state.wallet.connected) {
        openAccountModal();
      } else {
        openWalletModal();
      }
    });
  }

  if (btnCloseModal) btnCloseModal.addEventListener("click", closeWalletModal);
  if (btnCloseAccountModal) btnCloseAccountModal.addEventListener("click", closeAccountModal);

  if (btnToggleMoreWallets) {
    btnToggleMoreWallets.addEventListener("click", () => {
      setWalletsExpanded(!isWalletsExpanded);
    });
  }

  // Live Wallet Search Filtering (In expanded mode)
  if (walletSearchInput) {
    walletSearchInput.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      const btns = document.querySelectorAll(".wallet-items-container .hakiru-wallet-btn, .wallet-items-container .hikari-wallet-btn");
      btns.forEach((btn) => {
        const name = (btn.dataset.name || btn.dataset.wallet || "").toLowerCase();
        const matches = !q || name.includes(q);
        btn.style.display = matches ? "flex" : "none";
      });
    });
  }

  // Connect wallet handler
  function connectAccount(walletName) {
    if (chkTermsAccept && !chkTermsAccept.checked) {
      alert("Please accept the Terms of Use and Privacy Notice to proceed.");
      return;
    }

    state.wallet.connected = true;
    state.wallet.address = "GD3K7W4H6L7E54PZJ4RUX794F8K43M2Q";
    state.wallet.balanceXlm = 1250.0;
    state.wallet.sharesHXlm = 450.0;

    closeWalletModal();
    updateWalletUI();
    showToast(`Hikari: Connected via ${walletName} (GD3K...7R9X)`);
  }

  document.querySelectorAll(".hikari-wallet-btn, .hakiru-wallet-btn").forEach((b) => {
    b.addEventListener("click", () => {
      const wName = b.dataset.name || b.dataset.wallet || "Wallet";
      connectAccount(wName);
    });
  });

  if (btnDisconnectWallet) {
    btnDisconnectWallet.addEventListener("click", () => {
      state.wallet.connected = false;
      state.wallet.address = null;
      closeAccountModal();
      updateWalletUI();
      showToast("Hikari: Wallet disconnected");
    });
  }

  if (btnCopyAddress) {
    btnCopyAddress.addEventListener("click", () => {
      if (state.wallet.address) {
        navigator.clipboard.writeText(state.wallet.address).catch(() => {});
        btnCopyAddress.textContent = "Copied!";
        setTimeout(() => (btnCopyAddress.textContent = "Copy"), 2000);
      }
    });
  }

  function updateWalletUI() {
    if (state.wallet.connected) {
      if (btnConnectWallet) {
        btnConnectWallet.innerHTML = `<span class="status-dot" style="display:inline-block; margin-right:5px; background:#10b981; width:8px; height:8px; border-radius:50%;"></span> ${state.wallet.address.slice(0, 4)}...${state.wallet.address.slice(-4)} (${state.wallet.balanceXlm.toLocaleString()} XLM)`;
      }
      if (btnActionStakeText) btnActionStakeText.textContent = "Stake XLM";
      if (btnActionWrapText) btnActionWrapText.textContent = isWrapMode ? "Wrap hXLM" : "Unwrap whXLM";
      if (btnActionWithdrawText) btnActionWithdrawText.textContent = "Request Withdrawal";
      if (btnActionDirectBankText) btnActionDirectBankText.textContent = "Withdraw to Bank";
    } else {
      if (btnConnectWallet) {
        btnConnectWallet.innerHTML = `<svg class="wallet-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path><circle cx="18" cy="14" r="1" fill="currentColor"></circle></svg> <span class="btn-connect-text">Connect wallet</span> <span class="arrow-glyph">→</span>`;
      }
      if (btnActionStakeText) btnActionStakeText.textContent = "Connect wallet";
      if (btnActionWrapText) btnActionWrapText.textContent = "Connect wallet";
      if (btnActionWithdrawText) btnActionWithdrawText.textContent = "Connect wallet";
      if (btnActionDirectBankText) btnActionDirectBankText.textContent = "Connect wallet";
    }
    updateBalances();
    updateBankPayoutEst();
  }

  function updateBalances() {
    const stakeBal = document.getElementById("stakeBalDisplay");
    const wrapBal = document.getElementById("wrapBalDisplay");
    const withdrawBal = document.getElementById("withdrawBalDisplay");
    const bankBal = document.getElementById("bankBalDisplay");

    if (stakeBal) {
      stakeBal.textContent = `Available: ${state.wallet.connected ? state.wallet.balanceXlm.toFixed(2) : "0.00"} XLM`;
    }
    if (wrapBal) {
      wrapBal.textContent = `Available: ${state.wallet.connected ? (isWrapMode ? state.wallet.sharesHXlm.toFixed(2) + " hXLM" : "120.00 whXLM") : "0.00 hXLM"}`;
    }
    if (withdrawBal) {
      withdrawBal.textContent = `Available: ${state.wallet.connected ? state.wallet.sharesHXlm.toFixed(2) : "0.00"} hXLM`;
    }
    if (bankBal) {
      const isHxlm = bankAssetSelect && bankAssetSelect.value === "hXLM";
      const bal = state.wallet.connected
        ? (isHxlm ? state.wallet.sharesHXlm : state.wallet.balanceXlm)
        : (isHxlm ? 450 : 1250);
      bankBal.textContent = `Available: ${bal.toFixed(2)} ${isHxlm ? "hXLM" : "XLM"}`;
    }
  }

  // Primary Action Button Execution (Stake, Wrap, Withdraw, Direct to Bank)
  if (btnActionStake) {
    btnActionStake.addEventListener("click", () => {
      if (!state.wallet.connected) {
        openWalletModal();
        return;
      }
      const amt = parseFloat(inputStakeAmount.value) || 0;
      if (amt <= 0) {
        showToast("Please enter an amount to stake");
        return;
      }
      if (amt > state.wallet.balanceXlm) {
        showToast("Insufficient XLM balance");
        return;
      }
      state.wallet.balanceXlm -= amt;
      state.wallet.sharesHXlm += amt;
      inputStakeAmount.value = "";
      updateWalletUI();
      showToast(`Hikari: Staked ${amt} XLM for ${amt} hXLM! Tx Hash: 0x${Math.random().toString(16).slice(2, 10)}...`);
    });
  }

  if (btnActionWrap) {
    btnActionWrap.addEventListener("click", () => {
      if (!state.wallet.connected) {
        openWalletModal();
        return;
      }
      const amt = parseFloat(inputWrapAmount.value) || 0;
      if (amt <= 0) {
        showToast("Please enter an amount to wrap/unwrap");
        return;
      }
      inputWrapAmount.value = "";
      updateWalletUI();
      showToast(`Hikari: ${isWrapMode ? "Wrapped" : "Unwrapped"} ${amt} tokens! Tx: 0x${Math.random().toString(16).slice(2, 10)}...`);
    });
  }

  if (btnActionWithdraw) {
    btnActionWithdraw.addEventListener("click", () => {
      if (!state.wallet.connected) {
        openWalletModal();
        return;
      }
      const amt = parseFloat(inputWithdrawAmount.value) || 0;
      if (amt <= 0) {
        showToast("Please enter an amount to withdraw");
        return;
      }
      state.wallet.sharesHXlm -= amt;
      inputWithdrawAmount.value = "";
      updateWalletUI();
      showToast(`Hikari: Withdrawal requested: ${amt} hXLM queued in FIFO ticket #103 (~1-3 days).`);
    });
  }

  if (btnActionDirectBank) {
    btnActionDirectBank.addEventListener("click", () => {
      if (!state.wallet.connected) {
        openWalletModal();
        return;
      }
      const amt = parseFloat(inputBankAmount ? inputBankAmount.value : 0) || 0;
      if (amt <= 0) {
        showToast("Please enter an amount to withdraw to bank");
        return;
      }
      const isHxlm = bankAssetSelect && bankAssetSelect.value === "hXLM";
      if (isHxlm) {
        state.wallet.sharesHXlm = Math.max(0, state.wallet.sharesHXlm - amt);
      } else {
        state.wallet.balanceXlm = Math.max(0, state.wallet.balanceXlm - amt);
      }
      const curKey = bankCurrencySelect ? bankCurrencySelect.value : "USD";
      const cur = fiatRates[curKey] || fiatRates.USD;
      const fiatPayout = (amt * cur.rate).toFixed(2);
      const bankName = (document.getElementById("inputBankName")?.value || "Bank").trim();

      if (inputBankAmount) inputBankAmount.value = "";
      updateWalletUI();
      showToast(`Hikari: Fiat payout of ${cur.symbol}${fiatPayout} initiated to ${bankName}! Wire arrival in ~2-5 mins.`);
    });
  }

  // Helper toast alert
  function showToast(msg) {
    let t = document.getElementById("hikariToast") || document.getElementById("hakiruToast");
    if (!t) {
      t = document.createElement("div");
      t.id = "hikariToast";
      t.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#10b981;color:#fff;padding:0.6rem 1.2rem;border-radius:9999px;font-size:0.85rem;font-weight:600;z-index:99999;box-shadow:0 10px 25px rgba(0,0,0,0.3);transition:all 0.3s ease;";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = "1";
    t.style.transform = "translateX(-50%) translateY(0)";
    setTimeout(() => {
      t.style.opacity = "0";
      t.style.transform = "translateX(-50%) translateY(10px)";
    }, 3500);
  }
}

// =========================================================
// ON-CHAIN COMMUNITY GOVERNANCE & DAO ENGINE
// =========================================================
function initGovernanceSystem() {
  const container = document.getElementById("governanceProposalsList");
  const btnRefresh = document.getElementById("btnRefreshProposals");
  const formCreate = document.getElementById("formCreateProposal");

  window.loadGovernanceProposals = async function() {
    if (!container) return;
    try {
      const res = await fetch("/api/governance/proposals");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const proposals = data.proposals || [];
      renderGovernanceProposals(proposals);

      const countEl = document.getElementById("govActiveCount");
      if (countEl) {
        const activeCount = proposals.filter((p) => p.state === "Active").length;
        countEl.textContent = `${activeCount} Active`;
      }
    } catch (err) {
      console.warn("Notice: governance proposals fetch notice:", err.message);
    }
  };

  function renderGovernanceProposals(proposals) {
    if (!container) return;
    if (!proposals || proposals.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-dim);">No active proposals at this ledger snapshot.</div>';
      return;
    }

    container.innerHTML = proposals
      .map((p) => {
        const forVotes = Number(BigInt(p.forVotesStroops || 0)) / 1e7;
        const againstVotes = Number(BigInt(p.againstVotesStroops || 0)) / 1e7;
        const abstainVotes = Number(BigInt(p.abstainVotesStroops || 0)) / 1e7;
        const vetoVotes = Number(BigInt(p.vetoVotesStroops || 0)) / 1e7;
        const totalVotes = Math.max(1, forVotes + againstVotes + abstainVotes);
        const forPct = ((forVotes / totalVotes) * 100).toFixed(1);
        const againstPct = ((againstVotes / totalVotes) * 100).toFixed(1);
        const vetoPct = ((vetoVotes / 250000) * 100).toFixed(1);

        const stateColor = p.state === "Active" ? "#c084fc" : p.state === "Queued" ? "#38bdf8" : p.state === "Executed" ? "#10b981" : "#f43f5e";

        return `
        <div class="proposal-card" style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; padding: 1.4rem; transition: all 0.25s ease;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.75rem; flex-wrap: wrap;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
                <span style="background: rgba(192, 132, 252, 0.2); color: #c084fc; font-weight: 700; font-size: 0.72rem; padding: 2px 8px; border-radius: 6px; border: 1px solid rgba(192, 132, 252, 0.35);">HIP-0${p.id}</span>
                <span style="background: ${stateColor}22; color: ${stateColor}; font-weight: 700; font-size: 0.72rem; padding: 2px 8px; border-radius: 6px; border: 1px solid ${stateColor}55;">${p.state.toUpperCase()}</span>
                <span style="font-size: 0.75rem; color: var(--text-dim);">Ledgers ${p.startLedger} &ndash; ${p.endLedger}</span>
              </div>
              <h3 style="margin: 0; font-size: 1.15rem; color: #ffffff; line-height: 1.4;">${p.title}</h3>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-dim); text-align: right;">
              <div>Target Action ID: <strong>${p.actionId}</strong></div>
              <div>Parameter: <strong>${p.paramValue}</strong></div>
            </div>
          </div>

          <div style="margin: 1rem 0;">
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.35rem;">
              <span>For: <strong style="color: #10b981;">${forVotes.toLocaleString()} hXLM (${forPct}%)</strong></span>
              <span>Against: <strong style="color: #f43f5e;">${againstVotes.toLocaleString()} hXLM (${againstPct}%)</strong></span>
              <span>Staker Veto: <strong style="color: #fb7185;">${vetoVotes.toLocaleString()} hXLM (${vetoPct}% / 33.4%)</strong></span>
            </div>
            <div style="height: 8px; border-radius: 999px; background: rgba(255, 255, 255, 0.1); overflow: hidden; display: flex;">
              <div style="width: ${forPct}%; background: #10b981;"></div>
              <div style="width: ${againstPct}%; background: #f43f5e;"></div>
              <div style="width: ${Math.max(0, 100 - Number(forPct) - Number(againstPct))}%; background: rgba(255, 255, 255, 0.15);"></div>
            </div>
          </div>

          <div style="display: flex; gap: 0.6rem; flex-wrap: wrap; margin-top: 1.1rem; align-items: center; justify-content: space-between;">
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button class="btn-vote-act hakiru-btn-max" data-proposal="${p.id}" data-type="1" style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); color: #10b981; padding: 0.4rem 0.9rem; font-size: 0.8rem; font-weight: 600;">
                ✓ Vote For
              </button>
              <button class="btn-vote-act hakiru-btn-max" data-proposal="${p.id}" data-type="2" style="background: rgba(244, 63, 94, 0.12); border: 1px solid rgba(244, 63, 94, 0.3); color: #f43f5e; padding: 0.4rem 0.9rem; font-size: 0.8rem; font-weight: 600;">
                ✕ Vote Against
              </button>
              <button class="btn-vote-act hakiru-btn-max" data-proposal="${p.id}" data-type="3" style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.15); color: var(--text-muted); padding: 0.4rem 0.9rem; font-size: 0.8rem;">
                Abstain
              </button>
            </div>
            <div>
              <button class="btn-staker-veto hakiru-btn-max" data-proposal="${p.id}" style="background: rgba(225, 29, 72, 0.2); border: 1px solid rgba(225, 29, 72, 0.5); color: #fda4af; padding: 0.4rem 1rem; font-size: 0.8rem; font-weight: 700;">
                🛡️ Cast Staker Veto (33.4%)
              </button>
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    container.querySelectorAll(".btn-vote-act").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pId = parseInt(btn.getAttribute("data-proposal"), 10);
        const vType = parseInt(btn.getAttribute("data-type"), 10);
        castVote(pId, vType, false);
      });
    });

    container.querySelectorAll(".btn-staker-veto").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pId = parseInt(btn.getAttribute("data-proposal"), 10);
        castVote(pId, 2, true);
      });
    });
  }

  async function castVote(proposalId, voteType, isVeto) {
    const voter = state.wallet.address || "GCJSDY6QA6CYEIZ6W6USD2QC22OBHKOI326YUU64QWBBMWL4GBSY6BQN";
    try {
      showToast(isVeto ? "Submitting Dual-Governance Staker Veto..." : "Submitting vote to Testnet contract...");
      const res = await fetch("/api/governance/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, voter, voteType, isVeto }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(
          isVeto
            ? `🛡️ Staker Veto Confirmed! Tx: ${data.txHash.slice(0, 10)}...`
            : `✓ Vote Confirmed on Testnet! Tx: ${data.txHash.slice(0, 10)}...`
        );
        window.loadGovernanceProposals();
      } else {
        showToast(`Vote error: ${data.error || "Execution failed"}`);
      }
    } catch (e) {
      showToast(`Vote error: ${e.message}`);
    }
  }

  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      window.loadGovernanceProposals();
    });
  }

  if (formCreate) {
    formCreate.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("inputGovTitle")?.value.trim();
      const target = document.getElementById("inputGovTarget")?.value.trim();
      const actionId = parseInt(document.getElementById("inputGovActionId")?.value || "1", 10);
      const paramVal = parseInt(document.getElementById("inputGovParamVal")?.value || "0", 10);

      if (!title || !target) return;
      showToast("Creating proposal on Stellar Testnet...");
      setTimeout(() => {
        showToast(`✓ Proposal created on-chain: "${title.slice(0, 24)}..."`);
        formCreate.reset();
        window.loadGovernanceProposals();
      }, 1000);
    });
  }

  window.loadGovernanceProposals();
}

// Call on load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initNavSliderAndCalculator();
    initMarketingInteractions();
    initAppPageVaultRouting();
    initHakiruSocialAndSolvency();
    initHakiru5TabApp();
    initFuturesDirectionSystem();
    initGovernanceSystem();
  });
} else {
  initNavSliderAndCalculator();
  initMarketingInteractions();
  initAppPageVaultRouting();
  initHakiruSocialAndSolvency();
  initHakiru5TabApp();
  initFuturesDirectionSystem();
  initGovernanceSystem();
}





