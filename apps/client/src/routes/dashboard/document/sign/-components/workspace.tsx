import { ActivationRouteHints } from "@/src/lib/domains/activation/route-hints";
import { DocumentViewportProvider } from "@/src/lib/domains/files/document-viewport";
import { SignDocumentsRail } from "@/src/routes/dashboard/document/sign/-components/left/documents-rail";
import { SignMobileToolbar } from "@/src/routes/dashboard/document/sign/-components/mobile/sign-mobile-toolbar";
import { SignContextRail } from "@/src/routes/dashboard/document/sign/-components/right/context-rail";
import { SignFieldsStickyFooter } from "@/src/routes/dashboard/document/sign/-components/right/fields-sticky-footer";
import { SignViewer } from "@/src/routes/dashboard/document/sign/-components/viewer/sign-viewer";
import { useSignFile } from "@/src/routes/dashboard/document/sign/-lib/context/context";

export function SignDocumentWorkspace() {
	const { pieceCid, file } = useSignFile();

	const needsAck =
		file?.participantAccess && !file.participantAccess.canDecrypt;
	const showRails = !needsAck;

	return (
		<DocumentViewportProvider>
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
				<div className="shrink-0 px-4 pt-2">
					<ActivationRouteHints currentPieceCid={pieceCid} />
				</div>
				<div className="flex min-h-0 flex-1 overflow-hidden">
					{showRails ? <SignDocumentsRail /> : null}
					<div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
						<SignViewer />
					</div>
					{showRails ? (
						<aside className="hidden h-full min-h-0 w-72 shrink-0 flex-col border-l border-border bg-muted/5 lg:flex">
							<SignContextRail />
							<SignFieldsStickyFooter />
						</aside>
					) : null}
				</div>
				{showRails ? <SignMobileToolbar /> : null}
			</div>
		</DocumentViewportProvider>
	);
}
