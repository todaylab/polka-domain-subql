import { SubstrateExtrinsic, SubstrateEvent, SubstrateBlock } from "@subql/types";
import { AccountId, Balance, BlockNumber } from '@polkadot/types/interfaces/runtime';
import type { Bytes, Compact, Option } from '@polkadot/types';
import type { ITuple } from '@polkadot/types/types';
import type { ClassId } from '@polkadot/types/interfaces/uniques';
import type {OrderId, CurrencyId, TokenId} from 'domain-types/src/interfaces/types';
import { MergeOrderAuction } from "../types/models/MergeOrderAuction";
import { AuctionHistory } from "../types/models/AuctionHistory";
import { NFTHandler} from "../handlers/sub-handlers/nft"
import { AccountHandler } from '../handlers/sub-handlers/account'

// Self::deposit_event(Event::AuctionCreated(
//                 auction_id, 
//                 creator,
//                 token0,
//                 token1,
//                 min1,
//                 duration,
//                 start_at,
//                 end_at
//             ));
export async function auctionCreatedEvent(event: SubstrateEvent): Promise<void> {
    const { event: { data: [
        auction_id_origin, 
        creator_origin, 
        token0_origin, 
        token1_origin, 
        min1_origin,
        duration_origin,
        start_at_origin,
        end_at_origin
        ] } } = event;
    
    const auction_id = (auction_id_origin as OrderId).toString();
    const creator = (creator_origin as AccountId).toString();
    const token0 = token0_origin as ITuple<[ClassId, TokenId]>;
    const token1 = (token1_origin as CurrencyId).toNumber();
    const min1 = (min1_origin as Balance).toBigInt();
    const duration = (duration_origin as BlockNumber).toNumber();
    const start_at = (start_at_origin as BlockNumber).toBigInt();
    const end_at = (end_at_origin as BlockNumber).toBigInt();

    await AccountHandler.ensureAccount(creator);
    await NFTHandler.ensureNFT(token0.toString(), token0[0].toNumber(), token0[1].toNumber());

    const record = new MergeOrderAuction('0' + '-' + auction_id);
    record.creatorId = creator;
    record.type = 0;
    record.token0Id = token0.toString();
    record.token1 = token1;
    record.min1 = min1;
    record.timestampCreate = event.block.timestamp;
    record.isCanceled = false;
    record.isTaked = false;
    record.duration = duration;
    record.startAt = start_at;
    record.endAt = end_at;

    await record.save();

}

// Self::deposit_event(Event::AuctionBid(auction_id, bidder, amount1));
export async function auctionBidEvent(event: SubstrateEvent): Promise<void> {
    const { event: { data: [
        auction_id_origin, 
        bidder_origin, 
        amount1_origin, 
        ] } } = event;
    
    const auction_id = (auction_id_origin as OrderId).toString();
    const bidder = (bidder_origin as AccountId).toString();
    const amount1 = (amount1_origin as Balance).toBigInt();

    await AccountHandler.ensureAccount(bidder);

    const record = new AuctionHistory(auction_id + '-' + bidder + '-' + amount1);
    record.auctionId = auction_id;
    record.bidderId = bidder;
    record.amount = amount1;
    record.isWinner = false;
    record.timestamp = event.block.timestamp;
    
    await record.save();
}

// Self::deposit_event(Event::AuctionCancelled(auction_id));
export async function auctionCanceledEvent(event: SubstrateEvent): Promise<void> {
    const { event: { data: [
        auction_id_origin, 
        ] } } = event;

    const auction_id = (auction_id_origin as OrderId).toString();

    const record = await MergeOrderAuction.get(auction_id);
    if (record) {
        record.isCanceled = true;
        await record.save();
    }
}

//Self::deposit_event(Event::AuctionEnd(auction_id, auction.winner.clone(), final_amount));
export async function auctionEndEvent(event: SubstrateEvent): Promise<void> {
    const { event: { data: [
        auction_id_origin, 
        winner_origin,
        final_amount_origin
        ] } } = event;

    const auction_id = (auction_id_origin as OrderId).toString();
    const winner = winner_origin as Option<AccountId>;
    const final_amount = final_amount_origin as Option<Balance>;

    //todo check winner is not None
    const record = await MergeOrderAuction.get(auction_id);
    if (record && winner.isSome && final_amount.isSome) {
        await AccountHandler.ensureAccount(winner.value.toString());

        record.isTaked = true;
        record.takerId = winner.value.toString();
        record.takerAmount = (final_amount.value as Balance).toBigInt();
        record.timestampTaker = event.block.timestamp;
        await record.save();

        //todo use string hash as key
        const history =  await AuctionHistory.get(auction_id + '-' + winner.value.toString() + '-' + final_amount);
        history.isWinner = true;
        await history.save();
    }
    
}