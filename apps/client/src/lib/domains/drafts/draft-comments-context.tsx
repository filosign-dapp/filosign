import { useEntitlements } from "@filosign/react/billing";
import {
	useDraftCommentsDecrypted,
	useDraftCommentsList,
} from "@filosign/react/drafts";
import { createContext, type ReactNode, useContext } from "react";
import { useStorePersist } from "@/src/lib/filosign/use-store";

/** Encrypted comment count for badges - avoids decrypting every comment. */
export function useDraftCommentCount(draftId: string | undefined) {
	const { data: entitlements } = useEntitlements();
	const showComments = Boolean(
		entitlements?.features["features.draft_comments"]?.enabled,
	);

	const list = useDraftCommentsList(draftId, {
		enabled: Boolean(showComments),
	});
	return list.data?.comments.length ?? 0;
}

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
