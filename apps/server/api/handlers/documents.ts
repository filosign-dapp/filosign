import type { Address } from "viem";
import { documentsList } from "@/lib/domains/documents";
import type { ActiveOrgContext } from "@/lib/domains/orgs";

export async function documentsListHandler(
	userWallet: Address,
	activeOrg: ActiveOrgContext | null,
	input: unknown,
) {
	return documentsList({
		wallet: userWallet,
		activeOrg,
		input,
	});
}
