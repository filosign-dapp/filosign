import type { Address } from "viem";
import {
	getFileArchivalStatus,
	purchaseFileArchival,
} from "@/lib/domains/files/archival";
import type { ArchivalTier } from "@/lib/platform/db/schema/file";

export async function filesArchivalPurchase(
	wallet: Address,
	input: { pieceCid: string; tier: ArchivalTier },
) {
	return purchaseFileArchival(wallet, input.pieceCid, input.tier);
}

export async function filesArchivalStatus(
	wallet: Address,
	input: { pieceCid: string },
) {
	return getFileArchivalStatus(wallet, input.pieceCid);
}
