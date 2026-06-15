import { useCryptoUnlocked } from "@filosign/react/auth";
import { useCallback, useState } from "react";
import type {
	ColdSharePackage,
	WarmShareSummary,
} from "@/src/lib/domains/invites/types";
import {
	templateDocumentLoadingMessage,
	templateEmptyDraftRedirectTarget,
	templateSuppressEmptyDraftRedirect,
} from "@/src/lib/domains/placement/lifecycle";
import type {
	PlacementController,
	SendProgressState,
} from "@/src/lib/domains/placement/types";
import { usePlacementControllerCore } from "@/src/lib/domains/placement/use-placement-controller-core";
import { useTemplateEditorHydrate } from "@/src/lib/domains/templates/use-template-editor-hydrate";
import { useStorePersist } from "@/src/lib/filosign/use-store";

export type TemplateEditorControllerArgs = {
	mode: "create" | "edit";
	templateId: string;
};

export function useTemplateEditorController(
	args: TemplateEditorControllerArgs,
): PlacementController {
	const cryptoUnlocked = useCryptoUnlocked();
	const { templateEditorLoadState } = useTemplateEditorHydrate({
		templateMode: args.mode === "edit" ? "edit" : undefined,
		templateId: args.mode === "edit" ? args.templateId : undefined,
		cryptoReady: cryptoUnlocked.data === true,
	});
	const draftReady = Boolean(
		useStorePersist((s) => s.createForm)?.documents?.length,
	);

	const [sendStatus] = useState<
		"idle" | "loading" | "signing" | "success" | "error"
	>("idle");
	const [postSendDialogOpen] = useState(false);
	const [postSendShare] = useState<ColdSharePackage | null>(null);
	const [postSendWarmSummary] = useState<WarmShareSummary | null>(null);
	const [sendProgressOpen] = useState(false);
	const [sendProgressState] = useState<SendProgressState | null>(null);

	const suppressEmptyDraftRedirect = templateSuppressEmptyDraftRedirect({
		templateEditorLoadState,
		draftReady,
	});

	const core = usePlacementControllerCore({
		preview: { draftSyncMode: "local", serverDraftLoadState: "idle" },
		lifecycle: {
			redirectTo: templateEmptyDraftRedirectTarget(),
			suppressEmptyDraftRedirect,
			documentLoadingMessage: templateDocumentLoadingMessage(
				templateEditorLoadState,
			),
		},
	});

	const handleSend = useCallback(async () => {}, []);
	const handlePostSendDone = useCallback(() => {}, []);
	const dismissSendProgress = useCallback(() => {}, []);

	return {
		...core,
		sendStatus,
		postSendDialogOpen,
		postSendShare,
		postSendWarmSummary,
		sendProgressOpen,
		sendProgressState,
		dismissSendProgress,
		handleSend,
		handlePostSendDone,
	};
}

export type TemplateEditorController = PlacementController;
