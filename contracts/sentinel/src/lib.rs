#![no_std]
// Hikari Protocol: Safety Sentinel & Autonomous Circuit Breaker Contract
// Lead Architect & Maintainer: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>

use interfaces::{Error, SentinelTrait, VaultClient};
use soroban_sdk::{
    contract, contractimpl, symbol_short, Address, Env, Symbol,
};

const KEY_ADMIN: Symbol = symbol_short!("ADMIN");
const KEY_GUARDIAN: Symbol = symbol_short!("GUARDIAN");
const KEY_MAX_DRAWDOWN: Symbol = symbol_short!("MAX_DD");
const KEY_PAUSED: Symbol = symbol_short!("PAUSED");

#[contract]
pub struct HikariSentinel;

pub type HakiruSentinel = HikariSentinel;

#[contractimpl]
impl SentinelTrait for HikariSentinel {
    fn initialize(env: Env, admin: Address, max_drawdown_bps: u32) -> Result<(), Error> {
        if env.storage().instance().has(&KEY_ADMIN) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();

        env.storage().instance().set(&KEY_ADMIN, &admin);
        env.storage().instance().set(&KEY_GUARDIAN, &admin);
        env.storage().instance().set(&KEY_MAX_DRAWDOWN, &max_drawdown_bps);
        env.storage().instance().set(&KEY_PAUSED, &false);

        Ok(())
    }

    fn check_and_trigger(env: Env, vault: Address, current_drawdown_bps: u32) -> Result<bool, Error> {
        let max_dd: u32 = env.storage().instance().get(&KEY_MAX_DRAWDOWN).ok_or(Error::NotInitialized)?;

        if current_drawdown_bps >= max_dd {
            // Instant trigger emergency pause
            env.storage().instance().set(&KEY_PAUSED, &true);

            // Forward emergency pause to target vault
            let vault_client = VaultClient::new(&env, &vault);
            let _ = vault_client.pause(&env.current_contract_address());

            Ok(true)
        } else {
            Ok(false)
        }
    }

    fn emergency_pause_all(env: Env, caller: Address) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&KEY_ADMIN).ok_or(Error::NotInitialized)?;
        let guardian: Address = env.storage().instance().get(&KEY_GUARDIAN).ok_or(Error::NotInitialized)?;
        caller.require_auth();

        if caller != admin && caller != guardian {
            return Err(Error::Unauthorized);
        }

        env.storage().instance().set(&KEY_PAUSED, &true);
        Ok(())
    }

    fn is_paused(env: Env) -> bool {
        env.storage().instance().get(&KEY_PAUSED).unwrap_or(false)
    }

    fn set_guardian(env: Env, caller: Address, guardian: Address) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&KEY_ADMIN).ok_or(Error::NotInitialized)?;
        caller.require_auth();

        if caller != admin {
            return Err(Error::Unauthorized);
        }

        env.storage().instance().set(&KEY_GUARDIAN, &guardian);
        Ok(())
    }
}
