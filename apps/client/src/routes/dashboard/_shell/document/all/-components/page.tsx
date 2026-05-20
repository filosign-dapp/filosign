import { DocumentsContent } from "./documents-content";
import { DocumentsHeader } from "./documents-header";

export function DocumentsAllPage() {
	return (
		<div className="flex min-h-0 flex-1 flex-col bg-background @container">
			<div className="flex min-h-0 flex-1 flex-col">
				<DocumentsHeader />
				<DocumentsContent />
			</div>
		</div>
	);
}
