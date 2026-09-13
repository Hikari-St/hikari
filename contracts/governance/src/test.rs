#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, BytesN, Env, String,
};

struct TestFixture<'a> {
    env: Env,
    admin: Address,
    hxlm: Address,
    client: HikariGovernanceContractClient<'a>,
}

impl<'a> TestFixture<'a> {
    fn setup() -> Self {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().set_sequence_number(1000);

        let admin = Address::generate(&env);
        let hxlm = Address::generate(&env);

        let contract_id = env.register_contract(None, HikariGovernanceContract);
        let client = HikariGovernanceContractClient::new(&env, &contract_id);

        // 100 ledgers voting period, 50 ledgers timelock, 4% quorum (400 bps), 33.4% veto (3340 bps)
        client.initialize(&admin, &hxlm, &100, &50, &400, &3340);

        TestFixture {
            env,
            admin,
            hxlm,
            client,
        }
    }
}

#[test]
fn test_governance_initialization_and_config() {
    let f = TestFixture::setup();
    let config = f.client.get_config();

    assert_eq!(config.admin, f.admin);
    assert_eq!(config.hxlm_token, f.hxlm);
    assert_eq!(config.voting_period_ledgers, 100);
    assert_eq!(config.timelock_ledgers, 50);
    assert_eq!(config.quorum_bps, 400);
    assert_eq!(config.veto_threshold_bps, 3340);
    assert_eq!(f.client.get_proposal_count(), 0);
}

#[test]
fn test_proposal_creation_and_voting() {
    let f = TestFixture::setup();
    let creator = Address::generate(&f.env);
    let target = Address::generate(&f.env);
    let title = String::from_str(&f.env, "HIP-01: Update Reserve Floor");
    let desc_hash = BytesN::from_array(&f.env, &[1u8; 32]);

    let prop_id = f.client.create_proposal(&creator, &title, &desc_hash, &target, &1, &1500);
    assert_eq!(prop_id, 1);
    assert_eq!(f.client.get_proposal_count(), 1);

    let voter1 = Address::generate(&f.env);
    let voter2 = Address::generate(&f.env);

    f.client.cast_vote(&voter1, &prop_id, &VoteType::For, &5000000000); // 500 hXLM
    f.client.cast_vote(&voter2, &prop_id, &VoteType::Against, &1000000000); // 100 hXLM

    let prop = f.client.get_proposal(&prop_id);
    assert_eq!(prop.for_votes, 5000000000);
    assert_eq!(prop.against_votes, 1000000000);
    assert_eq!(prop.state, ProposalState::Active);
}

#[test]
fn test_duplicate_vote_rejected() {
    let f = TestFixture::setup();
    let creator = Address::generate(&f.env);
    let target = Address::generate(&f.env);
    let title = String::from_str(&f.env, "HIP-02: Test Duplicate");
    let desc_hash = BytesN::from_array(&f.env, &[2u8; 32]);

    let prop_id = f.client.create_proposal(&creator, &title, &desc_hash, &target, &1, &1500);
    let voter = Address::generate(&f.env);

    f.client.cast_vote(&voter, &prop_id, &VoteType::For, &1000000000);

    // Casting duplicate vote from same address should fail with Error::InvalidState
    let res = f.client.try_cast_vote(&voter, &prop_id, &VoteType::For, &1000000000);
    assert_eq!(res.unwrap_err().unwrap(), Error::InvalidState);
}

#[test]
fn test_voting_closed_after_period() {
    let f = TestFixture::setup();
    let creator = Address::generate(&f.env);
    let target = Address::generate(&f.env);
    let title = String::from_str(&f.env, "HIP-03: Test Timeout");
    let desc_hash = BytesN::from_array(&f.env, &[3u8; 32]);

    let prop_id = f.client.create_proposal(&creator, &title, &desc_hash, &target, &1, &1500);
    let voter = Address::generate(&f.env);

    // Fast forward ledger past voting period (1000 + 100 = 1100)
    f.env.ledger().set_sequence_number(1105);

    let res = f.client.try_cast_vote(&voter, &prop_id, &VoteType::For, &1000000000);
    assert_eq!(res.unwrap_err().unwrap(), Error::VotingClosed);
}

#[test]
fn test_timelock_and_execution_lifecycle() {
    let f = TestFixture::setup();
    let creator = Address::generate(&f.env);
    let target = Address::generate(&f.env);
    let title = String::from_str(&f.env, "HIP-04: Fee Split Update");
    let desc_hash = BytesN::from_array(&f.env, &[4u8; 32]);

    let prop_id = f.client.create_proposal(&creator, &title, &desc_hash, &target, &2, &500);

    let voter = Address::generate(&f.env);
    f.client.cast_vote(&voter, &prop_id, &VoteType::For, &10000000000);

    // Voting ends
    f.env.ledger().set_sequence_number(1105);

    // Queue proposal
    f.client.queue_proposal(&prop_id);
    let queued_prop = f.client.get_proposal(&prop_id);
    assert_eq!(queued_prop.state, ProposalState::Queued);
    assert_eq!(queued_prop.eta_ledger, 1105 + 50); // 1155

    // Attempt premature execution fails
    f.env.ledger().set_sequence_number(1120);
    let early_exec = f.client.try_execute_proposal(&prop_id);
    assert_eq!(early_exec.unwrap_err().unwrap(), Error::TimelockNotExpired);

    // Execute once timelock expires
    f.env.ledger().set_sequence_number(1160);
    f.client.execute_proposal(&prop_id);

    let executed_prop = f.client.get_proposal(&prop_id);
    assert_eq!(executed_prop.state, ProposalState::Executed);
}

#[test]
fn test_dual_governance_staker_veto() {
    let f = TestFixture::setup();
    let creator = Address::generate(&f.env);
    let target = Address::generate(&f.env);
    let title = String::from_str(&f.env, "HIP-05: Malicious Proposal");
    let desc_hash = BytesN::from_array(&f.env, &[5u8; 32]);

    let prop_id = f.client.create_proposal(&creator, &title, &desc_hash, &target, &1, &500);

    let voter = Address::generate(&f.env);
    f.client.cast_vote(&voter, &prop_id, &VoteType::For, &10000000000); // 1000 XLM for

    // Stakers mobilize and exercise dual-governance veto (exceeds 33.4% = 3340 bps of 1000 XLM = 334 XLM)
    let staker = Address::generate(&f.env);
    f.client.cast_veto(&staker, &prop_id, &4000000000); // 400 XLM veto

    let vetoed_prop = f.client.get_proposal(&prop_id);
    assert_eq!(vetoed_prop.state, ProposalState::Vetoed);

    // Fast forward and verify queuing is strictly blocked
    f.env.ledger().set_sequence_number(1105);
    let queue_res = f.client.try_queue_proposal(&prop_id);
    assert_eq!(queue_res.unwrap_err().unwrap(), Error::ProposalVetoed);
}
