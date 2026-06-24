import { mock } from "bun:test";

const clientTestEnvStub = {
	VITE_DEPLOYMENT: "local",
	VITE_CHAIN: "local",
	VITE_THIRDWEB_CLIENT_ID: "test",
	VITE_SERVER_URL: "http://localhost:3000",
	VITE_ASTRO_URL: "http://localhost:4321",
	VITE_CLIENT_URL: "http://localhost:5173",
	VITE_POSTHOG_HOST: "https://app.posthog.com",
} as const;

mock.module("@/src/env", () => ({
	default: clientTestEnvStub,
}));

mock.module("@/src/constants", () => ({
	SUPPORTED_TOKENS: [
		{
			address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
			decimals: 6,
			symbol: "USDC",
			name: "USDC",
			icon: "/usdc.png",
		},
	],
	supportedChains: [],
	defaultChain: { id: 31_337 },
}));

import { beforeEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getAddress } from "viem";
import { mapEnvelopeRosterToRecipients } from "@/src/lib/domains/satellites/map-signers-to-recipients";
import type { SettlementAttachmentDraft } from "@/src/lib/domains/settlements/utils/attachment-draft";
import { resolveSettlementDraftsForSend } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/resolve-settlement-drafts";

const signerWallet = getAddress("0x1111111111111111111111111111111111111111");
const viewerWallet = getAddress("0x2222222222222222222222222222222222222222");

describe("mapEnvelopeRosterToRecipients", () => {
	test("maps signers and viewers with walletAddress and real emails", () => {
		const recipients = mapEnvelopeRosterToRecipients({
			signers: [
				{ wallet: signerWallet, name: "Alice", email: "alice@example.com" },
			],
			viewers: [
				{ wallet: viewerWallet, name: "Bob", email: "bob@example.com" },
			],
		});

		expect(recipients).toHaveLength(2);
		expect(recipients[0]).toMatchObject({
			role: "signer",
			email: "alice@example.com",
			walletAddress: signerWallet,
			clientRowId: signerWallet,
		});
		expect(recipients[1]).toMatchObject({
			role: "viewer",
			email: "bob@example.com",
			walletAddress: viewerWallet,
			clientRowId: viewerWallet,
		});
		expect(recipients[0]?.email).not.toContain("0x");
	});

	test("skips roster rows without valid wallet addresses", () => {
		const recipients = mapEnvelopeRosterToRecipients({
			signers: [{ wallet: "not-an-address", email: "cold@example.com" }],
		});
		expect(recipients).toEqual([]);
	});
});

describe("buildSettlementAttachRules", () => {
	const lookupProfile = mock(async () => null);

	beforeEach(() => {
		lookupProfile.mockReset();
		lookupProfile.mockImplementation(async () => null);
	});

	test("resolves wallet from recipient.walletAddress without profile lookup", async () => {
		const recipients = mapEnvelopeRosterToRecipients({
			signers: [
				{ wallet: signerWallet, name: "Alice", email: "alice@example.com" },
			],
		});

		const legs: SettlementAttachmentDraft[] = [
			{
				id: "leg-1",
				ruleId: "rule-1",
				recipientClientRowId: signerWallet,
				recipientEmail: "alice@example.com",
				recipientSource: "signer",
				recipientLabel: "Alice",
				amountUsdc: "10",
				releaseType: "all_signed",
			},
		];

		const { buildSettlementAttachRules } = await import(
			"@/src/lib/domains/settlements/utils/build-attach-rules"
		);

		const rules = await buildSettlementAttachRules({
			legs,
			recipients,
			lookupProfile,
		});

		expect(lookupProfile).not.toHaveBeenCalled();
		expect(rules).toHaveLength(1);
		expect(rules[0]?.legs[0]?.recipientWallet).toBe(signerWallet);
	});

	test("uses profile lookup when recipient wallet is missing on draft", async () => {
		const recipients = mapEnvelopeRosterToRecipients({
			signers: [
				{ wallet: signerWallet, name: "Alice", email: "alice@example.com" },
			],
		});

		lookupProfile.mockImplementation(async () => ({
			walletAddress: signerWallet,
		}));

		const legs: SettlementAttachmentDraft[] = [
			{
				id: "leg-1",
				ruleId: "rule-1",
				recipientClientRowId: signerWallet,
				recipientEmail: "alice@example.com",
				recipientSource: "signer",
				recipientLabel: "Alice",
				amountUsdc: "5",
				releaseType: "all_signed",
			},
		];

		const { buildSettlementAttachRules } = await import(
			"@/src/lib/domains/settlements/utils/build-attach-rules"
		);

		const rules = await buildSettlementAttachRules({
			legs,
			recipients: recipients.map((recipient) => ({
				...recipient,
				walletAddress: undefined,
			})),
			lookupProfile,
		});

		expect(lookupProfile).toHaveBeenCalled();
		expect(rules[0]?.legs[0]?.recipientWallet).toBe(signerWallet);
	});

	test("throws when wallet cannot be resolved", async () => {
		const recipients = mapEnvelopeRosterToRecipients({
			signers: [
				{ wallet: signerWallet, name: "Alice", email: "alice@example.com" },
			],
		});

		const { buildSettlementAttachRules } = await import(
			"@/src/lib/domains/settlements/utils/build-attach-rules"
		);

		await expect(
			buildSettlementAttachRules({
				legs: [
					{
						id: "leg-1",
						ruleId: "rule-1",
						recipientClientRowId: signerWallet,
						recipientEmail: "alice@example.com",
						recipientSource: "signer",
						recipientLabel: "Alice",
						amountUsdc: "5",
						releaseType: "all_signed",
					},
				],
				recipients: recipients.map((recipient) => ({
					...recipient,
					walletAddress: undefined,
				})),
				lookupProfile,
			}),
		).rejects.toThrow(/Filosign account with a linked wallet/);
	});

	test("legs without recipientWallet resolve before rule build", async () => {
		const recipients = mapEnvelopeRosterToRecipients({
			signers: [
				{ wallet: signerWallet, name: "Alice", email: "alice@example.com" },
			],
		});

		const legs: SettlementAttachmentDraft[] = [
			{
				id: "leg-1",
				ruleId: "rule-1",
				recipientClientRowId: signerWallet,
				recipientEmail: "alice@example.com",
				recipientSource: "signer",
				recipientLabel: "Alice",
				amountUsdc: "10",
				releaseType: "all_signed",
			},
		];

		const resolved = await resolveSettlementDraftsForSend({
			drafts: legs,
			recipients,
			lookupProfile: async () => null,
		});

		expect(resolved[0]?.recipientWallet).toBe(signerWallet);
	});
});

describe("payout attach dialog", () => {
	test("attach mode delegates legs instead of building rules inline", () => {
		const src = readFileSync(
			join(
				import.meta.dir,
				"../../src/lib/domains/satellites/payout-rule-dialog.tsx",
			),
			"utf8",
		);
		expect(src).toContain("onAttachLegs");
		expect(src).not.toContain("leg.recipientWallet as `0x${string}`");
	});
});
