import type {
	PostSendRetryPayload,
	SendFileIncompleteStep,
} from "@filosign/react/files";
import { mergeSendFileIncompleteSteps } from "@filosign/react/files";

/** In-session envelope registration; retry must never re-enter encrypt/upload/register. */
export type SendSession = {
	pieceCid: string;
	incompleteSteps: SendFileIncompleteStep[];
	postSendPayload: PostSendRetryPayload;
};

export function mergeSendSessionIncompleteSteps(
	session: SendSession,
	extra: SendFileIncompleteStep[],
): SendSession {
	return {
		...session,
		incompleteSteps: mergeSendFileIncompleteSteps(
			session.incompleteSteps,
			extra,
		),
	};
}

export function createSendSession(args: {
	pieceCid: string;
	incompleteSteps: SendFileIncompleteStep[];
	postSendPayload: PostSendRetryPayload;
}): SendSession {
	return {
		pieceCid: args.pieceCid,
		incompleteSteps: args.incompleteSteps,
		postSendPayload: args.postSendPayload,
	};
}
