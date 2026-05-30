import { describe, expect, it } from "bun:test";
import type { PlacementManifest } from "../placement-manifest";
import {
	buildRegisterRoutingCalldata,
	usesAdvancedRegisterRouting,
	validateRegisterRoutingCalldata,
} from "../register-routing";
import {
	commitsForEmails,
	hashNormalizedSignerEmail,
	sortedCommitsForEmails,
} from "../signer-email-commitment";

const manifest: PlacementManifest = {
	version: 2,
	fields: [
		{
			id: "f1",
			pageIndex: 0,
			rect: { x: 0, y: 0, width: 0.1, height: 0.1 },
			assignedRecipientEmail: "a@example.com",
			required: true,
			type: "signature",
		},
		{
			id: "f2",
			pageIndex: 0,
			rect: { x: 0.1, y: 0, width: 0.1, height: 0.1 },
			assignedRecipientEmail: "b@example.com",
			required: true,
			type: "signature",
		},
	],
};

describe("register routing helpers", () => {
	it("defaults to parallel all-required routing", () => {
		const calldata = buildRegisterRoutingCalldata({
			placementManifest: manifest,
		});
		expect(calldata.routingMode).toBe(0);
		expect(calldata.requiredCommitments).toHaveLength(2);
		expect(calldata.optionalCommitments).toHaveLength(0);
		expect(validateRegisterRoutingCalldata(calldata)).toBeNull();
		expect(usesAdvancedRegisterRouting(undefined)).toBe(false);
	});

	it("marks optional signers as advanced routing", () => {
		expect(
			usesAdvancedRegisterRouting({
				optionalSignerEmails: ["b@example.com"],
			}),
		).toBe(true);
		const calldata = buildRegisterRoutingCalldata({
			placementManifest: manifest,
			routing: { optionalSignerEmails: ["b@example.com"] },
		});
		expect(calldata.requiredCommitments).toHaveLength(1);
		expect(calldata.optionalCommitments).toHaveLength(1);
	});

	it("preserves sequential routingOrder email sequence", () => {
		// hash(b@) < hash(a@) lexicographically — sorted order would be [b, a].
		const routingOrderEmails = ["a@example.com", "b@example.com"];
		const calldata = buildRegisterRoutingCalldata({
			placementManifest: manifest,
			routing: {
				routingMode: 1,
				routingOrderEmails,
			},
		});
		const ordered = commitsForEmails(routingOrderEmails);
		expect(calldata.routingOrder).toEqual(ordered);
		expect(calldata.routingOrder[0]).toEqual(
			hashNormalizedSignerEmail("a@example.com"),
		);
		expect(calldata.routingOrder).not.toEqual(
			sortedCommitsForEmails(routingOrderEmails),
		);
	});
});
