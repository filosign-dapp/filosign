import { filterPostRegisterSatelliteSteps } from "./incomplete-steps";
import type { SendFileProgressReporter } from "./progress";
import {
	registerConditionalAttachments,
	registerSettlementRulesForFile,
} from "./register-post-send";
import type {
	PostSendRetryPayload,
	SendFileDeps,
	SendFileIncompleteStep,
} from "./types";

export async function retryPostSendSatellites(args: {
	deps: SendFileDeps;
	pieceCid: string;
	incompleteSteps: SendFileIncompleteStep[];
	payload: PostSendRetryPayload;
	onProgress?: SendFileProgressReporter;
}): Promise<{ incompleteSteps: SendFileIncompleteStep[] }> {
	const satelliteSteps = filterPostRegisterSatelliteSteps(args.incompleteSteps);
	const remaining: SendFileIncompleteStep[] = [];

	if (satelliteSteps.includes("attachment_rule")) {
		try {
			await registerConditionalAttachments({
				deps: args.deps,
				pieceCid: args.pieceCid,
				attachmentPacketDrafts: args.payload.attachmentPacketDrafts,
				attachmentPackets: args.payload.attachmentPackets,
				onProgress: args.onProgress,
			});
		} catch (error) {
			remaining.push("attachment_rule");
			console.error("Attachment rule retry failed:", error);
		}
	}

	if (satelliteSteps.includes("payout_registration")) {
		try {
			await registerSettlementRulesForFile({
				deps: args.deps,
				pieceCid: args.pieceCid,
				cidIdentifier: args.payload.cidIdentifier,
				settlementRules: args.payload.settlementRules,
				settlementPayerAddress: args.payload.settlementPayerAddress,
				payoutPayerSource: args.payload.payoutPayerSource,
				organizationId: args.payload.organizationId,
				onProgress: args.onProgress,
				registerSettlementRules: args.payload.registerSettlementRules,
			});
		} catch (error) {
			remaining.push("payout_registration");
			console.error("Payout registration retry failed:", error);
		}
	}

	return { incompleteSteps: remaining };
}
