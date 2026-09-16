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
    BlendPool,
    SuppliedPrincipal,
    AccruedInterest,
    LendingRateBps,
    Paused,
}

#[contract]
pub struct BlendAdapter;

#[contractimpl]
impl BlendAdapter {
    pub fn __constructor(
        env: Env,
        vault: Address,
        asset: Address,
        blend_pool: Address,
        lending_rate_bps: u32,
    ) {
        env.storage().instance().set(&DataKey::Vault, &vault);
        env.storage().instance().set(&DataKey::UnderlyingAsset, &asset);
        env.storage().instance().set(&DataKey::BlendPool, &blend_pool);
        env.storage().instance().set(&DataKey::SuppliedPrincipal, &0i128);
        env.storage().instance().set(&DataKey::AccruedInterest, &0i128);
        env.storage().instance().set(&DataKey::LendingRateBps, &lending_rate_bps);
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

        let principal: i128 = env.storage().instance().get(&DataKey::SuppliedPrincipal).unwrap_or(0);
        let new_principal = principal.checked_add(amount).ok_or(Error::MathOverflow)?;
        env.storage().instance().set(&DataKey::SuppliedPrincipal, &new_principal);

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

        let principal: i128 = env.storage().instance().get(&DataKey::SuppliedPrincipal).unwrap_or(0);
        let interest: i128 = env.storage().instance().get(&DataKey::AccruedInterest).unwrap_or(0);

        // Deduct from interest first, then principal
        if interest >= amount {
            env.storage().instance().set(&DataKey::AccruedInterest, &(interest - amount));
        } else {
            let remainder = amount - interest;
            env.storage().instance().set(&DataKey::AccruedInterest, &0i128);
            let new_principal = if principal < remainder { 0 } else { principal - remainder };
            env.storage().instance().set(&DataKey::SuppliedPrincipal, &new_principal);
        }

        // Transfer underlying token from adapter back to vault
        let asset: Address = env.storage().instance().get(&DataKey::UnderlyingAsset).unwrap();
        let token_client = token::Client::new(&env, &asset);
        token_client.transfer(&env.current_contract_address(), &vault, &amount);

        Ok(amount)
    }

    pub fn total_value(env: Env) -> i128 {
        let principal: i128 = env.storage().instance().get(&DataKey::SuppliedPrincipal).unwrap_or(0);
        let interest: i128 = env.storage().instance().get(&DataKey::AccruedInterest).unwrap_or(0);
        principal + interest
    }

    /// Configured fixed lending rate this adapter accrues internally.
    /// NOTE: this is a self-contained simulated accrual rate, not a live read
    /// from the Blend Protocol — this adapter does not call the Blend pool.
    pub fn configured_rate_bps(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::LendingRateBps).unwrap_or(0)
    }

    pub fn harvest(env: Env) -> Result<i128, Error> {
        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        vault.require_auth();

        Self::extend_ttl(&env);

        let principal: i128 = env.storage().instance().get(&DataKey::SuppliedPrincipal).unwrap_or(0);
        let rate_bps: u32 = env.storage().instance().get(&DataKey::LendingRateBps).unwrap_or(0);

        if principal == 0 || rate_bps == 0 {
            return Ok(0);
        }

        let yield_generated = (principal * (rate_bps as i128)) / 10000;
        let interest: i128 = env.storage().instance().get(&DataKey::AccruedInterest).unwrap_or(0);
        let new_interest = interest.checked_add(yield_generated).ok_or(Error::MathOverflow)?;
        env.storage().instance().set(&DataKey::AccruedInterest, &new_interest);

        Ok(yield_generated)
    }

    pub fn emergency_exit(env: Env) -> Result<i128, Error> {
        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        vault.require_auth();

        Self::extend_ttl(&env);

        let total = Self::total_value(env.clone());
        env.storage().instance().set(&DataKey::SuppliedPrincipal, &0i128);
        env.storage().instance().set(&DataKey::AccruedInterest, &0i128);
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
