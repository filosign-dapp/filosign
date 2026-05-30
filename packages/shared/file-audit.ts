import type { Hex } from "viem";
import { isHex } from "viem";

/** AckFile UI/legal intent version stored on `file_acknowledgements.intent_version`. */
export const FILE_ACK_INTENT_VERSION_V1 = "receive_and_review_v1" as const;

export type FileAckIntentVersion = typeof FILE_ACK_INTENT_VERSION_V1;

export const FILE_ACK_INTENT_LABELS: Record<FileAckIntentVersion, string> = {
	receive_and_review_v1:
		"I accept this document and agree to review it electronically before signing.",
};

export const documentViewSources = [
	"sign_page",
	"file_viewer",
	"inbox",
] as const;

export type DocumentViewSource = (typeof documentViewSources)[number];

/** Shown in the pre-sign confirmation dialog (signer attestation). */
export const SIGN_REVIEW_ATTESTATION_V1 =
	"I confirm I have carefully read and reviewed this document and its terms, and I intend to sign it. I understand Filosign does not determine legal suitability.";

export const SIGN_ESIGN_CONSENT_V1 =
	"By signing, I agree to use electronic records and signatures for this document.";

/** Full pre-sign confirmation copy (dialog only). */
export const SIGN_CONFIRM_DESCRIPTION_V1 = `${SIGN_REVIEW_ATTESTATION_V1} ${SIGN_ESIGN_CONSENT_V1}`;

/** True when `ack` column holds a real EIP-712 signature (not a placeholder). */
export function isValidAckSignature(ackHex: string): ackHex is Hex {
	return isHex(ackHex) && ackHex.length >= 130;
}
