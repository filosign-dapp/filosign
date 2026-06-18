import { randomBytes } from "node:crypto";
import { getPlanName, type PlanId } from "@filosign/entitlements";
import type db from "@/lib/platform/db";

export type PlatformAccessTx = Parameters<
	Parameters<typeof db.transaction>[0]
>[0];

export function generatePlatformInviteToken(): string {
	return randomBytes(24).toString("base64url");
}

export function generateSetupToken(): string {
	return randomBytes(24).toString("base64url");
}

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function planLabel(planId: PlanId): string {
	return getPlanName(planId);
}

export type PlatformGatePreview =
	| {
			valid: true;
			gate:
				| "platform_invite"
				| "paid_setup"
				| "cold_recipient"
				| "returning_user"
				| "admin_bootstrap";
			lockedEmail: string;
			planLabel: string | null;
			trialDays: number | null;
			expiresAt: string | null;
			inviteKind?: "partner_trial" | "manual_paid";
	  }
	| {
			valid: false;
			reason: string;
	  };

export function inviteIsActive(row: {
	revokedAt: Date | null;
	expiresAt: Date | null;
	maxRedemptions: number;
	redemptionCount: number;
}): boolean {
	if (row.revokedAt) return false;
	if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) return false;
	if (row.redemptionCount >= row.maxRedemptions) return false;
	return true;
}
