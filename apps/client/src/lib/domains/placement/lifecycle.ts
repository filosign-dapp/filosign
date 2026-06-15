import type { ServerDraftLoadState } from "@/src/lib/domains/drafts";

export type TemplateEditorLoadState =
	| "idle"
	| "loading"
	| "awaiting_crypto"
	| "error";

export type SendStatus = "idle" | "loading" | "signing" | "success" | "error";

export function envelopeSuppressEmptyDraftRedirect(args: {
	sendStatus: SendStatus;
	sendProgressOpen: boolean;
	postSendDialogOpen: boolean;
	serverDraftLoadState: ServerDraftLoadState;
	pendingServerDraftId?: string;
	draftReady: boolean;
}): boolean {
	return (
		args.sendStatus === "loading" ||
		args.sendStatus === "signing" ||
		args.sendStatus === "success" ||
		args.sendProgressOpen ||
		args.postSendDialogOpen ||
		args.serverDraftLoadState === "loading" ||
		args.serverDraftLoadState === "awaiting_crypto" ||
		Boolean(args.pendingServerDraftId && !args.draftReady)
	);
}

export function templateSuppressEmptyDraftRedirect(args: {
	templateEditorLoadState: TemplateEditorLoadState;
	draftReady: boolean;
}): boolean {
	return (
		args.templateEditorLoadState === "loading" ||
		args.templateEditorLoadState === "awaiting_crypto" ||
		!args.draftReady
	);
}

export function envelopeEmptyDraftRedirectTarget(): string {
	return "/dashboard/envelope/create";
}

export function templateEmptyDraftRedirectTarget(): string {
	return "/dashboard/templates";
}

export function envelopeDocumentLoadingMessage(
	serverDraftLoadState: ServerDraftLoadState,
): string | null {
	if (serverDraftLoadState === "loading") {
		return "Loading draft…";
	}
	if (serverDraftLoadState === "awaiting_crypto") {
		return "Unlocking encryption keys…";
	}
	return null;
}

export function templateDocumentLoadingMessage(
	templateEditorLoadState: TemplateEditorLoadState,
): string | null {
	if (templateEditorLoadState === "loading") {
		return "Loading template...";
	}
	if (templateEditorLoadState === "awaiting_crypto") {
		return "Unlock encryption keys to edit this template.";
	}
	return null;
}
