import {
	type CaptureAppEvent,
	CLIENT_ANALYTICS_EVENTS,
} from "@filosign/react/analytics";
import type { SendFileResult, SignFileArgs } from "@filosign/react/files";
import type { UserProfile } from "@filosign/react/users";
import { toast } from "sonner";
import type {
	CreateForm,
	SignatureField,
} from "@/src/lib/domains/files/envelope-form-types";
import { buildColdInviteMagicLink } from "@/src/lib/domains/invites/cold-invite-search";
import type {
	ColdSharePackage,
	WarmShareSummary,
} from "@/src/lib/domains/invites/types";
import { suppressGlobalErrorToast } from "@/src/lib/errors";
import {
	resolveSelfSignerOnRoster,
	selfAssignedFieldIds,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placement-assignees";
import { isColdRecipient } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send-envelope";

export async function selfSignAfterSend(args: {
	createForm: CreateForm;
	signatureFields: SignatureField[];
	selfProfile: UserProfile | undefined;
	result: SendFileResult;
	signFile: {
		mutateAsync: (
			input: SignFileArgs,
			options?: ReturnType<typeof suppressGlobalErrorToast>,
		) => Promise<boolean>;
	};
	setSendStatus: (
		status: "idle" | "loading" | "signing" | "success" | "error",
	) => void;
}): Promise<void> {
	const selfOnRoster = resolveSelfSignerOnRoster(
		args.createForm.recipients ?? [],
		args.selfProfile,
	);
	const selfFieldIds =
		args.result.success && args.result.pieceCid && selfOnRoster
			? selfAssignedFieldIds(args.signatureFields, selfOnRoster.email)
			: [];

	if (selfFieldIds.length === 0 || !args.result.pieceCid) return;

	args.setSendStatus("signing");
	try {
		await args.signFile.mutateAsync(
			{
				pieceCid: args.result.pieceCid,
				completedFieldIds: selfFieldIds,
			},
			suppressGlobalErrorToast(),
		);
	} catch (signErr) {
		console.error("Self-sign at send failed:", signErr);
		toast.error(
			"Document sent, but signing your fields failed. Open the document from your dashboard to finish signing.",
		);
	}
}

export function buildPostSendWarmSummary(
	result: SendFileResult,
	createForm: CreateForm,
): WarmShareSummary | null {
	if (!result.success || !result.pieceCid) return null;

	const warmRecipients = (createForm.recipients ?? [])
		.filter((recipient) => !isColdRecipient(recipient))
		.map((recipient) => ({
			email: recipient.email.trim(),
			name: recipient.name?.trim() || undefined,
			role: recipient.role,
		}));

	if (warmRecipients.length === 0) return null;

	const envelopeName =
		createForm.documents[0]?.name?.trim() ||
		createForm.emailSubject?.trim() ||
		"Envelope";

	return {
		envelopeName,
		pieceCid: result.pieceCid,
		documentCount: createForm.documents.length,
		recipients: warmRecipients,
	};
}

export function buildPostSendShare(
	result: SendFileResult,
): ColdSharePackage | null {
	if (!("coldInviteShareCode" in result) || !result.coldInviteShareCode) {
		return null;
	}

	if (!result.pieceCid) return null;

	return {
		emails: result.coldInviteShareCode.emails,
		phrase: result.coldInviteShareCode.phrase,
		magicLink: buildColdInviteMagicLink(window.location.origin, {
			pieceCid: result.pieceCid,
			inviteToken: result.coldInviteShareCode.inviteToken,
			email: result.coldInviteShareCode.emails[0],
		}),
	};
}

export function trackEnvelopeSendSucceeded(args: {
	captureAppEvent: CaptureAppEvent;
	coldRecipientCount: number;
	result: SendFileResult;
}): void {
	args.captureAppEvent(CLIENT_ANALYTICS_EVENTS.envelopeSendSucceeded, {
		had_cold_recipients: args.coldRecipientCount > 0,
		...(args.result.success && args.result.pieceCid
			? { piece_cid: args.result.pieceCid }
			: {}),
	});
}
