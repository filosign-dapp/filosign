import { describe, expect, test } from "bun:test";
import {
	satelliteWorkflowStatusFromSummary,
	summarizeSatelliteWorkflows,
} from "../utils/compliance-workflows";

describe("summarizeSatelliteWorkflows", () => {
	test("no satellites → allTerminal", () => {
		const summary = summarizeSatelliteWorkflows({
			settlements: [],
			attachments: [],
		});
		expect(summary).toEqual({
			hasSatellites: false,
			hasPending: false,
			allTerminal: true,
			pendingPayoutCount: 0,
			pendingAttachmentCount: 0,
		});
		expect(satelliteWorkflowStatusFromSummary(summary)).toBe("none");
	});

	test("pending payout blocks terminal", () => {
		const summary = summarizeSatelliteWorkflows({
			settlements: [{ status: "ready" }],
			attachments: [],
		});
		expect(summary.hasPending).toBe(true);
		expect(summary.allTerminal).toBe(false);
		expect(summary.pendingPayoutCount).toBe(1);
		expect(satelliteWorkflowStatusFromSummary(summary)).toBe("pending");
	});

	test("executed payout is terminal", () => {
		const summary = summarizeSatelliteWorkflows({
			settlements: [{ status: "executed" }],
			attachments: [],
		});
		expect(summary.hasPending).toBe(false);
		expect(summary.allTerminal).toBe(true);
		expect(satelliteWorkflowStatusFromSummary(summary)).toBe("terminal");
	});

	test("locked conditional attachment is pending", () => {
		const summary = summarizeSatelliteWorkflows({
			settlements: [],
			attachments: [
				{
					releaseMode: "conditional",
					unlocked: false,
					cancelled: false,
				},
			],
		});
		expect(summary.pendingAttachmentCount).toBe(1);
		expect(summary.hasPending).toBe(true);
	});

	test("review-mode attachment is not pending", () => {
		const summary = summarizeSatelliteWorkflows({
			settlements: [],
			attachments: [
				{
					releaseMode: "review",
					unlocked: false,
					cancelled: false,
				},
			],
		});
		expect(summary.hasSatellites).toBe(false);
		expect(summary.hasPending).toBe(false);
	});

	test("released conditional attachment is terminal", () => {
		const summary = summarizeSatelliteWorkflows({
			settlements: [],
			attachments: [
				{
					releaseMode: "conditional",
					released: true,
					cancelled: false,
				},
			],
		});
		expect(summary.pendingAttachmentCount).toBe(0);
		expect(summary.allTerminal).toBe(true);
	});
});
