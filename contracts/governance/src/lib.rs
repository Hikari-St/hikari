#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, BytesN, Env, String,
};
use hikari_interfaces::{
    Error, GovernanceConfig, HikariGovernanceTrait, Proposal, ProposalState, VoteType,
};

#[cfg(test)]
mod test;

const DAY_IN_LEDGERS: u32 = 17280;
const BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const LIFETIME_THRESHOLD: u32 = DAY_IN_LEDGERS;

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Config,
    ProposalCount,
    Proposal(u32),
    Voted(u32, Address),
    Vetoed(u32, Address),
}

fn extend_instance_ttl(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(LIFETIME_THRESHOLD, BUMP_AMOUNT);
}

fn extend_persistent_ttl(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, LIFETIME_THRESHOLD, BUMP_AMOUNT);
}

#[contract]
pub struct HikariGovernanceContract;

#[contractimpl]
impl HikariGovernanceTrait for HikariGovernanceContract {
    fn initialize(
        env: Env,
        admin: Address,
        hxlm_token: Address,
        voting_period_ledgers: u32,
        timelock_ledgers: u32,
        quorum_bps: u32,
        veto_threshold_bps: u32,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Config) {
            return Err(Error::AlreadyInitialized);
        }

        admin.require_auth();

        let config = GovernanceConfig {
            admin,
            hxlm_token,
            voting_period_ledgers,
            timelock_ledgers,
            quorum_bps,
            veto_threshold_bps,
        };

        env.storage().instance().set(&DataKey::Config, &config);
        env.storage().instance().set(&DataKey::ProposalCount, &0u32);
        extend_instance_ttl(&env);

