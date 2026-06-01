import type { AppErrorCode } from "./catalog/index";

/** Maps legacy server `ORPCError.message` strings to catalog codes during migration. */
export const LEGACY_MESSAGE_TO_APP_CODE: Record<string, AppErrorCode> = {
	"Acknowledge the document before accessing it": "SIGNING.ACK_REQUIRED",
	"Open and view the document before signing": "SIGNING.VIEW_BEFORE_SIGN",
	"Document must be viewed after acknowledgement": "SIGNING.VIEW_AFTER_ACK",
	"Document must be viewed before signing": "SIGNING.VIEW_BEFORE_SIGN",
	"You are not required to sign this file": "SIGNING.NOT_REQUIRED",
	"Already signed": "SIGNING.ALREADY_SIGNED",
	"Add a primary email to your Filosign profile to sign placement fields":
		"SIGNING.EMAIL_REQUIRED",
	"All required fields must be marked complete before signing":
		"SIGNING.PLACEMENT_INCOMPLETE",
	FEATURE_DISABLED: "ENTITLEMENT.FEATURE_DISABLED",
	QUOTA_EXCEEDED: "ENTITLEMENT.QUOTA_EXCEEDED",
	LIMIT_EXCEEDED: "ENTITLEMENT.LIMIT_EXCEEDED",
	"No unlocked key seed found": "CLIENT.CRYPTO.NOT_UNLOCKED",
	"No unlocked key seed found, most probably not logged in":
		"CLIENT.CRYPTO.NOT_UNLOCKED",
};

export function legacyAppCodeFromMessage(message: string): AppErrorCode | null {
	const trimmed = message.trim();
	const direct = LEGACY_MESSAGE_TO_APP_CODE[trimmed];
	if (direct) return direct;
	return null;
}
