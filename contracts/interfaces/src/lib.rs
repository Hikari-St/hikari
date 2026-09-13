#![no_std]
use soroban_sdk::{contractclient, contracterror, contracttype, Address, BytesN, Env, String, Symbol, Vec};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    Paused = 4,
    ZeroAmount = 5,
    InsufficientBalance = 6,
    InsufficientShares = 7,
    StrategyCapExceeded = 8,
    StrategyRevoked = 9,
    StrategyNotFound = 10,
    CooldownNotMet = 11,
    DailyLimitExceeded = 12,
    TxLimitExceeded = 13,
    UnallowedDestination = 14,
    MathOverflow = 15,
    InvalidState = 16,
    RequestNotFound = 17,
    AlreadyFinalized = 18,
    ThresholdExceeded = 19,
    InvalidWasmHash = 20,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VaultDeploymentConfig {
    pub asset: Address,
    pub token_wasm_hash: BytesN<32>,
    pub vault_wasm_hash: BytesN<32>,
    pub name: String,
    pub symbol: Symbol,
    pub management_fee_bps: u32,
    pub performance_fee_bps: u32,
    pub treasury: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VaultRecord {
    pub vault_address: Address,
    pub token_address: Address,
    pub asset_address: Address,
    pub created_at_ledger: u32,
    pub active: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BasketAssetWeight {
    pub asset: Address,
    pub target_weight_bps: u32,
    pub current_balance: i128,
}

#[contractclient(name = "FactoryClient")]
pub trait FactoryTrait {
    fn initialize(env: Env, admin: Address, treasury: Address, sentinel: Address) -> Result<(), Error>;
    fn register_wasm(env: Env, caller: Address, name: Symbol, wasm_hash: BytesN<32>) -> Result<(), Error>;
    fn create_vault(env: Env, caller: Address, config: VaultDeploymentConfig) -> Result<Address, Error>;
    fn get_vault(env: Env, index: u32) -> Result<VaultRecord, Error>;
    fn total_vaults(env: Env) -> u32;
    fn set_sentinel(env: Env, caller: Address, new_sentinel: Address) -> Result<(), Error>;
}

#[contractclient(name = "SentinelClient")]
pub trait SentinelTrait {
    fn initialize(env: Env, admin: Address, max_drawdown_bps: u32) -> Result<(), Error>;
    fn check_and_trigger(env: Env, vault: Address, current_drawdown_bps: u32) -> Result<bool, Error>;
    fn emergency_pause_all(env: Env, caller: Address) -> Result<(), Error>;
    fn is_paused(env: Env) -> bool;
    fn set_guardian(env: Env, caller: Address, guardian: Address) -> Result<(), Error>;
}

#[contractclient(name = "MultiAssetBasketClient")]
pub trait MultiAssetBasketTrait {
    fn get_basket_weights(env: Env) -> Vec<BasketAssetWeight>;
    fn compute_basket_nav(env: Env) -> i128;
    fn deposit_basket(env: Env, from: Address, amounts: Vec<i128>) -> Result<i128, Error>;
    fn redeem_basket(env: Env, to: Address, shares: i128) -> Result<Vec<i128>, Error>;
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum StrategyStatus {
    Active = 1,
    Paused = 2,
    Revoked = 3,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StrategyInfo {
    pub address: Address,
    pub cap: i128,
    pub allocated: i128,
    pub risk_tier: u32,
    pub status: StrategyStatus,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WithdrawalRequest {
    pub id: u64,
    pub user: Address,
    pub shares: i128,
    pub request_ledger: u32,
    pub finalized: bool,
    pub claimable_assets: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PolicyLimits {
    pub max_tx_amount: i128,
    pub daily_spend_limit: i128,
    pub spent_today: i128,
    pub last_reset_ledger: u32,
}

#[contractclient(name = "StrategyAdapterClient")]
pub trait StrategyAdapterTrait {
    fn deposit(env: Env, amount: i128) -> Result<i128, Error>;
    fn withdraw(env: Env, amount: i128) -> Result<i128, Error>;
    fn total_value(env: Env) -> i128;
    fn emergency_exit(env: Env) -> Result<i128, Error>;
    fn harvest(env: Env) -> Result<i128, Error>;
}

#[contractclient(name = "VaultClient")]
pub trait VaultTrait {
    fn deposit(env: Env, from: Address, amount: i128) -> Result<i128, Error>;
    fn withdraw(env: Env, to: Address, shares: i128) -> Result<i128, Error>;
    fn total_assets(env: Env) -> i128;
    fn total_shares(env: Env) -> i128;
    fn convert_to_shares(env: Env, assets: i128) -> i128;
    fn convert_to_assets(env: Env, shares: i128) -> i128;
    fn pause(env: Env, caller: Address) -> Result<(), Error>;
    fn unpause(env: Env, caller: Address) -> Result<(), Error>;
}

#[contractclient(name = "LiquidTokenClient")]
pub trait LiquidTokenTrait {
    fn balance(env: Env, id: Address) -> i128;
    fn transfer(env: Env, from: Address, to: Address, amount: i128);
    fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128);
    fn approve(env: Env, from: Address, spender: Address, amount: i128, live_until_ledger: u32);
    fn decimals(env: Env) -> u32;
    fn name(env: Env) -> String;
    fn symbol(env: Env) -> Symbol;
    fn mint(env: Env, to: Address, amount: i128);
    fn burn(env: Env, from: Address, amount: i128);
    fn total_supply(env: Env) -> i128;
}

#[contractclient(name = "StrategyRegistryClient")]
pub trait StrategyRegistryTrait {
    fn record_allocation(env: Env, strategy: Address, amount: i128) -> Result<(), Error>;
    fn record_deallocation(env: Env, strategy: Address, amount: i128) -> Result<(), Error>;
    fn revoke_strategy(env: Env, caller: Address, strategy: Address) -> Result<(), Error>;
}

#[contractclient(name = "PolicyAccountClient")]
pub trait PolicyAccountTrait {
    fn verify_and_record_action(
        env: Env,
        agent: Address,
        target_contract: Address,
        amount: i128,
    ) -> Result<(), Error>;
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OracleTelemetry {
    pub nav_stroops: i128,
    pub apr_bps: u32,
    pub total_reserves: i128,
    pub liquid_reserve_ratio_bps: u32,
    pub bunker_active: bool,
    pub last_updated_ledger: u32,
    pub proof_hash: BytesN<32>,
}

#[contractclient(name = "HikariOracleClient")]
pub trait HikariOracleTrait {
    fn initialize(env: Env, admin: Address, publisher: Address) -> Result<(), Error>;
    fn get_hxlm_nav(env: Env) -> i128;
    fn get_average_apr(env: Env) -> u32;
    fn get_total_reserves(env: Env) -> i128;
    fn get_liquid_reserve_ratio(env: Env) -> u32;
    fn is_bunker_active(env: Env) -> bool;
    fn get_telemetry(env: Env) -> OracleTelemetry;
    fn update_telemetry(
        env: Env,
        caller: Address,
        nav_stroops: i128,
        apr_bps: u32,
        total_reserves: i128,
        liquid_reserve_ratio_bps: u32,
        bunker_active: bool,
        proof_hash: BytesN<32>,
    ) -> Result<(), Error>;
    fn set_publisher(env: Env, caller: Address, new_publisher: Address) -> Result<(), Error>;
}


