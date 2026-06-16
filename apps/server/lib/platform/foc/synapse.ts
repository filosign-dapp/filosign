import type { UploadResult } from "@filoz/synapse-sdk";
import { calibration, mainnet, Synapse } from "@filoz/synapse-sdk";
import { desc, isNotNull } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import env from "@/env";
import db from "@/lib/platform/db";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const SYNAPSE_SOURCE = "filosign";
const WITH_CDN = true;
const PLATFORM_DATASET_METADATA = { filosign_platform: "archival" } as const;

type SynapseClient = ReturnType<typeof Synapse.create>;

let synapseClient: SynapseClient | undefined;

function ensureSynapseClient(): SynapseClient {
	if (synapseClient) {
		return synapseClient;
	}

	const synapseChain = env.CHAIN === "mainnet" ? mainnet : calibration;
	const account = privateKeyToAccount(env.FOC_WALLET_PRIVATE_KEY);
	synapseClient = Synapse.create({
		account,
		chain: synapseChain,
		transport: http(synapseChain.rpcUrls.default.http[0]),
		source: SYNAPSE_SOURCE,
		withCDN: WITH_CDN,
	});
	return synapseClient;
}

export function getFocWalletAddress(): Address {
	return getAddress(env.FOC_WALLET_ADDRESS);
}

/** @deprecated Use getFocWalletAddress */
export function getServerWallet(): Address {
	return getFocWalletAddress();
}

export function getSynapse(): SynapseClient {
	return ensureSynapseClient();
}

const { focObjects } = db.schema;

/** `foc_objects.deal_id` is `${dataSetId}:${pieceId}` from Synapse upload. */
export function dataSetIdFromDealId(dealId: string): bigint {
	const colon = dealId.indexOf(":");
	if (colon <= 0) {
		throw new Error(`Invalid FOC deal_id: ${dealId}`);
	}
	return BigInt(dealId.slice(0, colon));
}

async function resolvePlatformDataSetId(): Promise<bigint | undefined> {
	if (env.FC_SYNAPSE_DATASET_ID !== undefined) {
		return BigInt(env.FC_SYNAPSE_DATASET_ID);
	}

	const [row] = await db
		.select({ dealId: focObjects.dealId })
		.from(focObjects)
		.where(isNotNull(focObjects.dealId))
		.orderBy(desc(focObjects.completedAt))
		.limit(1);

	if (row?.dealId) {
		return dataSetIdFromDealId(row.dealId);
	}

	return undefined;
}

/** Single platform dataset for archival uploads (USDFC paid from FOC wallet). */
export async function getOrCreatePlatformDataset() {
	const dataSetId = await resolvePlatformDataSetId();

	if (dataSetId !== undefined) {
		const ctx = await tryCatch(
			getSynapse().storage.createContext({
				dataSetId,
				metadata: PLATFORM_DATASET_METADATA,
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
		getSynapse().storage.createContext({
			metadata: PLATFORM_DATASET_METADATA,
		}),
	);

	if (ctx.error) {
		throw new Error("Failed to create Synapse platform archival dataset", {
			cause: ctx.error,
		});
	}

	if (ctx.data.dataSetId !== undefined) {
		logger.info(
			{
				dataSetId: ctx.data.dataSetId.toString(),
				hint: "Set FC_SYNAPSE_DATASET_ID so reopen survives an empty DB",
			},
			"Created Synapse platform archival dataset",
		);
	}

	return ctx.data;
}

export function archivalCdnUrl(pieceCid: string): string {
	const network = env.CHAIN === "mainnet" ? "mainnet" : "calibration";
	return `https://${getFocWalletAddress()}.${network}.filbeam.io/${pieceCid}`;
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
