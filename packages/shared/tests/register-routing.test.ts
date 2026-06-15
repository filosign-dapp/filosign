import { describe, expect, it } from "bun:test";
import {
	buildRegisterRoutingCalldata,
	commitsForEmails,
	hashNormalizedSignerEmail,
	orderSignersByRoutingEmails,
	type PlacementManifest,
	sortedCommitsForEmails,
	usesAdvancedRegisterRouting,
	validateRegisterRoutingCalldata,
	validateRegisterRoutingForSend,
} from "..";

const manifest: PlacementManifest = {
	version: 1,
	documents: [
		{
			id: "doc1",
			name: "contract.pdf",
			sha256Plaintext: `0x${"cd".repeat(32)}`,
			pageCount: 1,
		},
	],
	fields: [
		{
			id: "f1",
			documentId: "doc1",
			pageIndex: 0,
			rect: { x: 0, y: 0, width: 0.1, height: 0.1 },
			assignedRecipientEmail: "a@example.com",
			required: true,
			type: "signature",
		},
		{
			id: "f2",
			documentId: "doc1",
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

	it("all manifest signers are required commitments", () => {
		const calldata = buildRegisterRoutingCalldata({
			placementManifest: manifest,
		});
		expect(calldata.requiredCommitments).toHaveLength(2);
		expect(calldata.optionalCommitments).toHaveLength(0);
	});

	it("defaults quorum set to full roster when quorumN is set", () => {
		const calldata = buildRegisterRoutingCalldata({
			placementManifest: manifest,
			routing: { quorumN: 2 },
		});
		expect(calldata.quorumN).toBe(2);
		expect(calldata.quorumSet).toHaveLength(2);
		expect(validateRegisterRoutingCalldata(calldata)).toBeNull();
	});

	it("preserves sequential routingOrder email sequence", () => {
		// hash(b@) < hash(a@) lexicographically - sorted order would be [b, a].
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

	it("two required signers pass routing validation without optional routing", () => {
		expect(
			validateRegisterRoutingForSend({ placementManifest: manifest }),
		).toBeNull();
		const calldata = buildRegisterRoutingCalldata({
			placementManifest: manifest,
		});
		expect(calldata.requiredCommitments).toHaveLength(2);
	});

	it("allows sequential routing and quorum together", () => {
		const calldata = buildRegisterRoutingCalldata({
			placementManifest: manifest,
			routing: {
				routingMode: 1,
				routingOrderEmails: ["a@example.com", "b@example.com"],
				quorumN: 2,
			},
		});
		expect(calldata.routingMode).toBe(1);
		expect(calldata.quorumN).toBe(2);
		expect(calldata.routingOrder).toHaveLength(2);
		expect(calldata.quorumSet).toHaveLength(2);
		expect(validateRegisterRoutingCalldata(calldata)).toBeNull();
	});
});

describe("orderSignersByRoutingEmails", () => {
	const roster = [
		{
			wallet: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
			name: "B",
			email: "b@example.com",
		},
		{
			wallet: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
			name: "A",
			email: "a@example.com",
		},
	];

	it("orders signers by routingOrderEmails when sequential", () => {
		const ordered = orderSignersByRoutingEmails(roster, {
			routingMode: 1,
			routingOrderEmails: ["a@example.com", "b@example.com"],
		});
		expect(ordered.map((s) => s.email)).toEqual([
			"a@example.com",
			"b@example.com",
		]);
		expect(ordered.map((s) => s.turnIndex)).toEqual([1, 2]);
	});

	it("falls back to wallet sort when routing is parallel", () => {
		const ordered = orderSignersByRoutingEmails(roster, {
			routingMode: 0,
		});
		expect(ordered.map((s) => s.wallet)).toEqual([
			"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
			"0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
		]);
		expect(ordered.every((s) => s.turnIndex === null)).toBe(true);
	});
});
