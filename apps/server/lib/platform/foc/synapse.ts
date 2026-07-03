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
const PLATFORM_DATASET_METADATA = { filosign_platform: "archival" } as const;
const WITH_CDN = true;

type SynapseClient = ReturnType<typeof Synapse.create>;
type UploadCopyDiagnostic = UploadResult["copies"][number] & {
	providerId?: bigint | number | string;
	retrievalUrl?: string;
	isNewDataSet?: boolean;
};
type UploadResultDiagnostic = UploadResult & {
	complete?: boolean;
	requestedCopies?: number;
	size?: bigint | number;
	failedAttempts?: readonly unknown[];
	copies: readonly UploadCopyDiagnostic[];
};

let synapseClient: SynapseClient | undefined;

function ensureSynapseClient(): SynapseClient {
	if (synapseClient) {
		return synapseClient;
	}

	const privateKey = env.FOC_WALLET_PRIVATE_KEY;
	const address = env.FOC_WALLET_ADDRESS;
	if (!privateKey || !address) {
		throw new Error(
			"Synapse client requested but FOC_WALLET_* is not configured",
		);
	}

	const synapseChain = env.CHAIN === "mainnet" ? mainnet : calibration;
	const account = privateKeyToAccount(privateKey);
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
	const address = env.FOC_WALLET_ADDRESS;
	if (!address) {
		throw new Error("FOC_WALLET_ADDRESS is not configured");
	}
	return getAddress(address);
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
				withCDN: WITH_CDN,
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
			withCDN: WITH_CDN,
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

/** FilBeam retrieval host per FOC docs: mainnet has no network label in the domain. */
export function filbeamRetrievalHost(
	chain: "local" | "testnet" | "mainnet",
): string {
	return chain === "mainnet" ? "filbeam.io" : "calibration.filbeam.io";
}

export function archivalCdnUrl(pieceCid: string): string {
	const host = filbeamRetrievalHost(env.CHAIN);
	return `https://${getFocWalletAddress()}.${host}/${pieceCid}`;
}

function stringifyNumberish(value: bigint | number | string | undefined) {
	return typeof value === "bigint" ? value.toString() : value;
}

function summarizeFailure(failure: unknown): unknown {
	if (!failure || typeof failure !== "object") {
		return failure;
	}
	const record = failure as Record<string, unknown>;
	return {
		providerId: stringifyNumberish(
			record.providerId as bigint | number | string | undefined,
		),
		error:
			typeof record.error === "string"
				? record.error
				: record.error instanceof Error
					? record.error.message
					: undefined,
		reason: typeof record.reason === "string" ? record.reason : undefined,
	};
}

export function summarizeSynapseUploadResult(result: UploadResult) {
	const inspected = result as UploadResultDiagnostic;
	return {
		pieceCid: result.pieceCid.toString(),
		complete: inspected.complete,
		requestedCopies: inspected.requestedCopies,
		size: stringifyNumberish(inspected.size),
		copies: inspected.copies.map((copy) => ({
			dataSetId: stringifyNumberish(copy.dataSetId),
			pieceId: stringifyNumberish(copy.pieceId),
			role: copy.role,
			providerId: stringifyNumberish(copy.providerId),
			retrievalUrl: copy.retrievalUrl,
			isNewDataSet: copy.isNewDataSet,
		})),
		failedAttemptsCount: inspected.failedAttempts?.length ?? 0,
		failedAttempts: inspected.failedAttempts?.slice(0, 5).map(summarizeFailure),
	};
}

export function assertCompleteSynapseUpload(result: UploadResult): void {
	const inspected = result as UploadResultDiagnostic;
	if (inspected.copies.length === 0) {
		throw new Error("Synapse upload returned no committed copies");
	}
	if (inspected.complete === false) {
		throw new Error("Synapse upload did not complete all requested copies");
	}
}

/** Stable id stored on `foc_objects.deal_id` from an upload result. */
export function dealIdFromUploadResult(result: UploadResult): string {
	assertCompleteSynapseUpload(result);
	const primary = result.copies[0];
	if (!primary) {
		throw new Error("Synapse upload returned no committed copies");
	}
	return `${primary.dataSetId}:${primary.pieceId}`;
}

export type { Address };
