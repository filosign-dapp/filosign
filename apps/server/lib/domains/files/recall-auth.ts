import { throwAppError } from "@filosign/errors/server";
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
		throw throwAppError("FILES.FORBIDDEN");
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
		throw throwAppError("WORKSPACE.ORGANIZATION_MISMATCH");
	}
	if (!orgRoleHasPermission(args.activeOrg.role, "org:manage")) {
		throw throwAppError("FILES.FORBIDDEN");
	}
}
