import type { Address, Hex } from "viem";
import { decryptDraftDekFromOrgHead } from "./draft-crypto";

export type DraftHead = {
	draft?: { organizationId?: string | null };
	headDekWrappedOmk?: string | null;
	headOmkKemCiphertext?: string | null;
};

/** Org id from draft metadata (not the active workspace selector). */
export function draftOrganizationId(head: DraftHead): string {
	const id = head.draft?.organizationId;
	if (!id) throw new Error("Draft has no organization");
	return id;
}

export async function resolveDraftDek(args: {
	draftId: string;
	head: DraftHead;
	wallet: Address;
	myOrgWrap: { wrappedOmk: Hex; wrapKemCiphertext: Hex };
}): Promise<Uint8Array> {
	if (!args.head.headDekWrappedOmk || !args.head.headOmkKemCiphertext) {
		throw new Error("Draft is not saved with encryption keys yet");
	}
	return decryptDraftDekFromOrgHead({
		draftId: args.draftId,
		headDekWrappedOmk: args.head.headDekWrappedOmk as Hex,
		headOmkKemCiphertext: args.head.headOmkKemCiphertext as Hex,
		wallet: args.wallet,
		myWrap: args.myOrgWrap,
	});
}
