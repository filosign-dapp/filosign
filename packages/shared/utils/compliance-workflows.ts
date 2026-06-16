import z from "zod";
import type { SettlementRuleStatus } from "./settlement-rules";

const PENDING_SETTLEMENT_STATUSES = new Set<SettlementRuleStatus>([
	"pending",
	"ready",
	"partial",
]);

export type SatelliteWorkflowAttachmentInput = {
	releaseMode: "review" | "conditional";
	/** Compliance bundle / recipient packet shape. */
	unlocked?: boolean;
	/** Sender conditional packet API shape. */
	released?: boolean;
	cancelled: boolean;
};

export const zSatelliteWorkflowSummary = z.object({
	hasSatellites: z.boolean(),
	hasPending: z.boolean(),
	allTerminal: z.boolean(),
	pendingPayoutCount: z.number().int().nonnegative(),
	pendingAttachmentCount: z.number().int().nonnegative(),
});

export type SatelliteWorkflowSummary = z.infer<
	typeof zSatelliteWorkflowSummary
>;

export const EMPTY_SATELLITE_WORKFLOW_SUMMARY: SatelliteWorkflowSummary = {
	hasSatellites: false,
	hasPending: false,
	allTerminal: true,
	pendingPayoutCount: 0,
	pendingAttachmentCount: 0,
};

export function mapConditionalPacketsForWorkflowSummary(
	packets: readonly { released: boolean; cancelled: boolean }[],
): SatelliteWorkflowAttachmentInput[] {
	return packets.map((packet) => ({
		releaseMode: "conditional" as const,
		released: packet.released,
		cancelled: packet.cancelled,
	}));
}

function isSettlementWorkflowPending(status: SettlementRuleStatus): boolean {
	return PENDING_SETTLEMENT_STATUSES.has(status);
}

function isAttachmentWorkflowPending(
	attachment: SatelliteWorkflowAttachmentInput,
): boolean {
	if (attachment.releaseMode === "review") {
		return false;
	}
	const unlocked = attachment.unlocked ?? attachment.released ?? false;
	return !unlocked && !attachment.cancelled;
}

export function summarizeSatelliteWorkflows(args: {
	settlements: readonly { status: SettlementRuleStatus }[];
	attachments: readonly SatelliteWorkflowAttachmentInput[];
}): SatelliteWorkflowSummary {
	const pendingPayoutCount = args.settlements.filter((row) =>
		isSettlementWorkflowPending(row.status),
	).length;
	const pendingAttachmentCount = args.attachments.filter((row) =>
		isAttachmentWorkflowPending(row),
	).length;
	const hasConditionalAttachments = args.attachments.some(
		(row) => row.releaseMode === "conditional",
	);
	const hasSatellites =
		args.settlements.length > 0 || hasConditionalAttachments;
	const hasPending = pendingPayoutCount > 0 || pendingAttachmentCount > 0;

	return {
		hasSatellites,
		hasPending,
		allTerminal: hasSatellites ? !hasPending : true,
		pendingPayoutCount,
		pendingAttachmentCount,
	};
}

export function satelliteWorkflowStatusFromSummary(
	summary: SatelliteWorkflowSummary,
): "none" | "pending" | "terminal" {
	if (!summary.hasSatellites) {
		return "none";
	}
	return summary.hasPending ? "pending" : "terminal";
}

export const COMPLIANCE_EXPORT_PENDING_SATELLITES_LEAD =
	"This export was generated before all attached payouts or files reached a final state. Re-download later for updated payout transaction hashes and release status.";
