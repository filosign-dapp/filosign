import { FilePdfIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils/utils";

export type DocumentListRailItem = {
	id: string;
	name: string;
	fieldCount?: number;
	meta?: string;
};

type DocumentListRailProps = {
	documents: DocumentListRailItem[];
	currentDocumentId: string;
	onDocumentSelect: (documentId: string) => void;
	renderFooter?: () => ReactNode;
	className?: string;
	borderSide?: "left" | "right";
};

export function DocumentListRail({
	documents,
	currentDocumentId,
	onDocumentSelect,
	renderFooter,
	className,
	borderSide = "left",
}: DocumentListRailProps) {
	return (
		<aside
			className={cn(
				"z-20 hidden h-full w-52 shrink-0 flex-col bg-background lg:flex",
				borderSide === "left"
					? "border-r border-border"
					: "border-l border-border",
				className,
			)}
		>
			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
				<section>
					<p className="mb-3 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Documents
					</p>
					<ul className="space-y-1">
						{documents.map((doc) => {
							const isActive = currentDocumentId === doc.id;
							const fieldLabel =
								doc.meta ??
								(doc.fieldCount != null
									? `${doc.fieldCount} field${doc.fieldCount === 1 ? "" : "s"}`
									: undefined);
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
											{fieldLabel ? (
												<span className="block text-[11px] text-muted-foreground">
													{fieldLabel}
												</span>
											) : null}
										</span>
									</button>
								</li>
							);
						})}
					</ul>
				</section>
				{renderFooter?.()}
			</div>
		</aside>
	);
}
