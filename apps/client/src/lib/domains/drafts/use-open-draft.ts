import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

export function useOpenDraft() {
	const navigate = useNavigate();

	const openDraft = useCallback(
		(draftId: string) => {
			void navigate({
				to: "/dashboard/envelope/create/add-sign",
				search: { serverDraftId: draftId },
			});
		},
		[navigate],
	);

	return { openDraft };
}
