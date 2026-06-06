import { ActivationRouteHints } from "@/src/lib/domains/activation/route-hints";
import {
	useSignFile,
	useSignRefs,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";
import { SignDocumentFileContent } from "./file-content";

export function SignDocumentBody() {
	const { containerRef, documentRef } = useSignRefs();
	const { pieceCid } = useSignFile();

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<div className="shrink-0 px-4 pt-3">
				<ActivationRouteHints currentPieceCid={pieceCid} />
			</div>
			<div ref={containerRef} className="min-h-0 flex-1 overflow-auto">
				<div ref={documentRef} className="relative h-full w-full bg-background">
					<SignDocumentFileContent />
				</div>
			</div>
		</div>
	);
}
