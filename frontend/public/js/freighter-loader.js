// frontend/public/js/freighter-loader.js
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
// Real Freighter Wallet Integration for Hikari Protocol

(function () {
  "use strict";

  const NETWORK = "TESTNET";
  const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
  const HORIZON_URL = "https://horizon-testnet.stellar.org";

  // Detect Freighter extension
  function isFreighterInstalled() {
    return typeof window !== "undefined" && typeof window.freighterApi !== "undefined";
  }

  async function isFreighterConnected() {
    if (!isFreighterInstalled()) return false;
    try {
      const { isConnected } = await window.freighterApi.isConnected();
      return isConnected;
    } catch {
      return false;
    }
  }

  async function requestFreighterAccess() {
    if (!isFreighterInstalled()) {
      throw new Error("Freighter wallet extension not detected. Please install it from freighter.app");
    }
    try {
      const accessObj = await window.freighterApi.requestAccess();
      // Freighter returns { address: string } on success
      return accessObj.address || accessObj;
    } catch (err) {
      throw new Error("Freighter access denied: " + (err.message || err));
    }
  }

  async function getFreighterPublicKey() {
    if (!isFreighterInstalled()) return null;
    try {
      const { address } = await window.freighterApi.getAddress();
      return address;
    } catch {
      return null;
    }
  }

  async function signTransactionWithFreighter(xdr) {
    if (!isFreighterInstalled()) {
      throw new Error("Freighter not installed");
    }
    try {
      const { signedTxXdr } = await window.freighterApi.signTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
        network: NETWORK,
      });
      return signedTxXdr;
    } catch (err) {
      throw new Error("Transaction signing rejected: " + (err.message || err));
    }
  }

  /**
   * Fetch native XLM balance from Horizon for a given Stellar address.
   */
  async function fetchNativeBalance(address) {
    const res = await fetch(`${HORIZON_URL}/accounts/${address}`);
    if (!res.ok) return 0;
    const account = await res.json();
    const nativeBal = account.balances.find((b) => b.asset_type === "native");
    return nativeBal ? parseFloat(nativeBal.balance) : 0;
  }

  /**
   * Fetch a Soroban SAC / SEP-41 token balance for a given address by calling
   * the token contract's `balance` function via the backend reader.
   */
  async function fetchTokenBalance(address, tokenContractId) {
    try {
      const res = await fetch(`/api/token-balance?address=${encodeURIComponent(address)}&token=${encodeURIComponent(tokenContractId)}`);
      if (!res.ok) return 0;
      const data = await res.json();
      return data.balance || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Fetch all relevant balances (native XLM + hXLM shares + hUSDC if applicable).
   */
  async function fetchAllBalances(address, contracts) {
    const [xlmBalance, hxlmBalance] = await Promise.all([
      fetchNativeBalance(address),
      contracts.tokenId ? fetchTokenBalance(address, contracts.tokenId) : Promise.resolve(0),
    ]);

    return {
      xlm: xlmBalance,
      hxlm: hxlmBalance,
    };
  }

  // Expose global API
  window.HikariWallet = {
    NETWORK,
    NETWORK_PASSPHRASE,
    HORIZON_URL,
    isFreighterInstalled,
    isFreighterConnected,
    requestFreighterAccess,
    getFreighterPublicKey,
    signTransactionWithFreighter,
    fetchNativeBalance,
    fetchTokenBalance,
    fetchAllBalances,
  };
})();
