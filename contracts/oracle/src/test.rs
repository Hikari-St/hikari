#![cfg(test)]

use super::*;
use hikari_interfaces::HikariOracleClient;
use soroban_sdk::{
    testutils::Address as _,
    Address, BytesN, Env,
};

#[test]
fn test_oracle_initialization_and_defaults() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let publisher = Address::generate(&env);

    let contract_id = env.register(HikariOracleContract, ());
    let client = HikariOracleClient::new(&env, &contract_id);

    client.initialize(&admin, &publisher);

    assert_eq!(client.get_hxlm_nav(), 10_000_000); // 1.0000 XLM
    assert_eq!(client.get_average_apr(), 1240);     // 12.40%
    assert_eq!(client.get_total_reserves(), 0);
    assert_eq!(client.get_liquid_reserve_ratio(), 2280); // 22.80%
    assert_eq!(client.is_bunker_active(), false);
}

#[test]
fn test_oracle_telemetry_update() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let publisher = Address::generate(&env);

    let contract_id = env.register(HikariOracleContract, ());
    let client = HikariOracleClient::new(&env, &contract_id);

    client.initialize(&admin, &publisher);

    let proof_hash = BytesN::from_array(&env, &[0x42u8; 32]);
    let new_nav = 10_428_000; // 1.0428 XLM (+4.28% within 10% tolerance)
    let new_apr = 1420;       // 14.20%
    let reserves = 148_500 * 10_000_000; // 148,500 XLM in stroops

    client.update_telemetry(
        &publisher,
        &new_nav,
        &new_apr,
        &reserves,
        &2500, // 25.0%
        &false,
        &proof_hash,
    );

    assert_eq!(client.get_hxlm_nav(), 10_428_000);
    assert_eq!(client.get_average_apr(), 1420);
    assert_eq!(client.get_total_reserves(), reserves);
    assert_eq!(client.get_liquid_reserve_ratio(), 2500);
    assert_eq!(client.is_bunker_active(), false);

    let full_telemetry = client.get_telemetry();
    assert_eq!(full_telemetry.proof_hash, proof_hash);
}

#[test]
fn test_oracle_unauthorized_update_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let publisher = Address::generate(&env);
    let malicious = Address::generate(&env);

    let contract_id = env.register(HikariOracleContract, ());
    let client = HikariOracleClient::new(&env, &contract_id);

    client.initialize(&admin, &publisher);

    let proof_hash = BytesN::from_array(&env, &[0u8; 32]);
    let res = client.try_update_telemetry(
        &malicious,
        &10_100_000,
        &1200,
        &1000,
        &2000,
        &false,
        &proof_hash,
    );

    assert!(res.is_err());
}

#[test]
fn test_oracle_anti_manipulation_spike_clamping() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let publisher = Address::generate(&env);

    let contract_id = env.register(HikariOracleContract, ());
    let client = HikariOracleClient::new(&env, &contract_id);

    client.initialize(&admin, &publisher);

    let proof_hash = BytesN::from_array(&env, &[0u8; 32]);
    // Current NAV is 10,000,000. 10% max jump is 1,000,000.
    // Try jumping to 11,500,000 (+15% spike)
    let res = client.try_update_telemetry(
        &publisher,
        &11_500_000,
        &1200,
        &1000,
        &2000,
        &false,
        &proof_hash,
    );

    assert_eq!(res.unwrap_err().unwrap(), Error::ThresholdExceeded);
}

#[test]
fn test_oracle_change_publisher() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let publisher_1 = Address::generate(&env);
    let publisher_2 = Address::generate(&env);

    let contract_id = env.register(HikariOracleContract, ());
    let client = HikariOracleClient::new(&env, &contract_id);

    client.initialize(&admin, &publisher_1);

    // Admin switches publisher
    client.set_publisher(&admin, &publisher_2);

    let proof_hash = BytesN::from_array(&env, &[0xAAu8; 32]);
    let reserves: i128 = 50_000 * 10_000_000;
    client.update_telemetry(
        &publisher_2,
        &10_050_000,
        &1350,
        &reserves,
        &2100,
        &false,
        &proof_hash,
    );

    assert_eq!(client.get_hxlm_nav(), 10_050_000);
}
