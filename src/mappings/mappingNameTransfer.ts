import {  SubstrateEvent } from "@subql/types";
import { AccountId, Balance, BlockNumber } from '@polkadot/types/interfaces/runtime';
import type { Compact} from '@polkadot/types';
import { NameTransfer } from "../types/models/NameTransfer";
import { AccountHandler } from '../handlers/sub-handlers/account';
import { ExtrinsicHandler } from '../handlers/extrinsic'

export async function nameAssertTransferEvent(event: SubstrateEvent): Promise<void> {
    const { event: { data: [from_origin, to_origin, amount_origin] } } = event;
    const from = (from_origin as AccountId).toString();
    const to = (to_origin as AccountId).toString();
    const amount = (amount_origin as Balance).toBigInt();

    await AccountHandler.ensureAccount(from)
    await AccountHandler.ensureAccount(to)
    const blockNumber = (event.extrinsic.block.block.header.number as Compact<BlockNumber>).toNumber();

    let record = new NameTransfer(blockNumber.toString() + '-' + event.idx.toString());
    record.fromId = from;
    record.toId = to;
    record.amount = amount;
    record.timestamp = event.block.timestamp;
    record.extrinsicId = new ExtrinsicHandler(event.extrinsic).id;

    await record.save();
}