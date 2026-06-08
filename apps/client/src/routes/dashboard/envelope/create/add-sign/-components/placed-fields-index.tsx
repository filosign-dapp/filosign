import { Stagger } from "@filosign/motion";
import { ArrowsOutLineHorizontalIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import { signerAccentColor } from "@/src/lib/domains/files/field-box";
import {
	SignatureFieldTypeIcon,
	signatureFieldTypeLabel,
} from "@/src/lib/domains/files/placement-field-display";
import { cn } from "@/src/lib/utils/utils";
import type { SignatureField } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";
import { groupPlacedFieldsByPage } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placed-fields";

type PlacedFieldsIndexProps = {
	fields: SignatureField[];
	selectedFieldIds: Set<string>;
	selectedField: string | null;
	currentPage: number;
	pdfNumPages: number | null;
	onSelectField: (fieldId: string) => void;
	onFocusField: (fieldId: string) => void;
	onRepeatOnAllPages?: (fieldId: string) => void;
	emptyMessage?: string;
};

function signerDisplayName(field: SignatureField): string {
	const name = field.assignedSignerName.trim();
	if (name) return name;
	return field.assignedSignerEmail.trim() || "Signer";
}

export function PlacedFieldsIndex({
	fields,
	selectedFieldIds,
	selectedField,
	currentPage,
	pdfNumPages,
	onSelectField,
	onFocusField,
	onRepeatOnAllPages,
	emptyMessage = "No fields placed for this signer yet.",
}: PlacedFieldsIndexProps) {
	if (fields.length === 0) {
		return (
			<p className="text-xs leading-relaxed text-muted-foreground">
				{emptyMessage}
			</p>
		);
	}

	const groups = groupPlacedFieldsByPage(fields);
	const canRepeat = pdfNumPages != null && pdfNumPages > 1;

	return (
		<div className="space-y-3">
			{groups.map((group) => (
				<div key={group.page} className="space-y-1">
					<p
						className={cn(
							"px-1 text-[11px] font-medium uppercase tracking-wide",
							group.page === currentPage
								? "text-primary"
								: "text-muted-foreground",
						)}
					>
						Page {group.page}
						{group.page === currentPage ? " · viewing" : ""}
					</p>
					<Stagger className="space-y-0.5" staggerDelay={0.02}>
						{group.fields.map((field) => {
							const isSelected = selectedFieldIds.has(field.id);
							const label = signatureFieldTypeLabel(field.type);
							const accent = signerAccentColor(field.assignedSignerEmail);
							const showRepeat =
								canRepeat &&
								selectedField === field.id &&
								onRepeatOnAllPages != null;

							return (
								<div key={field.id} className="space-y-0.5">
									<button
										type="button"
										className={cn(
											"group flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors",
											isSelected ? "bg-accent" : "hover:bg-muted/50",
										)}
										onClick={() => {
											onSelectField(field.id);
											onFocusField(field.id);
										}}
										aria-label={`${label}, page ${field.page}, ${signerDisplayName(field)}`}
									>
										<span
											className="size-2 shrink-0 rounded-full ring-1 ring-foreground/10"
											style={{ backgroundColor: accent }}
											aria-hidden
										/>
										<span className="shrink-0" aria-hidden="true">
											<SignatureFieldTypeIcon type={field.type} isMobile />
										</span>
										<span className="min-w-0 flex-1">
											<span
												className={cn(
													"block truncate text-sm leading-snug",
													isSelected
														? "font-medium text-foreground"
														: "text-foreground",
												)}
											>
												{label}
											</span>
											<span className="block truncate text-[11px] text-muted-foreground">
												{signerDisplayName(field)}
												{field.required ? " · Required" : ""}
											</span>
										</span>
									</button>
									{showRepeat ? (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="h-7 w-full justify-start gap-1.5 px-2 text-[11px] text-muted-foreground"
											onClick={() => onRepeatOnAllPages(field.id)}
										>
											<ArrowsOutLineHorizontalIcon
												className="size-3.5"
												aria-hidden
											/>
											Repeat on all pages
										</Button>
									) : null}
								</div>
							);
						})}
					</Stagger>
				</div>
			))}
		</div>
	);
}
