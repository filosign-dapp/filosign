import { FilePdfIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { cn } from "@/src/lib/utils/utils";
import { SupplementaryPacketsSidebar } from "@/src/routes/dashboard/envelope/create/add-sign/-components/supplementary-packets-review";
import type {
	Document,
	SignatureField,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";

type DocumentThumbnailsSidebarProps = {
	documents: Document[];
	currentDocumentId: string;
	signatureFields: SignatureField[];
	onDocumentSelect: (documentId: string) => void;
};

export function DocumentThumbnailsSidebar({
	documents,
	currentDocumentId,
	signatureFields,
	onDocumentSelect,
}: DocumentThumbnailsSidebarProps) {
	const fieldCountByDoc = useMemo(() => {
		const counts = new Map<string, number>();
		for (const field of signatureFields) {
			counts.set(field.documentId, (counts.get(field.documentId) ?? 0) + 1);
		}
		return counts;
	}, [signatureFields]);

	return (
		<aside className="z-20 hidden h-full w-52 shrink-0 flex-col border-l border-border bg-background lg:flex">
			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
				<section>
					<p className="mb-3 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Documents
					</p>
					<ul className="space-y-1">
						{documents.map((doc) => {
							const isActive = currentDocumentId === doc.id;
							const fieldCount = fieldCountByDoc.get(doc.id) ?? 0;
							return (
								<li key={doc.id}>
									<button
										type="button"
										className={cn(
											"flex w-full items-center gap-2.5 rounded-md border-l-2 px-2 py-2 text-left transition-colors",
											isActive
												? "border-l-primary bg-primary/5"
												: "border-l-transparent hover:bg-muted/40",
										)}
										onClick={() => onDocumentSelect(doc.id)}
									>
										<FilePdfIcon
											className={cn(
												"size-4 shrink-0",
												isActive ? "text-primary" : "text-destructive/70",
											)}
											weight="duotone"
											aria-hidden
										/>
										<span className="min-w-0 flex-1">
											<span
												className="block truncate text-sm font-medium text-foreground"
												title={doc.name}
											>
												{doc.name}
											</span>
											<span className="block text-[11px] text-muted-foreground">
												{fieldCount} field{fieldCount === 1 ? "" : "s"}
											</span>
										</span>
									</button>
								</li>
							);
						})}
					</ul>
				</section>

				<SupplementaryPacketsSidebar />
			</div>
		</aside>
	);
}
