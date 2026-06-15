import { describe, expect, test } from "bun:test";
import type {
	CreateForm,
	SignatureField,
} from "@/src/lib/domains/files/envelope-form-types";
import { resolveSelfSignAfterSendPlan } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/self-sign-eligibility";

const selfProfile = {
	email: "me@example.com",
	walletAddress: "0x0000000000000000000000000000000000000001",
};

function baseForm(overrides: Partial<CreateForm> = {}): CreateForm {
	return {
		documents: [{ id: "doc-1", name: "Test.pdf", bytes: new Uint8Array() }],
		recipients: [
			{
				clientRowId: "other",
				name: "Other",
				email: "other@example.com",
				role: "signer",
			},
			{
				clientRowId: "self",
				name: "Me",
				email: "me@example.com",
				role: "signer",
				isAutoAddedSelf: true,
			},
		],
		registerRouting: {
			routingMode: 1,
			routingOrderEmails: ["other@example.com", "me@example.com"],
		},
		...overrides,
	} as CreateForm;
}

const selfFields: SignatureField[] = [
	{
		id: "field-1",
		documentId: "doc-1",
		type: "signature",
		assignedSignerEmail: "me@example.com",
		x: 0,
		y: 0,
		width: 100,
		height: 40,
		required: true,
	},
];

describe("resolveSelfSignAfterSendPlan", () => {
	test("returns null when turn order blocks self-sign", () => {
		expect(
			resolveSelfSignAfterSendPlan({
				createForm: baseForm(),
				signatureFields: selfFields,
				selfProfile,
			}),
		).toBeNull();
	});

	test("returns plan when self is first in turn order", () => {
		expect(
			resolveSelfSignAfterSendPlan({
				createForm: baseForm({
					registerRouting: {
						routingMode: 1,
						routingOrderEmails: ["me@example.com", "other@example.com"],
					},
				}),
				signatureFields: selfFields,
				selfProfile,
			}),
		).toEqual({
			selfEmail: "me@example.com",
			selfFieldIds: ["field-1"],
		});
	});

	test("returns null when payouts are attached", () => {
		expect(
			resolveSelfSignAfterSendPlan({
				createForm: baseForm({
					registerRouting: { routingMode: 0, routingOrderEmails: [] },
					settlementDrafts: [
						{
							id: "leg-1",
							ruleId: "rule-1",
							releaseType: "all_signed",
							recipientLabel: "Other",
							recipientAddress: "0x0000000000000000000000000000000000000002",
							amount: "1000000",
						},
					],
				}),
				signatureFields: selfFields,
				selfProfile,
			}),
		).toBeNull();
	});

	test("returns plan for parallel routing without payouts", () => {
		expect(
			resolveSelfSignAfterSendPlan({
				createForm: baseForm({
					registerRouting: { routingMode: 0, routingOrderEmails: [] },
				}),
				signatureFields: selfFields,
				selfProfile,
			}),
		).toEqual({
			selfEmail: "me@example.com",
			selfFieldIds: ["field-1"],
		});
	});
});
