#![no_std]
use hikari_interfaces::Error;
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env};

const DAY_IN_LEDGERS: u32 = 17280;
const BUMP_AMOUNT: u32 = 60 * DAY_IN_LEDGERS;
const LIFETIME_THRESHOLD: u32 = BUMP_AMOUNT - 10 * DAY_IN_LEDGERS;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Vault,
    UnderlyingAsset,
    PairAddress,
    LpSharesBalance,
    PrincipalValue,
    AccruedSwapFees,
    FeeAprBps,
    Paused,
}

#[contract]
pub struct SoroswapAdapter;

#[contractimpl]
impl SoroswapAdapter {
    pub fn __constructor(
        env: Env,
        vault: Address,
        asset: Address,
        pair: Address,
        fee_apr_bps: u32,
    ) {
        env.storage().instance().set(&DataKey::Vault, &vault);
        env.storage().instance().set(&DataKey::UnderlyingAsset, &asset);
        env.storage().instance().set(&DataKey::PairAddress, &pair);
        env.storage().instance().set(&DataKey::LpSharesBalance, &0i128);
        env.storage().instance().set(&DataKey::PrincipalValue, &0i128);
        env.storage().instance().set(&DataKey::AccruedSwapFees, &0i128);
        env.storage().instance().set(&DataKey::FeeAprBps, &fee_apr_bps);
        env.storage().instance().set(&DataKey::Paused, &false);
    }

    pub fn deposit(env: Env, amount: i128) -> Result<i128, Error> {
        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        vault.require_auth();

        let is_paused: bool = env.storage().instance().get(&DataKey::Paused).unwrap_or(false);
        if is_paused {
            return Err(Error::Paused);
        }
        if amount <= 0 {
            return Err(Error::ZeroAmount);
        }

        Self::extend_ttl(&env);

        let principal: i128 = env.storage().instance().get(&DataKey::PrincipalValue).unwrap_or(0);
        let new_principal = principal.checked_add(amount).ok_or(Error::MathOverflow)?;
        env.storage().instance().set(&DataKey::PrincipalValue, &new_principal);

        // Record simulated LP shares (1:1 with deposited value)
        let lp_shares: i128 = env.storage().instance().get(&DataKey::LpSharesBalance).unwrap_or(0);
        env.storage().instance().set(&DataKey::LpSharesBalance, &(lp_shares + amount));

        Ok(new_principal)
    }

    pub fn withdraw(env: Env, amount: i128) -> Result<i128, Error> {
        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        vault.require_auth();

        if amount <= 0 {
            return Err(Error::ZeroAmount);
        }

        Self::extend_ttl(&env);

        let total = Self::total_value(env.clone());
        if total < amount {
            return Err(Error::InsufficientBalance);
        }

        let principal: i128 = env.storage().instance().get(&DataKey::PrincipalValue).unwrap_or(0);
        let fees: i128 = env.storage().instance().get(&DataKey::AccruedSwapFees).unwrap_or(0);

        // Deduct from fees first, then principal
        if fees >= amount {
            env.storage().instance().set(&DataKey::AccruedSwapFees, &(fees - amount));
        } else {
            let remainder = amount - fees;
            env.storage().instance().set(&DataKey::AccruedSwapFees, &0i128);
            let new_principal = if principal < remainder { 0 } else { principal - remainder };
            env.storage().instance().set(&DataKey::PrincipalValue, &new_principal);
        }

        // Burn LP shares
        let lp_shares: i128 = env.storage().instance().get(&DataKey::LpSharesBalance).unwrap_or(0);
        let new_lp = if lp_shares < amount { 0 } else { lp_shares - amount };
        env.storage().instance().set(&DataKey::LpSharesBalance, &new_lp);

        // Transfer underlying token from adapter back to vault
        let asset: Address = env.storage().instance().get(&DataKey::UnderlyingAsset).unwrap();
        let token_client = token::Client::new(&env, &asset);
        token_client.transfer(&env.current_contract_address(), &vault, &amount);

        Ok(amount)
    }

    pub fn total_value(env: Env) -> i128 {
        let principal: i128 = env.storage().instance().get(&DataKey::PrincipalValue).unwrap_or(0);
        let fees: i128 = env.storage().instance().get(&DataKey::AccruedSwapFees).unwrap_or(0);
        principal + fees
    }

    /// Configured fee APR this adapter accrues internally.
    /// NOTE: this is a self-contained simulated accrual rate, not a live read
    /// from the Soroswap pair — this adapter does not call Soroswap.
    pub fn configured_rate_bps(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::FeeAprBps).unwrap_or(0)
    }

    pub fn harvest(env: Env) -> Result<i128, Error> {
        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        vault.require_auth();

        Self::extend_ttl(&env);

        let principal: i128 = env.storage().instance().get(&DataKey::PrincipalValue).unwrap_or(0);
        let rate_bps: u32 = env.storage().instance().get(&DataKey::FeeAprBps).unwrap_or(0);

        if principal == 0 || rate_bps == 0 {
            return Ok(0);
        }

        let fees_generated = (principal * (rate_bps as i128)) / 10000;
        let fees: i128 = env.storage().instance().get(&DataKey::AccruedSwapFees).unwrap_or(0);
        let new_fees = fees.checked_add(fees_generated).ok_or(Error::MathOverflow)?;
        env.storage().instance().set(&DataKey::AccruedSwapFees, &new_fees);

        Ok(fees_generated)
    }

    pub fn emergency_exit(env: Env) -> Result<i128, Error> {
        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        vault.require_auth();

        Self::extend_ttl(&env);

        let total = Self::total_value(env.clone());
        env.storage().instance().set(&DataKey::PrincipalValue, &0i128);
        env.storage().instance().set(&DataKey::AccruedSwapFees, &0i128);
        env.storage().instance().set(&DataKey::LpSharesBalance, &0i128);
        env.storage().instance().set(&DataKey::Paused, &true);

        if total > 0 {
            let asset: Address = env.storage().instance().get(&DataKey::UnderlyingAsset).unwrap();
            let token_client = token::Client::new(&env, &asset);
            token_client.transfer(&env.current_contract_address(), &vault, &total);
        }

        Ok(total)
    }

    fn extend_ttl(env: &Env) {
        env.storage().instance().extend_ttl(LIFETIME_THRESHOLD, BUMP_AMOUNT);
    }
}

mod test;
