import type { UploadResult } from "@filoz/synapse-sdk";
import {
	calibration,
	mainnet,
	Synapse,
	type SynapseOptions,
} from "@filoz/synapse-sdk";
import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import env from "@/env";
import db from "@/lib/platform/db";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const SYNAPSE_SOURCE = "filosign";
const WITH_CDN = true;

const account = privateKeyToAccount(env.FC_SERVER_PRIVATE_KEY);
export const serverWallet = getAddress(env.FC_SERVER_ADDRESS);

const synapseChain = env.CHAIN === "mainnet" ? mainnet : calibration;

const synapseOptions: SynapseOptions = {
	account,
	chain: synapseChain,
	transport: http(synapseChain.rpcUrls.default.http[0]),
	source: SYNAPSE_SOURCE,
	withCDN: WITH_CDN,
};

export const synapse = Synapse.create(synapseOptions);

const { usersDatasets } = db.schema;

/** Single platform dataset for archival uploads (USDFC paid from FC_SERVER wallet). */
export async function getOrCreatePlatformDataset() {
	const [existing] = await db
		.select()
		.from(usersDatasets)
		.where(eq(usersDatasets.walletAddress, serverWallet));

	if (existing) {
		const ctx = await tryCatch(
			synapse.storage.createContext({
				dataSetId: BigInt(existing.dataSetId),
				metadata: { filosign_platform: "archival" },
			}),
		);

		if (ctx.error) {
			throw new Error(
				"Failed to open Synapse context for platform archival dataset",
				{ cause: ctx.error },
			);
		}

		return ctx.data;
	}

	const ctx = await tryCatch(
		synapse.storage.createContext({
			metadata: { filosign_platform: "archival" },
		}),
	);

	if (ctx.error) {
		throw new Error("Failed to create Synapse platform archival dataset", {
			cause: ctx.error,
		});
	}

	if (ctx.data.dataSetId !== undefined) {
		await db.insert(usersDatasets).values({
			walletAddress: serverWallet,
			dataSetId: Number(ctx.data.dataSetId),
			providerAddress: ctx.data.provider.serviceProvider,
		});
	}

	return ctx.data;
}

export function archivalCdnUrl(pieceCid: string): string {
	const network = env.CHAIN === "mainnet" ? "mainnet" : "calibration";
	return `https://${serverWallet}.${network}.filbeam.io/${pieceCid}`;
}

/** Stable id stored on `foc_objects.deal_id` from an upload result. */
export function dealIdFromUploadResult(result: UploadResult): string {
	const primary = result.copies[0];
	if (!primary) {
		throw new Error("Synapse upload returned no committed copies");
	}
	return `${primary.dataSetId}:${primary.pieceId}`;
}

export type { Address };
