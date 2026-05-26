import { cn } from "@/src/lib/utils/utils";
import type { Document } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";
import { isPdfDocument } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/document-kind";

type DocumentThumbnailsSidebarProps = {
	documents: Document[];
	currentDocumentId: string;
	onDocumentSelect: (documentId: string) => void;
};

export function DocumentThumbnailsSidebar({
	documents,
	currentDocumentId,
	onDocumentSelect,
}: DocumentThumbnailsSidebarProps) {
	return (
		<aside className="hidden lg:block w-48 border-l border-border p-4 z-20 bg-background">
			<div className="space-y-4">
				<p className="font-medium text-muted-foreground">Documents</p>
				<div className="space-y-2">
					{documents.map((doc) => (
						<div
							key={doc.id}
							className={cn(
								"aspect-3/4 bg-muted rounded border-2 cursor-pointer transition-colors relative",
								currentDocumentId === doc.id
									? "border-primary bg-primary/5"
									: "border-border hover:border-muted-foreground/50",
							)}
							onClick={() => onDocumentSelect(doc.id)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									onDocumentSelect(doc.id);
								}
							}}
							role="button"
							tabIndex={0}
						>
							{doc.url || doc.pdfBytes ? (
								isPdfDocument({
									type: doc.mimeType,
									name: doc.name,
									pdfBytes: doc.pdfBytes,
								}) ? (
									<div className="absolute inset-0 flex items-center justify-center bg-red-50">
										<div className="text-xs text-destructive font-medium">
											PDF
										</div>
									</div>
								) : (
									<img
										src={doc.url}
										alt={doc.name}
										className="absolute inset-0 w-full h-full object-cover rounded"
									/>
								)
							) : (
								<div className="absolute inset-0 flex items-center justify-center">
									<div className="text-xs text-muted-foreground">
										No preview
									</div>
								</div>
							)}

							<div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 rounded-b">
								<div className="text-xs truncate" title={doc.name}>
									{doc.name}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</aside>
	);
}
