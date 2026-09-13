#![cfg(test)]
use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    Address, Env,
};

#[test]
fn test_streamer_lifecycle_and_linear_harvest() {
    let env = Env::default();
    env.mock_all_auths();

    // Set initial timestamp
    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });

    let admin = Address::generate(&env);
    let yield_donor = Address::generate(&env);
    let vault = Address::generate(&env);
    let token_admin = Address::generate(&env);

    // Setup reward token (simulating SAC / USDC)
    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_client = TokenClient::new(&env, &token_contract.address());
    let token_admin_client = StellarAssetClient::new(&env, &token_contract.address());

    // Mint tokens to yield donor
    token_admin_client.mint(&yield_donor, &1_000_000_000); // 100 USDC

    // Register streamer contract
    let streamer_id = env.register(LinearYieldStreamerContract, ());
    let streamer = LinearYieldStreamerContractClient::new(&env, &streamer_id);

    // Initialize streamer
    streamer.initialize(&admin);

    // Initial claimable should be 0
    assert_eq!(streamer.get_claimable(&vault, &token_contract.address()), 0);

    // Add yield stream: 10,000 units over 100 seconds
    let stream_amount = 10_000i128;
    let duration = 100u64;
    let stream_id = streamer.add_yield_stream(
        &yield_donor,
        &token_contract.address(),
        &vault,
        &stream_amount,
        &duration,
    );
    assert_eq!(stream_id, 1);
    assert_eq!(streamer.total_streams(), 1);

    // At t=0 elapsed (timestamp = 1000), claimable is 0
    assert_eq!(streamer.get_claimable(&vault, &token_contract.address()), 0);

    // Advance 50 seconds (timestamp = 1050) -> 50% unlocked = 5,000 units
    env.ledger().with_mut(|li| {
        li.timestamp = 1050;
    });
    assert_eq!(streamer.get_claimable(&vault, &token_contract.address()), 5_000);

    // Harvest at 50%: should transfer 5,000 to vault
    let harvested_50 = streamer.harvest_claimable(&vault, &token_contract.address());
    assert_eq!(harvested_50, 5_000);
    assert_eq!(token_client.balance(&vault), 5_000);

    // Immediately querying claimable right after harvest should return 0
    assert_eq!(streamer.get_claimable(&vault, &token_contract.address()), 0);

    // Advance to duration completion + beyond (timestamp = 1150) -> Remaining 5,000 unlocked
    env.ledger().with_mut(|li| {
        li.timestamp = 1150;
    });
    assert_eq!(streamer.get_claimable(&vault, &token_contract.address()), 5_000);

    // Final harvest
    let harvested_final = streamer.harvest_claimable(&vault, &token_contract.address());
    assert_eq!(harvested_final, 5_000);
    assert_eq!(token_client.balance(&vault), 10_000);

    // After full harvest, claimable remains 0
    assert_eq!(streamer.get_claimable(&vault, &token_contract.address()), 0);

    // Inspect stream data
    let stream_record = streamer.get_stream(&stream_id);
    assert_eq!(stream_record.total_amount, stream_amount);
    assert_eq!(stream_record.claimed_amount, stream_amount);
}

#[test]
fn test_multiple_concurrent_streams() {
    let env = Env::default();
    env.mock_all_auths();

    env.ledger().with_mut(|li| {
        li.timestamp = 2000;
    });

    let admin = Address::generate(&env);
    let bot = Address::generate(&env);
    let vault = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_client = TokenClient::new(&env, &token_contract.address());
    let token_admin_client = StellarAssetClient::new(&env, &token_contract.address());

    token_admin_client.mint(&bot, &500_000);

    let streamer_id = env.register(LinearYieldStreamerContract, ());
    let streamer = LinearYieldStreamerContractClient::new(&env, &streamer_id);
    streamer.initialize(&admin);

    // Stream 1: 10,000 units over 100 seconds
    streamer.add_yield_stream(&bot, &token_contract.address(), &vault, &10_000, &100);

    // Stream 2: 20,000 units over 200 seconds
    streamer.add_yield_stream(&bot, &token_contract.address(), &vault, &20_000, &200);

    assert_eq!(streamer.total_streams(), 2);

    // Advance 50 seconds
    env.ledger().with_mut(|li| {
        li.timestamp = 2050;
    });

    // Stream 1 unlocked: (10,000 * 50) / 100 = 5,000
    // Stream 2 unlocked: (20,000 * 50) / 200 = 5,000
    // Total claimable = 10,000
    assert_eq!(streamer.get_claimable(&vault, &token_contract.address()), 10_000);

    let harvested = streamer.harvest_claimable(&vault, &token_contract.address());
    assert_eq!(harvested, 10_000);
    assert_eq!(token_client.balance(&vault), 10_000);
}
