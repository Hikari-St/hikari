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
    ClammPool,
    TickLower,
    TickUpper,
    ConcentratedLiquidity,
    PrincipalValue,
    AccruedSwapFees,
    TargetFeeBps,
    Paused,
}

#[contract]
pub struct PhoenixAdapter;

#[contractimpl]
impl PhoenixAdapter {
    pub fn __constructor(
        env: Env,
        vault: Address,
        asset: Address,
        clamm_pool: Address,
        tick_lower: i32,
        tick_upper: i32,
        target_fee_bps: u32,
    ) {
        if tick_lower >= tick_upper {
            panic!("invalid tick range: lower must be strictly less than upper");
        }
        env.storage().instance().set(&DataKey::Vault, &vault);
        env.storage().instance().set(&DataKey::UnderlyingAsset, &asset);
        env.storage().instance().set(&DataKey::ClammPool, &clamm_pool);
        env.storage().instance().set(&DataKey::TickLower, &tick_lower);
        env.storage().instance().set(&DataKey::TickUpper, &tick_upper);
        env.storage().instance().set(&DataKey::ConcentratedLiquidity, &0i128);
        env.storage().instance().set(&DataKey::PrincipalValue, &0i128);
        env.storage().instance().set(&DataKey::AccruedSwapFees, &0i128);
        env.storage().instance().set(&DataKey::TargetFeeBps, &target_fee_bps);
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

        // Compute concentrated liquidity units proportional to deposit
        let tick_lower: i32 = env.storage().instance().get(&DataKey::TickLower).unwrap();
        let tick_upper: i32 = env.storage().instance().get(&DataKey::TickUpper).unwrap();
        let tick_width = (tick_upper - tick_lower) as i128;
        let liquidity_units = if tick_width > 0 {
            amount * 1000 / tick_width
        } else {
            amount
        };

        let current_liq: i128 = env.storage().instance().get(&DataKey::ConcentratedLiquidity).unwrap_or(0);
        env.storage().instance().set(&DataKey::ConcentratedLiquidity, &(current_liq + liquidity_units));

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

        if fees >= amount {
            env.storage().instance().set(&DataKey::AccruedSwapFees, &(fees - amount));
        } else {
            let remainder = amount - fees;
            env.storage().instance().set(&DataKey::AccruedSwapFees, &0i128);
            let new_principal = if principal < remainder { 0 } else { principal - remainder };
            env.storage().instance().set(&DataKey::PrincipalValue, &new_principal);
        }

        // Adjust concentrated liquidity
        let current_liq: i128 = env.storage().instance().get(&DataKey::ConcentratedLiquidity).unwrap_or(0);
        let liq_to_burn = if total > 0 { (amount * current_liq) / total } else { 0 };
        let new_liq = if current_liq > liq_to_burn { current_liq - liq_to_burn } else { 0 };
        env.storage().instance().set(&DataKey::ConcentratedLiquidity, &new_liq);

        // Return tokens to vault if token balance exists
        let asset: Address = env.storage().instance().get(&DataKey::UnderlyingAsset).unwrap();
        let token_client = token::Client::new(&env, &asset);
        let contract_balance = token_client.balance(&env.current_contract_address());
        if contract_balance >= amount {
            token_client.transfer(&env.current_contract_address(), &vault, &amount);
        }

        Ok(amount)
    }

    pub fn total_value(env: Env) -> i128 {
        let principal: i128 = env.storage().instance().get(&DataKey::PrincipalValue).unwrap_or(0);
        let fees: i128 = env.storage().instance().get(&DataKey::AccruedSwapFees).unwrap_or(0);
        principal.saturating_add(fees)
    }

    /// Configured target fee rate this adapter accrues internally.
    /// NOTE: this is a self-contained simulated accrual rate, not a live read
    /// from the Phoenix CLAMM pool — this adapter does not call Phoenix.
    pub fn configured_rate_bps(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::TargetFeeBps).unwrap_or(0)
    }

    pub fn accrue_fees(env: Env, fee_amount: i128) -> Result<i128, Error> {
        let is_paused: bool = env.storage().instance().get(&DataKey::Paused).unwrap_or(false);
        if is_paused {
            return Err(Error::Paused);
        }
        if fee_amount <= 0 {
            return Err(Error::ZeroAmount);
        }

        let current_fees: i128 = env.storage().instance().get(&DataKey::AccruedSwapFees).unwrap_or(0);
        let new_fees = current_fees.checked_add(fee_amount).ok_or(Error::MathOverflow)?;
        env.storage().instance().set(&DataKey::AccruedSwapFees, &new_fees);

        Ok(new_fees)
    }

    pub fn recenter_ticks(env: Env, new_lower: i32, new_upper: i32) -> Result<(), Error> {
        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        vault.require_auth();

        if new_lower >= new_upper {
            return Err(Error::InvalidState);
        }

        env.storage().instance().set(&DataKey::TickLower, &new_lower);
        env.storage().instance().set(&DataKey::TickUpper, &new_upper);

        Ok(())
    }

    pub fn emergency_exit(env: Env) -> Result<i128, Error> {
        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        vault.require_auth();

        let total = Self::total_value(env.clone());
        env.storage().instance().set(&DataKey::PrincipalValue, &0i128);
        env.storage().instance().set(&DataKey::AccruedSwapFees, &0i128);
        env.storage().instance().set(&DataKey::ConcentratedLiquidity, &0i128);
        env.storage().instance().set(&DataKey::Paused, &true);

        let asset: Address = env.storage().instance().get(&DataKey::UnderlyingAsset).unwrap();
        let token_client = token::Client::new(&env, &asset);
        let balance = token_client.balance(&env.current_contract_address());
        if balance > 0 {
            token_client.transfer(&env.current_contract_address(), &vault, &balance);
        }

        Ok(total)
    }

    fn extend_ttl(env: &Env) {
        env.storage().instance().extend_ttl(LIFETIME_THRESHOLD, BUMP_AMOUNT);
    }
}

#[cfg(test)]
mod test;
