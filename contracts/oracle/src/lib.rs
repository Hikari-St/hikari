#![no_std]
// Hikari Protocol: Yield & NAV Telemetry Oracle Contract
// Lead Architect & Maintainer: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>

use hikari_interfaces::{Error, HikariOracleTrait, OracleTelemetry};
use soroban_sdk::{
    contract, contractevent, contractimpl, contracttype, Address, BytesN, Env,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Publisher,
    Telemetry,
}

#[contractevent]
pub struct TelemetryUpdated {
    #[topic]
    pub publisher: Address,
    pub nav_stroops: i128,
    pub apr_bps: u32,
    pub total_reserves: i128,
    pub bunker_active: bool,
}

const INSTANCE_TTL_EXTEND_THRESHOLD: u32 = 120 * 17280; // ~120 days
const INSTANCE_TTL_EXTEND_TO: u32 = 180 * 17280;        // ~180 days
const STROOP_UNIT: i128 = 10_000_000;                  // 1 XLM = 10^7 stroops

#[contract]
pub struct HikariOracleContract;

#[contractimpl]
impl HikariOracleTrait for HikariOracleContract {
    fn initialize(env: Env, admin: Address, publisher: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Publisher, &publisher);

        // Initialize default baseline telemetry: 1.0000 XLM NAV, 12.4% APR (1240 bps), 0 reserves
        let zero_hash = BytesN::from_array(&env, &[0u8; 32]);
        let baseline = OracleTelemetry {
            nav_stroops: STROOP_UNIT,
            apr_bps: 1240,
            total_reserves: 0,
            liquid_reserve_ratio_bps: 2280, // 22.8%
            bunker_active: false,
            last_updated_ledger: env.ledger().sequence(),
            proof_hash: zero_hash,
        };
        env.storage().instance().set(&DataKey::Telemetry, &baseline);
        env.storage().instance().extend_ttl(INSTANCE_TTL_EXTEND_THRESHOLD, INSTANCE_TTL_EXTEND_TO);

        Ok(())
    }

    fn get_hxlm_nav(env: Env) -> i128 {
        let t: OracleTelemetry = env
            .storage()
            .instance()
            .get(&DataKey::Telemetry)
            .unwrap_or(OracleTelemetry {
                nav_stroops: STROOP_UNIT,
                apr_bps: 1240,
                total_reserves: 0,
                liquid_reserve_ratio_bps: 2280,
                bunker_active: false,
                last_updated_ledger: 0,
                proof_hash: BytesN::from_array(&env, &[0u8; 32]),
            });
        t.nav_stroops
    }

    fn get_average_apr(env: Env) -> u32 {
        let t: OracleTelemetry = env
            .storage()
            .instance()
            .get(&DataKey::Telemetry)
            .unwrap_or(OracleTelemetry {
                nav_stroops: STROOP_UNIT,
                apr_bps: 1240,
                total_reserves: 0,
                liquid_reserve_ratio_bps: 2280,
                bunker_active: false,
                last_updated_ledger: 0,
                proof_hash: BytesN::from_array(&env, &[0u8; 32]),
            });
        t.apr_bps
    }

    fn get_total_reserves(env: Env) -> i128 {
        let t: OracleTelemetry = env
            .storage()
            .instance()
            .get(&DataKey::Telemetry)
            .unwrap_or(OracleTelemetry {
                nav_stroops: STROOP_UNIT,
                apr_bps: 1240,
                total_reserves: 0,
                liquid_reserve_ratio_bps: 2280,
                bunker_active: false,
                last_updated_ledger: 0,
                proof_hash: BytesN::from_array(&env, &[0u8; 32]),
            });
        t.total_reserves
    }

    fn get_liquid_reserve_ratio(env: Env) -> u32 {
        let t: OracleTelemetry = env
            .storage()
            .instance()
            .get(&DataKey::Telemetry)
            .unwrap_or(OracleTelemetry {
                nav_stroops: STROOP_UNIT,
                apr_bps: 1240,
                total_reserves: 0,
                liquid_reserve_ratio_bps: 2280,
                bunker_active: false,
                last_updated_ledger: 0,
                proof_hash: BytesN::from_array(&env, &[0u8; 32]),
            });
        t.liquid_reserve_ratio_bps
    }

    fn is_bunker_active(env: Env) -> bool {
        let t: OracleTelemetry = env
            .storage()
            .instance()
            .get(&DataKey::Telemetry)
            .unwrap_or(OracleTelemetry {
                nav_stroops: STROOP_UNIT,
                apr_bps: 1240,
                total_reserves: 0,
                liquid_reserve_ratio_bps: 2280,
                bunker_active: false,
                last_updated_ledger: 0,
                proof_hash: BytesN::from_array(&env, &[0u8; 32]),
            });
        t.bunker_active
    }

    fn get_telemetry(env: Env) -> OracleTelemetry {
        env.storage()
            .instance()
            .get(&DataKey::Telemetry)
            .unwrap_or(OracleTelemetry {
                nav_stroops: STROOP_UNIT,
                apr_bps: 1240,
                total_reserves: 0,
                liquid_reserve_ratio_bps: 2280,
                bunker_active: false,
                last_updated_ledger: 0,
                proof_hash: BytesN::from_array(&env, &[0u8; 32]),
            })
    }

    fn update_telemetry(
        env: Env,
        caller: Address,
        nav_stroops: i128,
        apr_bps: u32,
        total_reserves: i128,
        liquid_reserve_ratio_bps: u32,
        bunker_active: bool,
        proof_hash: BytesN<32>,
    ) -> Result<(), Error> {
        caller.require_auth();

        let publisher: Address = env
            .storage()
            .instance()
            .get(&DataKey::Publisher)
            .ok_or(Error::NotInitialized)?;
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;

        if caller != publisher && caller != admin {
            return Err(Error::Unauthorized);
        }

        // Anti-manipulation sanity checks
        if nav_stroops <= 0 {
            return Err(Error::ZeroAmount);
        }

        // Anti-spike clamping: New NAV cannot jump more than 10% from current NAV in a single ledger
        if let Some(prev) = env.storage().instance().get::<_, OracleTelemetry>(&DataKey::Telemetry) {
            let max_jump = prev.nav_stroops / 10; // 10%
            if (nav_stroops - prev.nav_stroops).abs() > max_jump {
                return Err(Error::ThresholdExceeded);
            }
        }

        let updated = OracleTelemetry {
            nav_stroops,
            apr_bps,
            total_reserves,
            liquid_reserve_ratio_bps,
            bunker_active,
            last_updated_ledger: env.ledger().sequence(),
            proof_hash,
        };

        env.storage().instance().set(&DataKey::Telemetry, &updated);
        env.storage().instance().extend_ttl(INSTANCE_TTL_EXTEND_THRESHOLD, INSTANCE_TTL_EXTEND_TO);

        TelemetryUpdated {
            publisher: caller,
            nav_stroops,
            apr_bps,
            total_reserves,
            bunker_active,
        }.publish(&env);

        Ok(())
    }

    fn set_publisher(env: Env, caller: Address, new_publisher: Address) -> Result<(), Error> {
        caller.require_auth();
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;

        if caller != admin {
            return Err(Error::Unauthorized);
        }

        env.storage().instance().set(&DataKey::Publisher, &new_publisher);
        env.storage().instance().extend_ttl(INSTANCE_TTL_EXTEND_THRESHOLD, INSTANCE_TTL_EXTEND_TO);
        Ok(())
    }
}

#[cfg(test)]
mod test;
