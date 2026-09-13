#![no_std]
use hikari_interfaces::{Error, YieldStream};
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, Vec};

const DAY_IN_LEDGERS: u32 = 17280;
const BUMP_AMOUNT: u32 = 60 * DAY_IN_LEDGERS;
const LIFETIME_THRESHOLD: u32 = BUMP_AMOUNT - 10 * DAY_IN_LEDGERS;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    StreamCount,
    Stream(u32),
    VaultTokenStreams(Address, Address),
}

#[contract]
pub struct LinearYieldStreamerContract;

#[contractimpl]
impl LinearYieldStreamerContract {
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::StreamCount, &0u32);
        Self::extend_ttl(&env);
        Ok(())
    }

    pub fn add_yield_stream(
        env: Env,
        from: Address,
        token: Address,
        vault: Address,
        amount: i128,
        duration_seconds: u64,
    ) -> Result<u32, Error> {
        from.require_auth();

        if amount <= 0 {
            return Err(Error::ZeroAmount);
        }
        if duration_seconds == 0 {
            return Err(Error::InvalidState);
        }

        Self::extend_ttl(&env);

        // Transfer yield tokens into streamer contract
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&from, &env.current_contract_address(), &amount);

        let stream_count: u32 = env.storage().instance().get(&DataKey::StreamCount).unwrap_or(0);
        let stream_id = stream_count + 1;

        let now = env.ledger().timestamp();
        let stream = YieldStream {
            id: stream_id,
            depositor: from,
            token: token.clone(),
            vault: vault.clone(),
            total_amount: amount,
            claimed_amount: 0,
            start_time: now,
            duration_seconds,
        };

        env.storage().persistent().set(&DataKey::Stream(stream_id), &stream);
        env.storage().instance().set(&DataKey::StreamCount, &stream_id);

        let mapping_key = DataKey::VaultTokenStreams(vault, token);
        let mut stream_ids: Vec<u32> = env
            .storage()
            .persistent()
            .get(&mapping_key)
            .unwrap_or(Vec::new(&env));
        stream_ids.push_back(stream_id);
        env.storage().persistent().set(&mapping_key, &stream_ids);

        Ok(stream_id)
    }

    pub fn harvest_claimable(env: Env, vault: Address, token: Address) -> Result<i128, Error> {
        Self::extend_ttl(&env);

        let mapping_key = DataKey::VaultTokenStreams(vault.clone(), token.clone());
        let stream_ids: Vec<u32> = match env.storage().persistent().get(&mapping_key) {
            Some(ids) => ids,
            None => return Ok(0),
        };

        let now = env.ledger().timestamp();
        let mut total_harvest: i128 = 0;

        for id in stream_ids.iter() {
            let stream_key = DataKey::Stream(id);
            if let Some(mut stream) = env.storage().persistent().get::<DataKey, YieldStream>(&stream_key) {
                if stream.claimed_amount < stream.total_amount {
                    let elapsed = if now > stream.start_time {
                        now - stream.start_time
                    } else {
                        0
                    };

                    let unlocked = if elapsed >= stream.duration_seconds {
                        stream.total_amount
                    } else {
                        (stream.total_amount * (elapsed as i128)) / (stream.duration_seconds as i128)
                    };

                    let claimable = unlocked.saturating_sub(stream.claimed_amount);
                    if claimable > 0 {
                        total_harvest = total_harvest.checked_add(claimable).ok_or(Error::MathOverflow)?;
                        stream.claimed_amount = stream
                            .claimed_amount
                            .checked_add(claimable)
                            .ok_or(Error::MathOverflow)?;
                        env.storage().persistent().set(&stream_key, &stream);
                    }
                }
            }
        }

        if total_harvest > 0 {
            let token_client = token::Client::new(&env, &token);
            token_client.transfer(&env.current_contract_address(), &vault, &total_harvest);
        }

        Ok(total_harvest)
    }

    pub fn get_claimable(env: Env, vault: Address, token: Address) -> i128 {
        let mapping_key = DataKey::VaultTokenStreams(vault, token);
        let stream_ids: Vec<u32> = match env.storage().persistent().get(&mapping_key) {
            Some(ids) => ids,
            None => return 0,
        };

        let now = env.ledger().timestamp();
        let mut total_claimable: i128 = 0;

        for id in stream_ids.iter() {
            let stream_key = DataKey::Stream(id);
            if let Some(stream) = env.storage().persistent().get::<DataKey, YieldStream>(&stream_key) {
                if stream.claimed_amount < stream.total_amount {
                    let elapsed = if now > stream.start_time {
                        now - stream.start_time
                    } else {
                        0
                    };

                    let unlocked = if elapsed >= stream.duration_seconds {
                        stream.total_amount
                    } else {
                        (stream.total_amount * (elapsed as i128)) / (stream.duration_seconds as i128)
                    };

                    let claimable = unlocked.saturating_sub(stream.claimed_amount);
                    total_claimable += claimable;
                }
            }
        }

        total_claimable
    }

    pub fn get_stream(env: Env, stream_id: u32) -> Result<YieldStream, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Stream(stream_id))
            .ok_or(Error::StreamNotFound)
    }

    pub fn total_streams(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::StreamCount).unwrap_or(0)
    }

    fn extend_ttl(env: &Env) {
        env.storage().instance().extend_ttl(LIFETIME_THRESHOLD, BUMP_AMOUNT);
    }
}

#[cfg(test)]
mod test;
