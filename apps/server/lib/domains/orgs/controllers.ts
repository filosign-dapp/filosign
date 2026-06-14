import { throwAppError } from "@filosign/errors/server";
import { hashOrgIdCommitment } from "@filosign/shared";
import { and, eq, inArray } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import db from "@/lib/platform/db";
import { fsContracts, fsEnvelopeRegistryAt } from "@/lib/platform/evm";
import { withRelayerLock } from "@/lib/platform/evm/relayer-lock";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

const CONTROLLER_ROLES = ["owner", "admin"] as const;

/** Active org wallets that may void/amend/attachment-govern on-chain (owner + admin). */
export async function listOrgControllerWallets(
	organizationId: string,
): Promise<Address[]> {
	const organizationMembers = db.schema.organizationMembers;
	const rows = await db
		.select({ walletAddress: organizationMembers.walletAddress })
		.from(organizationMembers)
		.where(
			and(
				eq(organizationMembers.organizationId, organizationId),
				eq(organizationMembers.status, "active"),
				inArray(organizationMembers.role, [...CONTROLLER_ROLES]),
			),
		);

	const seen = new Set<string>();
	const wallets: Address[] = [];
	for (const row of rows) {
		const norm = getAddress(row.walletAddress).toLowerCase();
		if (seen.has(norm)) continue;
		seen.add(norm);
		wallets.push(getAddress(row.walletAddress));
	}
	return wallets;
}

export async function isOrgControllerWallet(args: {
	organizationId: string;
	wallet: Address;
}): Promise<boolean> {
	const controllers = await listOrgControllerWallets(args.organizationId);
	const norm = getAddress(args.wallet).toLowerCase();
	return controllers.some((w) => getAddress(w).toLowerCase() === norm);
}

export async function readOrgControllerOnChain(args: {
	organizationId: string;
	wallet: Address;
	registryAddress?: string | null;
}): Promise<boolean> {
	const registry = fsEnvelopeRegistryAt(args.registryAddress);
	const orgIdCommitment = hashOrgIdCommitment(args.organizationId);
	const res = await tryCatch(
		registry.read.isOrgController([orgIdCommitment, getAddress(args.wallet)]),
	);
	if (res.error || res.data == null) return false;
	return Boolean(res.data);
}

/** Postgres owner/admin plus on-chain controller mapping (fail fast before relay). */
export async function assertOrgControllerMayRelay(args: {
	organizationId: string;
	wallet: Address;
	registryAddress?: string | null;
}): Promise<void> {
	const wallet = getAddress(args.wallet);
	if (
		!(await isOrgControllerWallet({
			organizationId: args.organizationId,
			wallet,
		}))
	) {
		throw throwAppError("WORKSPACE.NOT_MEMBER");
	}
	const onChain = await readOrgControllerOnChain({
		organizationId: args.organizationId,
		wallet,
		registryAddress: args.registryAddress,
	});
	if (!onChain) {
		throw throwAppError("WORKSPACE.WALLET_CONTROLLER_MISMATCH");
	}
}

/** Pushes owner+admin controller set to FSEnvelopeRegistry (onlyServer). */
export async function syncOrgControllersOnChain(
	organizationId: string,
): Promise<void> {
	const orgIdCommitment = hashOrgIdCommitment(organizationId);
	const wallets = await listOrgControllerWallets(organizationId);
	if (wallets.length === 0) return;

	const res = await tryCatch(
		withRelayerLock(() =>
			fsContracts.FSEnvelopeRegistry.write.setOrgControllers([
				orgIdCommitment,
				wallets,
			]),
		),
	);
	if (res.error) {
		throw res.error;
	}
}
