import type { AttachmentPacketReleaseMode } from "./attachment";
import { hashNormalizedSignerEmail } from "./crypto";
import { normalizePlacementRecipientEmail } from "./placement";
import { settlementReleaseTypeLabel } from "./settlement-legal";
import type {
	SettlementReleaseParams,
	SettlementReleaseType,
} from "./settlement-rules";

export function supplementaryPacketUnlockSummary(args: {
	releaseMode: AttachmentPacketReleaseMode;
	releaseType?: SettlementReleaseType | string | null;
	releaseParams?: SettlementReleaseParams | null;
	/** Signer roster emails on the envelope (for specific-signer labels). */
	signerEmails?: readonly string[];
}): string {
	if (args.releaseMode === "review") {
		return "Available after the envelope is sent";
	}

	const releaseType = (args.releaseType ??
		"all_signed") as SettlementReleaseType;
	const params = args.releaseParams;
	const base = settlementReleaseTypeLabel(releaseType);

	if (
		releaseType === "specific_signer" &&
		params?.releaseType === "specific_signer"
	) {
		const commitment = params.signerEmailCommitment;
		if (typeof commitment === "string" && args.signerEmails?.length) {
			const match = args.signerEmails.find(
				(email) =>
					hashNormalizedSignerEmail(normalizePlacementRecipientEmail(email)) ===
					commitment,
			);
			if (match) {
				return `Unlocks when ${match} signs`;
			}
		}
		return `Unlocks when: ${base}`;
	}

	if (releaseType === "at_least_n" && params?.releaseType === "at_least_n") {
		const thresholdN = params.thresholdN;
		return `Unlocks when at least ${thresholdN} selected signer(s) sign`;
	}
	if (
		releaseType === "quorum_required" &&
		params?.releaseType === "quorum_required"
	) {
		return `Unlocks when at least ${params.thresholdN} required signature(s) are collected`;
	}
	if (releaseType === "quorum_set" && params?.releaseType === "quorum_set") {
		return `Unlocks when at least ${params.thresholdN} signer(s) from your chosen group sign`;
	}
	if (releaseType === "quorum_all" && params?.releaseType === "quorum_all") {
		return `Unlocks when at least ${params.thresholdN} signer(s) from the roster sign`;
	}

	return `Unlocks when: ${base}`;
}
