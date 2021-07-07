import { SubstrateExtrinsic, SubstrateEvent, SubstrateBlock } from "@subql/types";
import { AccountId, Balance, BlockNumber } from '@polkadot/types/interfaces/runtime';
import type { Bytes, u32, u64 } from '@polkadot/types';
import {hexToUtf8} from '../helpers/common';
import { Domain } from "../types/models/Domain";
import type { ITuple } from '@polkadot/types/types';
import type { ClassId } from '@polkadot/types/interfaces/uniques';
import type { TokenId, AddressChainType } from 'domain-types/src/interfaces/types';
import { NFT } from "../types";
import { AccountHandler } from '../handlers/sub-handlers/account'

async function getDomain(domain_bytes): Promise<Domain> {
    const record = await Domain.get(domain_bytes);
    if ( !record ) {
        const new_record = new Domain(domain_bytes)
        return new_record;
    }
    return record;
}

//Self::deposit_event(Event::DomainRegistered(who, domain, ethereum, deposit, (T::NftClassID::get(), token_id.into())  ));
export async function domainRegisterEvent(event: SubstrateEvent): Promise<void> {
    const { event: { data: [who_origin, domain_origin, ethereum_origin, deposit_origin, token0_origin] } } = event;
    
    const who = (who_origin as AccountId).toString();
    const domain = hexToUtf8(domain_origin as Bytes);
    const ethereum = hexToUtf8(ethereum_origin as Bytes);
    const deposit = (deposit_origin as Balance).toBigInt();
    const token0 = token0_origin as ITuple<[ClassId, TokenId]>;

    await AccountHandler.ensureAccount(who);

    const record = await getDomain((domain_origin as Bytes).toString());

    record.domain = domain;
    record.ownerId = who;
    record.ethereum = ethereum;
    record.registered = true;
    record.deposit = deposit;

    await record.save();

    //save nft with domain
    const domainInfo = await Domain.get((domain_origin as Bytes).toString());

    if (domainInfo) {
        const nft = new NFT(token0.toString())
        nft.classId = (token0[0] as u32).toNumber()
        nft.tokenId = (token0[1] as u64).toNumber()
        nft.domainInfoId = domainInfo.id;
        await nft.save();
    }
}

//Self::deposit_event(Event::DomainDeregistered(who, domain, (T::NftClassID::get(), token_id.into())));
export async function domainDeregisterEvent(event: SubstrateEvent): Promise<void> {
    const { event: { data: [who_origin, domain_origin] } } = event;

    const domain = (domain_origin as Bytes).toString();
    const record = await Domain.get(domain);
    if (record) {
        record.ownerId = null;
        record.registered = false;
        await record.save();
    }
}

// Self::deposit_event(Event::BindAddress(
//     who,
//     domain.clone(),
//     chain_type,
//     address,
// ));
export async function domainBindAddressEvent(event: SubstrateEvent): Promise<void> {
    const { event: { data: [who_origin, domain_origin, chain_type_origin, address_origin] } } = event;
    
    const domain = (domain_origin as Bytes).toString();
    const chain_type = chain_type_origin as AddressChainType;
    const address = (address_origin as Bytes).toString();

    const record = await Domain.get(domain);
    if (record) {
        if (chain_type.isBtc) {
            record.bitcoin = address;
        } else if(chain_type.isEth) {
            record.ethereum = address
        } else if(chain_type.isDot) {
            record.polkadot = address
        } else if(chain_type.isKsm) {
            record.kusama = address
        }

        await record.save();
    }
}

// Self::deposit_event(Event::Transfer(
//     who,
//     to,
//     domain.clone(),
//     domain_info.nft_token,
// ));
export async function domainTransferEvent(event: SubstrateEvent): Promise<void> {
    const { event: { data: [who_origin, to_origin, domain_origin, nft_token_origin] } } = event;

    const who = (who_origin as AccountId).toString();
    const to = (to_origin as AccountId).toString();
    const domain = (domain_origin as Bytes).toString();

    await AccountHandler.ensureAccount(who);
    await AccountHandler.ensureAccount(to);

    const record = await Domain.get(domain);
    if (record) {
        record.ownerId = to;

        await record.save();
    }
}
