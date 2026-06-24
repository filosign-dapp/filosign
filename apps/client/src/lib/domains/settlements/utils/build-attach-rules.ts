import type { FilosignRpcQueryUtils } from "@filosign/react";
import type { SettlementRuleDraft } from "@filosign/react/files";
import type { Recipient } from "@/src/lib/domains/files/envelope-form-types";
import { buildSettlementRulesForSend } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/build-settlement-rules";
import {
	type ProfileLookupResult,
	resolveSettlementDraftsForSend,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/resolve-settlement-drafts";
import type { SettlementAttachmentDraft } from "./attachment-draft";

export type SettlementProfileLookup = (
	email: string,
) => Promise<ProfileLookupResult>;

export function createSettlementProfileLookup(
	rpcQuery: FilosignRpcQueryUtils,
): SettlementProfileLookup {
	return async (email) => {
		try {
			const profile = await rpcQuery.users.profile.lookup.call({
				query: email,
			});
			return { walletAddress: profile.walletAddress };
		} catch {
			return null;
		}
	};
}

export async function buildSettlementAttachRules(args: {
	legs: SettlementAttachmentDraft[];
	recipients: Recipient[];
	lookupProfile: SettlementProfileLookup;
	canUseAdvancedSettlements?: boolean;
}): Promise<SettlementRuleDraft[]> {
	const resolved = await resolveSettlementDraftsForSend({
		drafts: args.legs,
		recipients: args.recipients,
		lookupProfile: args.lookupProfile,
	});

	return buildSettlementRulesForSend({
		drafts: resolved,
		recipients: args.recipients,
		canUseAdvancedSettlements: args.canUseAdvancedSettlements,
	});
}
