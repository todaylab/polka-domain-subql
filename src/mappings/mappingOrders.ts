import { SubstrateExtrinsic, SubstrateEvent, SubstrateBlock } from "@subql/types";
import { AccountId, Balance, BlockNumber } from '@polkadot/types/interfaces/runtime';
import type {Bytes} from '@polkadot/types';
import type { ITuple } from '@polkadot/types/types';
import type { ClassId } from '@polkadot/types/interfaces/uniques';
import type {OrderId, CurrencyId, TokenId} from 'domain-types/src/interfaces/types';
import { MergeOrderAuction } from "../types/models/MergeOrderAuction";
import { NFTHandler} from "../handlers/sub-handlers/nft"
import { AccountHandler } from '../handlers/sub-handlers/account'


//Self::deposit_event(Event::OrderCreated(order_id, maker, token0, token1, total1));
export async function orderCreatedEvent(event: SubstrateEvent): Promise<void> {
    const { event: { data: [order_id_origin, maker_origin, token0_origin, token1_origin, total1_origin] } } = event;

    const order_id = (order_id_origin as OrderId).toString();
    const maker = (maker_origin as AccountId).toString();
    const token0 = token0_origin as ITuple<[ClassId, TokenId]>;
    const token1 = (token1_origin as CurrencyId).toNumber();
    const total1 = (total1_origin as Balance).toBigInt();

    await AccountHandler.ensureAccount(maker);
    await NFTHandler.ensureNFT(token0.toString(), token0[0].toNumber(), token0[1].toNumber());

    const record = new MergeOrderAuction('1'  + '-' + order_id);
    record.creatorId = maker;
    record.type = 1;
    record.token0Id = token0.toString();
    record.token1 = token1;
    record.min1 = total1;
    record.timestampCreate = event.block.timestamp;
    record.isCanceled = false;
    record.isTaked = false;

    await record.save();
}

//Self::deposit_event(Event::OrderSwapped(order_id, taker, amount1));
export async function orderSwappedEvent(event: SubstrateEvent): Promise<void> {
    const { event: { data: [order_id_origin, taker_origin,  amount1_origin] } } = event;
    const order_id = (order_id_origin as OrderId).toString();
    const taker = (taker_origin as AccountId).toString();
    const amount1 = (amount1_origin as Balance).toBigInt();

    await AccountHandler.ensureAccount(taker);
    const record = await MergeOrderAuction.get('1'  + '-' + order_id);
    if (record) {
        record.isTaked = true;
        record.takerId = taker;
        record.takerAmount = amount1;
        record.timestampTaker = event.block.timestamp;

        await record.save();
    }

}

//Self::deposit_event(Event::OrderCancelled(order_id));
export async function orderCancelledEvent(event: SubstrateEvent): Promise<void> {
    const { event: { data: [order_id_origin] } } = event;
    const order_id = (order_id_origin as OrderId).toString();

    const record = await MergeOrderAuction.get('1'  + '-' + order_id);
    if (record) {
        record.isCanceled = true;
        await record.save();
    }

}