import { ORPCError } from "@orpc/server";
import type { Address } from "viem";
import { getAddress } from "viem";
import {
	type ActiveOrgContext,
	assertOrgControllerMayRelay,
	orgRoleHasPermission,
} from "@/lib/domains/orgs";

export async function assertRecallerMayRelay(args: {
	wallet: Address;
	file: {
		sender: Address;
		organizationId: string;
	};
	recaller: Address;
	activeOrg: ActiveOrgContext | null;
	registryAddress?: string | null;
}) {
	const senderNorm = getAddress(args.file.sender);
	const recallerNorm = getAddress(args.recaller);
	const walletNorm = getAddress(args.wallet);

	if (walletNorm !== recallerNorm) {
		throw new ORPCError("FORBIDDEN", {
			message: "Connected wallet must match recaller",
		});
	}

	if (recallerNorm === senderNorm) return;

	await assertOrgControllerMayRelay({
		organizationId: args.file.organizationId,
		wallet: recallerNorm,
		registryAddress: args.registryAddress,
	});

	if (
		!args.activeOrg ||
		args.activeOrg.organizationId !== args.file.organizationId
	) {
		throw new ORPCError("FORBIDDEN", {
			message: "Switch to the file organization to recall",
		});
	}
	if (!orgRoleHasPermission(args.activeOrg.role, "org:manage")) {
		throw new ORPCError("FORBIDDEN", {
			message: "Organization manage permission required to recall",
		});
	}
}
