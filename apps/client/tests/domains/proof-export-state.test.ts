import { describe, expect, test } from "bun:test";
import { resolveSatelliteWorkflowSummary } from "@/src/lib/domains/files/compliance-pdf/proof-export-state";

describe("resolveSatelliteWorkflowSummary", () => {
	test("uses live settlement state for recipients without conditional packet list", () => {
		const summary = resolveSatelliteWorkflowSummary({
			settlementRules: [{ status: "ready" }],
			serverSummary: {
				hasSatellites: true,
				hasPending: false,
				allTerminal: true,
				pendingPayoutCount: 0,
				pendingAttachmentCount: 0,
			},
		});
		expect(summary.pendingPayoutCount).toBe(1);
		expect(summary.allTerminal).toBe(false);
	});
});
