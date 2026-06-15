import type {
	CreateForm,
	SignatureField,
} from "@/src/lib/domains/files/envelope-form-types";
import {
	resolveSelfSignerOnRoster,
	type SelfProfileForRoster,
} from "@/src/lib/domains/placement/utils/self-signer";
import { isTurnOrderEnabled } from "@/src/routes/dashboard/envelope/create/-lib/utils/routing-turn-order";
import { selfAssignedFieldIds } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placement-assignees";

export type SelfSignAfterSendPlan = {
	selfEmail: string;
	selfFieldIds: string[];
};

/** When post-send auto self-sign may run (fields assigned + routing turn + payout ack gates). */
export function resolveSelfSignAfterSendPlan(args: {
	createForm: CreateForm;
	signatureFields: SignatureField[];
	selfProfile: SelfProfileForRoster | undefined;
}): SelfSignAfterSendPlan | null {
	const selfOnRoster = resolveSelfSignerOnRoster(
		args.createForm.recipients ?? [],
		args.selfProfile,
	);
	if (!selfOnRoster) return null;

	const selfFieldIds = selfAssignedFieldIds(
		args.signatureFields,
		selfOnRoster.email,
	);
	if (selfFieldIds.length === 0) return null;

	const routing = args.createForm.registerRouting;
	if (isTurnOrderEnabled(routing)) {
		const order = routing?.routingOrderEmails ?? [];
		const normalizedSelf = selfOnRoster.email.trim().toLowerCase();
		const firstSigner = order[0]?.trim().toLowerCase();
		if (firstSigner && firstSigner !== normalizedSelf) {
			return null;
		}
	}

	if ((args.createForm.settlementDrafts?.length ?? 0) > 0) {
		return null;
	}

	return { selfEmail: selfOnRoster.email, selfFieldIds };
}
