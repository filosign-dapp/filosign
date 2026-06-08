import { Stagger } from "@filosign/motion";
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
	currentPage: number;
	onFocusField: (fieldId: string) => void;
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
	currentPage,
	onFocusField,
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

							return (
								<button
									key={field.id}
									type="button"
									className={cn(
										"group flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors",
										isSelected ? "bg-accent" : "hover:bg-muted/50",
									)}
									onClick={() => onFocusField(field.id)}
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
							);
						})}
					</Stagger>
				</div>
			))}
		</div>
	);
}
