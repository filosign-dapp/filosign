import type { AttachmentPacketReleaseMode } from "./attachment";
import { hashNormalizedSignerEmail } from "./crypto";
import { normalizePlacementRecipientEmail } from "./placement";
import { settlementReleaseTypeLabel } from "./settlement-legal";
import type { SettlementReleaseType } from "./settlement-rules";

export function supplementaryPacketUnlockSummary(args: {
	releaseMode: AttachmentPacketReleaseMode;
	releaseType?: SettlementReleaseType | string | null;
	releaseParams?: Record<string, unknown> | null;
	/** Signer roster emails on the envelope (for specific-signer labels). */
	signerEmails?: readonly string[];
}): string {
	if (args.releaseMode === "review") {
		return "Available after the envelope is sent";
	}

	const releaseType = (args.releaseType ??
		"all_signed") as SettlementReleaseType;
	const params = args.releaseParams ?? {};
	const base = settlementReleaseTypeLabel(releaseType);

	if (releaseType === "specific_signer") {
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

	if (releaseType === "at_least_n" && typeof params.thresholdN === "number") {
		return `Unlocks when at least ${params.thresholdN} selected signer(s) sign`;
	}
	if (
		releaseType === "quorum_required" &&
		typeof params.thresholdN === "number"
	) {
		return `Unlocks when at least ${params.thresholdN} required signature(s) are collected`;
	}
	if (releaseType === "quorum_set" && typeof params.thresholdN === "number") {
		return `Unlocks when at least ${params.thresholdN} signer(s) from your chosen group sign`;
	}
	if (releaseType === "quorum_all" && typeof params.thresholdN === "number") {
		return `Unlocks when at least ${params.thresholdN} signer(s) from the roster sign`;
	}

	return `Unlocks when: ${base}`;
}