        Ok(())
    }

    fn create_proposal(
        env: Env,
        creator: Address,
        title: String,
        description_hash: BytesN<32>,
        target_contract: Address,
        action_id: u32,
        param_value: i128,
    ) -> Result<u32, Error> {
        creator.require_auth();

        if !env.storage().instance().has(&DataKey::Config) {
            return Err(Error::NotInitialized);
        }

        let config: GovernanceConfig = env.storage().instance().get(&DataKey::Config).unwrap();
        let mut count: u32 = env.storage().instance().get(&DataKey::ProposalCount).unwrap_or(0);
        count += 1;

        let current_ledger = env.ledger().sequence();
        let end_ledger = current_ledger + config.voting_period_ledgers;

        let proposal = Proposal {
            id: count,
            creator: creator.clone(),
            title: title.clone(),
            description_hash,
            target_contract,
            action_id,
            param_value,
            start_ledger: current_ledger,
            end_ledger,
            eta_ledger: 0,
            for_votes: 0,
            against_votes: 0,
            abstain_votes: 0,
            veto_votes: 0,
            state: ProposalState::Active,
        };

        let prop_key = DataKey::Proposal(count);
        env.storage().persistent().set(&prop_key, &proposal);
        extend_persistent_ttl(&env, &prop_key);

        env.storage().instance().set(&DataKey::ProposalCount, &count);
        extend_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("gov"), symbol_short!("created")),
            (count, creator),
        );

        Ok(count)
    }

    fn cast_vote(
        env: Env,
        voter: Address,
        proposal_id: u32,
        vote_type: VoteType,
        voting_power: i128,
    ) -> Result<(), Error> {
        voter.require_auth();

        if voting_power <= 0 {
            return Err(Error::ZeroAmount);
        }

        let prop_key = DataKey::Proposal(proposal_id);
        if !env.storage().persistent().has(&prop_key) {
            return Err(Error::ProposalNotFound);
        }

        let mut proposal: Proposal = env.storage().persistent().get(&prop_key).unwrap();

        if proposal.state != ProposalState::Active {
            return Err(Error::InvalidState);
        }

        if env.ledger().sequence() > proposal.end_ledger {
            return Err(Error::VotingClosed);
        }

        let vote_key = DataKey::Voted(proposal_id, voter.clone());
        if env.storage().persistent().has(&vote_key) {
            return Err(Error::InvalidState); // already voted
        }

        match vote_type {
            VoteType::For => proposal.for_votes += voting_power,
            VoteType::Against => proposal.against_votes += voting_power,
            VoteType::Abstain => proposal.abstain_votes += voting_power,
        }

        env.storage().persistent().set(&vote_key, &true);
        extend_persistent_ttl(&env, &vote_key);

        env.storage().persistent().set(&prop_key, &proposal);
        extend_persistent_ttl(&env, &prop_key);

        env.events().publish(
            (symbol_short!("gov"), symbol_short!("vote")),
            (proposal_id, voter, vote_type as u32, voting_power),
        );

        Ok(())
    }

    fn cast_veto(
        env: Env,
        staker: Address,
        proposal_id: u32,
        staker_power: i128,
    ) -> Result<(), Error> {
        staker.require_auth();

        if staker_power <= 0 {
            return Err(Error::ZeroAmount);
        }

        let prop_key = DataKey::Proposal(proposal_id);
        if !env.storage().persistent().has(&prop_key) {
            return Err(Error::ProposalNotFound);
        }

        let mut proposal: Proposal = env.storage().persistent().get(&prop_key).unwrap();

        if proposal.state != ProposalState::Active && proposal.state != ProposalState::Queued {
            return Err(Error::InvalidState);
        }

        let veto_key = DataKey::Vetoed(proposal_id, staker.clone());
        if env.storage().persistent().has(&veto_key) {
            return Err(Error::InvalidState); // already vetoed
        }

        proposal.veto_votes += staker_power;
        env.storage().persistent().set(&veto_key, &true);
        extend_persistent_ttl(&env, &veto_key);

        let config: GovernanceConfig = env.storage().instance().get(&DataKey::Config).unwrap();

        // 33.4% veto threshold check against total participating votes or absolute threshold
        // If veto votes exceed 33.4% (3340 bps) of total votes cast, proposal is cancelled
        let total_participating = proposal.for_votes + proposal.against_votes + proposal.abstain_votes;
        let veto_trigger = if total_participating > 0 {
            (total_participating * (config.veto_threshold_bps as i128)) / 10000
        } else {
            1000000000i128 // fallback 100 XLM if early veto
        };

        if proposal.veto_votes >= veto_trigger {
            proposal.state = ProposalState::Vetoed;
        }

        env.storage().persistent().set(&prop_key, &proposal);
        extend_persistent_ttl(&env, &prop_key);

        env.events().publish(
            (symbol_short!("gov"), symbol_short!("veto")),
            (proposal_id, staker, staker_power, proposal.state as u32),
        );

        Ok(())
    }

    fn queue_proposal(env: Env, proposal_id: u32) -> Result<(), Error> {
        let prop_key = DataKey::Proposal(proposal_id);
        if !env.storage().persistent().has(&prop_key) {
            return Err(Error::ProposalNotFound);
        }

        let mut proposal: Proposal = env.storage().persistent().get(&prop_key).unwrap();

        if proposal.state == ProposalState::Vetoed {
            return Err(Error::ProposalVetoed);
        }

        if proposal.state != ProposalState::Active {
            return Err(Error::InvalidState);
        }

        if env.ledger().sequence() <= proposal.end_ledger {
            return Err(Error::InvalidState); // voting still active
        }

        let config: GovernanceConfig = env.storage().instance().get(&DataKey::Config).unwrap();

        // Quorum check
        let total_votes = proposal.for_votes + proposal.against_votes + proposal.abstain_votes;
        if total_votes <= 0 {
            proposal.state = ProposalState::Defeated;
            env.storage().persistent().set(&prop_key, &proposal);
            return Err(Error::QuorumNotMet);
        }

        // Simple majority check
        if proposal.for_votes <= proposal.against_votes {
            proposal.state = ProposalState::Defeated;
            env.storage().persistent().set(&prop_key, &proposal);
            return Ok(());
        }

        proposal.eta_ledger = env.ledger().sequence() + config.timelock_ledgers;
        proposal.state = ProposalState::Queued;

        env.storage().persistent().set(&prop_key, &proposal);
        extend_persistent_ttl(&env, &prop_key);

        env.events().publish(
            (symbol_short!("gov"), symbol_short!("queued")),
            (proposal_id, proposal.eta_ledger),
        );

        Ok(())
    }

    fn execute_proposal(env: Env, proposal_id: u32) -> Result<(), Error> {
        let prop_key = DataKey::Proposal(proposal_id);
        if !env.storage().persistent().has(&prop_key) {
            return Err(Error::ProposalNotFound);
        }

        let mut proposal: Proposal = env.storage().persistent().get(&prop_key).unwrap();

        if proposal.state == ProposalState::Vetoed {
            return Err(Error::ProposalVetoed);
        }

        if proposal.state != ProposalState::Queued {
            return Err(Error::InvalidState);
        }

        if env.ledger().sequence() < proposal.eta_ledger {
            return Err(Error::TimelockNotExpired);
        }

        proposal.state = ProposalState::Executed;
        env.storage().persistent().set(&prop_key, &proposal);
        extend_persistent_ttl(&env, &prop_key);

        env.events().publish(
            (symbol_short!("gov"), symbol_short!("exec")),
            (proposal_id, proposal.action_id, proposal.param_value),
        );

        Ok(())
    }

    fn get_proposal(env: Env, proposal_id: u32) -> Proposal {
        let prop_key = DataKey::Proposal(proposal_id);
        env.storage()
            .persistent()
            .get(&prop_key)
            .unwrap_or(Proposal {
                id: 0,
                creator: Address::from_string(&String::from_str(
                    &env,
                    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
                )),
                title: String::from_str(&env, ""),
                description_hash: BytesN::from_array(&env, &[0u8; 32]),
                target_contract: Address::from_string(&String::from_str(
                    &env,
                    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
                )),
                action_id: 0,
                param_value: 0,
                start_ledger: 0,
                end_ledger: 0,
                eta_ledger: 0,
                for_votes: 0,
                against_votes: 0,
                abstain_votes: 0,
                veto_votes: 0,
                state: ProposalState::Pending,
            })
    }

    fn get_proposal_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0)
    }

    fn get_config(env: Env) -> GovernanceConfig {
        env.storage().instance().get(&DataKey::Config).unwrap()
    }
}
