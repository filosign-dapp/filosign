export type SendFileProgressPhase =
	| "encrypting"
	| "uploading"
	| "wallet_sign_register"
	| "registering_envelope"
	| "register_failed"
	| "processing_attachments"
	| "wallet_attachment_rule"
	| "wallet_payout_approve"
	| "wallet_payout_register"
	| "treasury_safe_propose"
	| "treasury_safe_pending"
	| "treasury_safe_executed"
	| "confirming_transaction"
	| "indexing_payout";

export type SendFileProgressStatus =
	| "start"
	| "wallet_prompt"
	| "confirming"
	| "done"
	| "error";

export type SendFileProgressEvent = {
	phase: SendFileProgressPhase;
	status: SendFileProgressStatus;
	detail?: string;
	ruleIndex?: number;
	txLabel?: string;
};

export type SendFileProgressReporter = (event: SendFileProgressEvent) => void;

export function emitSendFileProgress(
	onProgress: SendFileProgressReporter | undefined,
	event: SendFileProgressEvent,
): void {
	onProgress?.(event);
}
