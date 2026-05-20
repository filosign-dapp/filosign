import {
	calibration,
	mainnet,
	Synapse,
	type SynapseOptions,
} from "@filoz/synapse-sdk";
import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import env from "@/env";
import db from "@/lib/platform/db";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

// because filbeam links are very useful
const WITH_CDN = true;

const account = privateKeyToAccount(
	(env.EVM_PRIVATE_KEY_SYNAPSE.startsWith("0x")
		? env.EVM_PRIVATE_KEY_SYNAPSE
		: `0x${env.EVM_PRIVATE_KEY_SYNAPSE}`) as `0x${string}`,
);

const synapseChain = env.CHAIN === "mainnet" ? mainnet : calibration;

const synapseOptions: SynapseOptions = {
	account,
	chain: synapseChain,
	transport: http(synapseChain.rpcUrls.default.http[0]),
	source: "filosign",
	withCDN: WITH_CDN,
};

export const synapse = Synapse.create(synapseOptions);

export async function getOrCreateUserDataset(walletAddress: Address) {
	const [existing] = await db
		.select()
		.from(db.schema.usersDatasets)
		.where(eq(db.schema.usersDatasets.walletAddress, walletAddress));

	if (existing) {
		const ctx = await tryCatch(
			synapse.storage.createContext({
				dataSetId: BigInt(existing.dataSetId),
				metadata: { filosign_user: walletAddress },
			}),
		);

		if (ctx.error) {
			throw new Error(
				"Fail to create synapse context for existing user dataset",
				ctx.error,
			);
		}

		return ctx.data;
	}

	const ctx = await tryCatch(
		synapse.storage.createContext({
			metadata: { filosign_user: walletAddress },
		}),
	);

	if (ctx.error) {
		throw new Error("Fail to create synapse context for new user dataset");
	}

	if (ctx.data.dataSetId !== undefined) {
		await db.insert(db.schema.usersDatasets).values({
			walletAddress,
			dataSetId: Number(ctx.data.dataSetId),
			providerAddress: ctx.data.provider.serviceProvider,
		});
	}

	return ctx.data;
}
