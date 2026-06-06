import type { ComplianceBundle } from "@filosign/shared";
import {
	hashAuthSubjectCommitment,
	hashNormalizedSignerEmail,
	normalizePlacementRecipientEmail,
} from "@filosign/shared";
import { getAddress } from "viem";
import type { ComplianceLoadContext } from "../load-context";
import { displayNameFromUser, roleOrder } from "../types";

export function buildComplianceParties(
	ctx: ComplianceLoadContext,
): ComplianceBundle["parties"] {
	const sortedParticipants = [...ctx.participantRows].sort((a, b) => {
		const ro = roleOrder(a.role) - roleOrder(b.role);
		if (ro !== 0) return ro;
		return getAddress(a.wallet).localeCompare(getAddress(b.wallet));
	});

	return sortedParticipants.map((p) => {
		const wallet = getAddress(p.wallet);
		const emailRaw = p.email?.trim();
		if (!emailRaw) {
			throw new Error(
				`Participant ${wallet} missing email for compliance export`,
			);
		}
		const email = normalizePlacementRecipientEmail(emailRaw);
		const emailCommitment = hashNormalizedSignerEmail(email);
		const authSubjectCommitment = p.authProviderId?.trim()
			? hashAuthSubjectCommitment(p.authProviderId.trim())
			: null;
		return {
			role: p.role,
			wallet,
			email,
			displayName: displayNameFromUser(p),
			emailCommitment,
			authSubjectCommitment,
		};
	});
}
