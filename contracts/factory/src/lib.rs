#![no_std]
// Hikari Protocol: Deterministic Vault Factory & Registry Contract
// Lead Architect & Maintainer: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>

use interfaces::{Error, FactoryTrait, VaultDeploymentConfig, VaultRecord};
use soroban_sdk::{
    contract, contractimpl, symbol_short, Address, BytesN, Env, Symbol, Vec,
};

const KEY_ADMIN: Symbol = symbol_short!("ADMIN");
const KEY_TREASURY: Symbol = symbol_short!("TREASURY");
const KEY_SENTINEL: Symbol = symbol_short!("SENTINEL");
const KEY_COUNT: Symbol = symbol_short!("COUNT");
const KEY_VAULTS: Symbol = symbol_short!("VAULTS");
const KEY_WASMS: Symbol = symbol_short!("WASMS");

#[contract]
pub struct HikariFactory;

pub type HakiruFactory = HikariFactory;

#[contractimpl]
impl FactoryTrait for HikariFactory {
    fn initialize(env: Env, admin: Address, treasury: Address, sentinel: Address) -> Result<(), Error> {
        if env.storage().instance().has(&KEY_ADMIN) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();

        env.storage().instance().set(&KEY_ADMIN, &admin);
        env.storage().instance().set(&KEY_TREASURY, &treasury);
        env.storage().instance().set(&KEY_SENTINEL, &sentinel);
        env.storage().instance().set(&KEY_COUNT, &0u32);

        let empty_vaults: Vec<VaultRecord> = Vec::new(&env);
        env.storage().instance().set(&KEY_VAULTS, &empty_vaults);

        Ok(())
    }

    fn register_wasm(env: Env, caller: Address, name: Symbol, wasm_hash: BytesN<32>) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&KEY_ADMIN).ok_or(Error::NotInitialized)?;
        caller.require_auth();
        if caller != admin {
            return Err(Error::Unauthorized);
        }

        env.storage().persistent().set(&(KEY_WASMS, name), &wasm_hash);
        Ok(())
    }

    fn create_vault(env: Env, caller: Address, config: VaultDeploymentConfig) -> Result<Address, Error> {
        let admin: Address = env.storage().instance().get(&KEY_ADMIN).ok_or(Error::NotInitialized)?;
        caller.require_auth();
        if caller != admin {
            return Err(Error::Unauthorized);
        }

        // Deploy deterministic vault contract instance
        let salt = BytesN::from_array(&env, &[
            (env.ledger().sequence() & 0xFF) as u8,
            ((env.ledger().sequence() >> 8) & 0xFF) as u8,
            ((env.ledger().sequence() >> 16) & 0xFF) as u8,
            ((env.ledger().sequence() >> 24) & 0xFF) as u8,
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27
        ]);

        let vault_addr = env.deployer().with_address(admin.clone(), salt).deploy_v2(config.vault_wasm_hash, ());

        let current_ledger = env.ledger().sequence();
        let record = VaultRecord {
            vault_address: vault_addr.clone(),
            token_address: config.asset.clone(),
            asset_address: config.asset.clone(),
            created_at_ledger: current_ledger,
            active: true,
        };

        let mut vaults: Vec<VaultRecord> = env.storage().instance().get(&KEY_VAULTS).unwrap_or_else(|| Vec::new(&env));
        vaults.push_back(record);
        let count = vaults.len();

        env.storage().instance().set(&KEY_VAULTS, &vaults);
        env.storage().instance().set(&KEY_COUNT, &count);

        Ok(vault_addr)
    }

    fn get_vault(env: Env, index: u32) -> Result<VaultRecord, Error> {
        let vaults: Vec<VaultRecord> = env.storage().instance().get(&KEY_VAULTS).ok_or(Error::NotInitialized)?;
        if index >= vaults.len() {
            return Err(Error::RequestNotFound);
        }
        Ok(vaults.get(index).unwrap())
    }

    fn total_vaults(env: Env) -> u32 {
        env.storage().instance().get(&KEY_COUNT).unwrap_or(0u32)
    }

    fn set_sentinel(env: Env, caller: Address, new_sentinel: Address) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&KEY_ADMIN).ok_or(Error::NotInitialized)?;
        caller.require_auth();
        if caller != admin {
            return Err(Error::Unauthorized);
        }

        env.storage().instance().set(&KEY_SENTINEL, &new_sentinel);
        Ok(())
    }
}
