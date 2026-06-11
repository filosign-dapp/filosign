import { DocumentViewportProvider } from "@/src/lib/domains/files/document-viewport";
import { DraftDocumentsRail } from "@/src/routes/draft/review/-components/left/documents-rail";
import { DraftReviewMobileToolbar } from "@/src/routes/draft/review/-components/mobile/mobile-toolbar";
import { DraftReviewCommentsPanel } from "@/src/routes/draft/review/-components/right/comments-panel";
import { DraftContextRail } from "@/src/routes/draft/review/-components/right/context-rail";
import { DraftReviewUnlockGate } from "@/src/routes/draft/review/-components/unlock/unlock-gate";
import { DraftReviewViewer } from "@/src/routes/draft/review/-components/viewer/draft-review-viewer";
import { useDraftReviewMeta } from "@/src/routes/draft/review/-lib/context/context";

export function DraftReviewWorkspace() {
	const { isUnlocked } = useDraftReviewMeta();

	return (
		<DocumentViewportProvider>
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
				<div className="flex min-h-0 flex-1 overflow-hidden">
					{isUnlocked ? <DraftDocumentsRail /> : null}
					<div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
						{isUnlocked ? (
							<DraftReviewViewer />
						) : (
							<div className="flex h-full min-h-0 flex-1 items-center justify-center p-6">
								<DraftReviewUnlockGate />
							</div>
						)}
					</div>
					{isUnlocked ? (
						<aside className="hidden h-full min-h-0 w-72 shrink-0 flex-col overflow-hidden border-l border-border bg-muted/5 lg:flex">
							<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
								<DraftContextRail />
								<DraftReviewCommentsPanel />
							</div>
						</aside>
					) : null}
				</div>
				{isUnlocked ? <DraftReviewMobileToolbar /> : null}
			</div>
		</DocumentViewportProvider>
	);
}
