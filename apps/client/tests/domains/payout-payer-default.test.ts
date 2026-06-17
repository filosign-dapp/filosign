import { describe, expect, test } from "bun:test";
import type { EntitlementsSnapshot } from "@filosign/react/billing";
import { getAddress } from "viem";
import { resolveFeatureAccess } from "@/src/lib/domains/entitlements/resolve-feature-access";
import {
	defaultPayoutPayerSource,
	resolveTreasuryPayerOffer,
} from "@/src/lib/domains/settlements/utils/payout-payer-default";

const connected = getAddress("0x1111111111111111111111111111111111111111");
const treasury = getAddress("0x2222222222222222222222222222222222222222");

function entitlements(
	features: Partial<Record<string, boolean>>,
): EntitlementsSnapshot {
	return {
		planId: "teams_pro",
		features: Object.fromEntries(
			Object.entries(features).map(([key, enabled]) => [
				key,
				{ enabled: enabled ?? false },
			]),
		),
	} as unknown as EntitlementsSnapshot;
}

const teamsProEntitlements = entitlements({
	"features.treasury.workspace_custom": true,
});
const freeEntitlements = entitlements({
	"features.treasury.workspace_custom": false,
});

describe("resolveFeatureAccess", () => {
	test("returns hidden when hidden flag is set", () => {
		expect(resolveFeatureAccess({ enabled: true, hidden: true })).toBe(
			"hidden",
		);
	});

	test("returns full when enabled", () => {
		expect(resolveFeatureAccess({ enabled: true })).toBe("full");
	});

	test("returns teaser when not enabled", () => {
		expect(resolveFeatureAccess({ enabled: false })).toBe("teaser");
	});
});

describe("resolveTreasuryPayerOffer", () => {
	test("offers treasury when entitled and wallets differ", () => {
		expect(
			resolveTreasuryPayerOffer({
				entitlements: teamsProEntitlements,
				orgWalletAddress: treasury,
				connectedWalletAddress: connected,
			}).canOfferTreasuryPayer,
		).toBe(true);
	});

	test("does not offer treasury on free plan", () => {
		expect(
			resolveTreasuryPayerOffer({
				entitlements: freeEntitlements,
				orgWalletAddress: treasury,
				connectedWalletAddress: connected,
			}).canOfferTreasuryPayer,
		).toBe(false);
	});

	test("does not offer treasury when org wallet matches connected wallet", () => {
		expect(
			resolveTreasuryPayerOffer({
				entitlements: teamsProEntitlements,
				orgWalletAddress: connected,
				connectedWalletAddress: connected,
			}).canOfferTreasuryPayer,
		).toBe(false);
	});

	test("does not offer treasury without linked org wallet", () => {
		expect(
			resolveTreasuryPayerOffer({
				entitlements: teamsProEntitlements,
				orgWalletAddress: null,
				connectedWalletAddress: connected,
			}).canOfferTreasuryPayer,
		).toBe(false);
	});
});

describe("defaultPayoutPayerSource", () => {
	test("defaults to org_wallet when treasury is offered", () => {
		expect(defaultPayoutPayerSource({ canOfferTreasuryPayer: true })).toBe(
			"org_wallet",
		);
	});

	test("defaults to sender when treasury is not offered", () => {
		expect(defaultPayoutPayerSource({ canOfferTreasuryPayer: false })).toBe(
			"sender",
		);
	});

	test("respects user override to sender", () => {
		expect(
			defaultPayoutPayerSource({
				canOfferTreasuryPayer: true,
				payoutPayerUserOverride: true,
				currentSource: "sender",
			}),
		).toBe("sender");
	});

	test("respects user override to org_wallet", () => {
		expect(
			defaultPayoutPayerSource({
				canOfferTreasuryPayer: true,
				payoutPayerUserOverride: true,
				currentSource: "org_wallet",
			}),
		).toBe("org_wallet");
	});
});
