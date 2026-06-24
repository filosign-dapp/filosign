import type { SendFileIncompleteStep } from "@filosign/react/files";
import {
	filterPostRegisterSatelliteSteps,
	mergeSendFileIncompleteSteps,
} from "@filosign/react/files";
import type { SelfSignAfterSendResult } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/complete";
import type { SendProgressEvent } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/progress";
import type { SendSession } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send/session";

export async function retryIncompleteSendSteps(args: {
	session: SendSession;
	retrySatellites: (input: {
		pieceCid: string;
		incompleteSteps: SendFileIncompleteStep[];
		payload: SendSession["postSendPayload"];
		onProgress?: (event: SendProgressEvent) => void;
	}) => Promise<{ incompleteSteps: SendFileIncompleteStep[] }>;
	retrySelfSign?: () => Promise<SelfSignAfterSendResult>;
	onProgress?: (event: SendProgressEvent) => void;
}): Promise<SendFileIncompleteStep[]> {
	const satelliteSteps = filterPostRegisterSatelliteSteps(
		args.session.incompleteSteps,
	);
	let remaining = [...args.session.incompleteSteps];

	if (satelliteSteps.length > 0) {
		const retryResult = await args.retrySatellites({
			pieceCid: args.session.pieceCid,
			incompleteSteps: satelliteSteps,
			payload: args.session.postSendPayload,
			onProgress: args.onProgress,
		});
		remaining = mergeSendFileIncompleteSteps(
			retryResult.incompleteSteps,
			remaining.includes("self_sign") ? ["self_sign"] : [],
		);
	}

	if (remaining.includes("self_sign") && args.retrySelfSign) {
		const selfSignResult = await args.retrySelfSign();
		if (selfSignResult.attempted && selfSignResult.ok) {
			remaining = remaining.filter((step) => step !== "self_sign");
		}
	}

	return remaining;
}
