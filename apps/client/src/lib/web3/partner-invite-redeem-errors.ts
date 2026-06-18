import {
	isAppErrorCode,
	isOrpcErrorLike,
	readAppCodeFromOrpc,
} from "@filosign/errors";

const PERMANENT_PARTNER_INVITE_REDEEM_CODES = new Set([
	"WORKSPACE.PLATFORM_EMAIL_MISMATCH",
	"WORKSPACE.PLATFORM_INVITE_NOT_FOUND",
	"WORKSPACE.PLATFORM_INVITE_PAID_PLAN_BLOCKS",
]);

export function isPartnerInviteEmailMismatchError(error: unknown): boolean {
	if (!isOrpcErrorLike(error)) return false;
	return readAppCodeFromOrpc(error) === "WORKSPACE.PLATFORM_EMAIL_MISMATCH";
}

export function isPermanentPartnerInviteRedeemError(error: unknown): boolean {
	if (!isOrpcErrorLike(error)) return false;
	const code = readAppCodeFromOrpc(error);
	return Boolean(
		code &&
			isAppErrorCode(code) &&
			PERMANENT_PARTNER_INVITE_REDEEM_CODES.has(code),
	);
}

export function shouldPreservePartnerInviteGate(error: unknown): boolean {
	if (isPartnerInviteEmailMismatchError(error)) return true;
	if (isPermanentPartnerInviteRedeemError(error)) return false;
	return true;
}

export function shouldClearAccessGateAfterPartnerRedeemError(
	error: unknown,
): boolean {
	return (
		isPermanentPartnerInviteRedeemError(error) &&
		!isPartnerInviteEmailMismatchError(error)
	);
}
