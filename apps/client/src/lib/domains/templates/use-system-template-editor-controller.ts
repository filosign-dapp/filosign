import { useCallback, useState } from "react";
import {
	systemTemplateEmptyDraftRedirectTarget,
	templateDocumentLoadingMessage,
	templateSuppressEmptyDraftRedirect,
} from "@/src/lib/domains/placement/lifecycle";
import type {
	PlacementController,
	SendProgressState,
} from "@/src/lib/domains/placement/types";
import { usePlacementControllerCore } from "@/src/lib/domains/placement/use-placement-controller-core";
import { useSystemTemplateEditorHydrate } from "@/src/lib/domains/templates/use-system-template-editor-hydrate";
import { useStorePersist } from "@/src/lib/filosign/use-store";

export function useSystemTemplateEditorController(args: {
	mode: "system-create" | "system-edit";
	systemTemplateId: string;
}) {
	const { systemTemplateEditorLoadState } = useSystemTemplateEditorHydrate({
		mode: args.mode === "system-edit" ? "system-edit" : undefined,
		systemTemplateId:
			args.mode === "system-edit" ? args.systemTemplateId : undefined,
	});
	const draftReady = Boolean(
		useStorePersist((s) => s.createForm)?.documents?.length,
	);

	const [sendStatus] = useState<
		"idle" | "loading" | "signing" | "success" | "error"
	>("idle");
	const [postSendDialogOpen] = useState(false);
	const [postSendShare] = useState(null);
	const [postSendWarmSummary] = useState(null);
	const [sendProgressOpen] = useState(false);
	const [sendProgressState] = useState<SendProgressState | null>(null);

	const suppressEmptyDraftRedirect = templateSuppressEmptyDraftRedirect({
		templateEditorLoadState: systemTemplateEditorLoadState,
		draftReady,
	});

	const core = usePlacementControllerCore({
		preview: { draftSyncMode: "local", serverDraftLoadState: "idle" },
		lifecycle: {
			redirectTo: systemTemplateEmptyDraftRedirectTarget(),
			suppressEmptyDraftRedirect,
			documentLoadingMessage: templateDocumentLoadingMessage(
				systemTemplateEditorLoadState,
				args.mode,
			),
		},
		interactionMode: "edit",
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

export type SystemTemplateEditorController = PlacementController;
