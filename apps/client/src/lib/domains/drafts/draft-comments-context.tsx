import { useDraftCommentsDecrypted } from "@filosign/react/drafts";
import { createContext, type ReactNode, useContext } from "react";
import { useStorePersist } from "@/src/lib/filosign/use-store";

type DraftCommentsQuery = ReturnType<typeof useDraftCommentsDecrypted>;

type DraftCommentsContextValue = DraftCommentsQuery & {
	draftId: string;
};

const DraftCommentsContext = createContext<DraftCommentsContextValue | null>(
	null,
);

export function DraftCommentsProvider(props: {
	draftId: string;
	children: ReactNode;
}) {
	const workspaceOrgId = useStorePersist((s) => s.activeOrgId);
	const comments = useDraftCommentsDecrypted({
		draftId: props.draftId,
		workspaceOrgId,
	});

	return (
		<DraftCommentsContext.Provider
			value={{ ...comments, draftId: props.draftId }}
		>
			{props.children}
		</DraftCommentsContext.Provider>
	);
}

export function useDraftCommentsContext() {
	const ctx = useContext(DraftCommentsContext);
	if (!ctx) {
		throw new Error(
			"useDraftCommentsContext must be used within DraftCommentsProvider",
		);
	}
	return ctx;
}
