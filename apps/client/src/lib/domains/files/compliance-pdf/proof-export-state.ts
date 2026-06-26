import type { SettlementRuleRow } from "@filosign/react/files";
import type { SatelliteWorkflowSummary } from "@filosign/shared";
import {
	mapConditionalPacketsForWorkflowSummary,
	summarizeSatelliteWorkflows,
} from "@filosign/shared";

export function resolveSatelliteWorkflowSummary(args: {
	settlementRules: readonly Pick<SettlementRuleRow, "status">[];
	conditionalAttachmentPackets?: readonly {
		released: boolean;
		cancelled: boolean;
	}[];
	serverSummary?: SatelliteWorkflowSummary | null;
}): SatelliteWorkflowSummary {
	const attachments = mapConditionalPacketsForWorkflowSummary(
		args.conditionalAttachmentPackets ?? [],
	);
	const live = summarizeSatelliteWorkflows({
		settlements: args.settlementRules,
		attachments,
	});

	if (attachments.length > 0) {
		return live;
	}

	if (!args.serverSummary) {
		return live;
	}

	const pendingPayoutCount = live.pendingPayoutCount;
	const pendingAttachmentCount = args.serverSummary.pendingAttachmentCount;
	const hasPending = pendingPayoutCount > 0 || pendingAttachmentCount > 0;

	return {
		hasSatellites: args.serverSummary.hasSatellites,
		hasPending,
		allTerminal: !hasPending,
		pendingPayoutCount,
		pendingAttachmentCount,
	};
}

export function resolveProofExportState(summary: SatelliteWorkflowSummary): {
	proofExportPreferred: boolean;
} {
	return {
		proofExportPreferred: summary.allTerminal,
	};
}
