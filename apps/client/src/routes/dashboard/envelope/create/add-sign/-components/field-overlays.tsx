import { XIcon } from "@phosphor-icons/react";
import { cn } from "@/src/lib/utils/utils";
import type { SignatureField } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";
import {
	fieldSignerAriaSnippet,
	SignatureFieldTypeIcon,
	signatureFieldTypeLabel,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/field-display";

type SignatureFieldOverlaysProps = {
	signatureFields: SignatureField[];
	selectedField: string | null;
	documentWidth: number;
	documentHeight: number;
	fieldWidth: number;
	fieldHeight: number;
	margin: number;
	isMobile: boolean;
	onFieldClick: (fieldId: string, event: React.MouseEvent) => void;
	onFieldMouseDown: (fieldId: string, event: React.MouseEvent) => void;
	onFieldRemove: (fieldId: string) => void;
};

export function SignatureFieldOverlays({
	signatureFields,
	selectedField,
	documentWidth,
	documentHeight,
	fieldWidth,
	fieldHeight,
	margin,
	isMobile,
	onFieldClick,
	onFieldMouseDown,
	onFieldRemove,
}: SignatureFieldOverlaysProps) {
	return (
		<>
			{signatureFields.map((field) => {
				const constrainedX = Math.max(
					margin,
					Math.min(field.x, documentWidth - fieldWidth - margin),
				);
				const constrainedY = Math.max(
					margin,
					Math.min(field.y, documentHeight - fieldHeight - margin),
				);

				return (
					<div
						key={field.id}
						className={cn(
							"absolute flex min-w-0 flex-col gap-1 rounded-md border-2 border-dashed bg-primary/10 p-1.5 hover:bg-primary/10 cursor-move select-none group z-30",
							isMobile ? "max-w-40" : "max-w-48",
							selectedField === field.id
								? "border-primary bg-primary/10 shadow-lg "
								: "border-primary/50 hover:border-primary/70 hover:bg-primary/80",
						)}
						style={{
							left: constrainedX,
							top: constrainedY,
						}}
						onClick={(e) => onFieldClick(field.id, e)}
						onMouseDown={(e) => onFieldMouseDown(field.id, e)}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								onFieldClick(field.id, e as unknown as React.MouseEvent);
							}
						}}
						role="button"
						tabIndex={0}
						aria-label={`${signatureFieldTypeLabel(field.type)} field for ${fieldSignerAriaSnippet(field)}, press Enter to select`}
					>
						<div
							className={cn(
								"flex items-center gap-1.5",
								isMobile ? "gap-1" : "gap-2",
							)}
						>
							<span className="shrink-0 text-primary">
								<SignatureFieldTypeIcon type={field.type} isMobile={isMobile} />
							</span>
							<span
								className={cn(
									"min-w-0 flex-1 truncate font-medium text-primary",
									isMobile ? "text-[10px]" : "text-xs",
								)}
							>
								{signatureFieldTypeLabel(field.type)}
							</span>
							<button
								type="button"
								className={cn("shrink-0 p-0", isMobile ? "w-3 h-3" : "w-4 h-4")}
								onClick={(e) => {
									e.stopPropagation();
									onFieldRemove(field.id);
								}}
							>
								<XIcon className={cn(isMobile ? "w-2.5 h-2.5" : "w-3 h-3")} />
							</button>
						</div>
						<div className="flex items-start justify-between gap-1 border-t border-primary/20 pt-1">
							<div className="min-w-0 flex-1 flex flex-col gap-0.5 text-left">
								<span
									className={cn(
										"truncate font-medium text-foreground",
										isMobile ? "text-[10px]" : "text-xs",
									)}
								>
									{field.assignedSignerName.trim() || "Signer"}
								</span>
								{field.assignedSignerEmail.trim() ? (
									<span
										className={cn(
											"truncate text-muted-foreground",
											isMobile ? "text-[9px]" : "text-[10px]",
										)}
									>
										{field.assignedSignerEmail.trim()}
									</span>
								) : null}
							</div>
							<span
								className={cn(
									"shrink-0 rounded px-1 font-semibold uppercase tracking-tight",
									field.required
										? "bg-amber-500/25 text-amber-950"
										: "bg-muted text-muted-foreground",
									isMobile ? "text-[8px]" : "text-[9px]",
								)}
							>
								{field.required ? "Req" : "Opt"}
							</span>
						</div>
					</div>
				);
			})}
		</>
	);
}
