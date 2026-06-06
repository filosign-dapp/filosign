import { FilePdfIcon } from "@phosphor-icons/react";
import { isPdfDocument } from "@/src/lib/domains/files/document-kind";
import { cn } from "@/src/lib/utils/utils";
import type { Document } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";

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
		<aside className="z-20 hidden h-full w-48 shrink-0 border-l border-border bg-background p-4 lg:block">
			<div className="space-y-4">
				<p className="font-medium text-muted-foreground">Documents</p>
				<div className="space-y-2">
					{documents.map((doc) => (
						<div
							key={doc.id}
							className={cn(
								"relative aspect-3/4 cursor-pointer rounded border-2 bg-muted transition-colors",
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
									<div className="absolute inset-0 flex items-center justify-center bg-muted/30">
										<FilePdfIcon
											className="size-10 text-destructive/80"
											weight="duotone"
										/>
									</div>
								) : (
									<img
										src={doc.url}
										alt={doc.name}
										className="absolute inset-0 h-full w-full rounded object-cover"
									/>
								)
							) : (
								<div className="absolute inset-0 flex items-center justify-center">
									<div className="text-xs text-muted-foreground">
										No preview
									</div>
								</div>
							)}

							<div className="absolute inset-x-0 bottom-0 rounded-b bg-black/70 p-2 text-white">
								<div className="truncate text-xs" title={doc.name}>
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
