import {
	AsteriskIcon,
	CopyIcon,
	DotsSixVerticalIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/src/lib/components/ui/tooltip";
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";
import { PlacementChromeScaled } from "@/src/lib/domains/files/placement-chrome-scaled";
import {
	SignatureFieldTypeIcon,
	signerDisplayName,
} from "@/src/lib/domains/files/placement-field-display";
import { PlacementFieldResizeHandle } from "@/src/lib/domains/files/placement-field-resize-handle";
import { cn } from "@/src/lib/utils";

type PlacementFieldEditorChromeProps = {
	field: SignatureField;
	fieldHeightPx: number;
	accentColor: string;
	isMobile: boolean;
	isPlacingField: boolean;
	isSelected: boolean;
	isPrimarySelected: boolean;
	onDuplicate: () => void;
	onRemove: () => void;
	onToggleRequired: () => void;
	onResizePointerDown: (event: React.PointerEvent) => void;
};

export function PlacementFieldEditorChrome({
	field,
	fieldHeightPx,
	accentColor,
	isMobile,
	isPlacingField,
	isSelected,
	isPrimarySelected,
	onDuplicate,
	onRemove,
	onToggleRequired,
	onResizePointerDown,
}: PlacementFieldEditorChromeProps) {
	return (
		<div className="relative h-full w-full">
			{isSelected ? (
				<div className="placement-field-editor-selected-overlay" aria-hidden />
			) : null}
			<PlacementChromeScaled fieldHeightPx={fieldHeightPx}>
				<div
					className={cn(
						"placement-field-chrome-editor relative h-full w-full",
						isSelected && "placement-field-editor-selected",
					)}
					style={{
						borderLeftWidth: 3,
						borderLeftColor: accentColor,
					}}
				>
					{!isPlacingField ? (
						<DotsSixVerticalIcon
							className="size-3 shrink-0 opacity-60"
							weight="bold"
						/>
					) : null}
					<span className="shrink-0 text-placement-chrome-foreground">
						<SignatureFieldTypeIcon type={field.type} isMobile={isMobile} />
					</span>
					<div className="min-w-0 flex-1 leading-none">
						<div className="truncate placement-field-label">
							{signerDisplayName(field)}
						</div>
					</div>
					<Tooltip>
						<TooltipTrigger
							delay={0}
							render={
								<button
									type="button"
									className="shrink-0 rounded p-0.5 hover:bg-placement-chrome-foreground/15"
									onClick={(e) => {
										e.stopPropagation();
										onToggleRequired();
									}}
									aria-label={
										field.required
											? "Required. Click to mark optional."
											: "Optional. Click to mark required."
									}
								/>
							}
						>
							<AsteriskIcon
								className={cn(
									"size-3",
									field.required
										? "text-amber-400"
										: "text-placement-chrome-muted-foreground",
								)}
								weight="bold"
							/>
						</TooltipTrigger>
						<TooltipContent side="top">
							{field.required ? "Required" : "Optional"}
						</TooltipContent>
					</Tooltip>
					{isPrimarySelected ? (
						<div className="flex shrink-0 items-center gap-0.5">
							<Tooltip>
								<TooltipTrigger
									delay={0}
									render={
										<button
											type="button"
											className="rounded p-0.5 hover:bg-placement-chrome-foreground/15"
											onClick={(e) => {
												e.stopPropagation();
												onDuplicate();
											}}
											aria-label="Duplicate field"
										/>
									}
								>
									<CopyIcon className="size-3" />
								</TooltipTrigger>
								<TooltipContent side="top">Duplicate</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger
									delay={0}
									render={
										<button
											type="button"
											className="rounded p-0.5 hover:bg-placement-chrome-foreground/15"
											onClick={(e) => {
												e.stopPropagation();
												onRemove();
											}}
											aria-label="Delete field"
										/>
									}
								>
									<TrashIcon className="size-3" />
								</TooltipTrigger>
								<TooltipContent side="top">Delete</TooltipContent>
							</Tooltip>
						</div>
					) : null}
				</div>
			</PlacementChromeScaled>
			<PlacementFieldResizeHandle
				visible={isPrimarySelected && !isPlacingField}
				fieldSizePx={Math.min(field.width, field.height)}
				onPointerDown={onResizePointerDown}
			/>
		</div>
	);
}
