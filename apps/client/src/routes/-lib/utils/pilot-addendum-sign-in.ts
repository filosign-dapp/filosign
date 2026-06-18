import type { SignInGateController } from "@/src/routes/-lib/hooks/use-sign-in-gate";

/** New-user platform invite registration requires Design Partner Addendum except manual_paid. */
export function requiresDesignPartnerAddendum(
	signInGate: Pick<SignInGateController, "gateState" | "isReturningUser">,
): boolean {
	if (signInGate.isReturningUser) return false;
	const { gateState } = signInGate;
	if (gateState.status !== "ready" || gateState.gate !== "platform_invite") {
		return false;
	}
	return gateState.inviteKind !== "manual_paid";
}
