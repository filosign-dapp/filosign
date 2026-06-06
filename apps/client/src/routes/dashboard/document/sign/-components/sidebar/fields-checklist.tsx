import { PresenceSwap, Stagger } from "@filosign/motion";
import type { FieldCompletionMap, PlacementField } from "@filosign/shared";
import { requiredFieldCompletionProgress } from "@filosign/shared";
import { CheckCircleIcon, CircleIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import {
	SignatureFieldTypeIcon,
	signatureFieldTypeLabel,
} from "@/src/lib/domains/files/placement-field-display";
import { cn } from "@/src/lib/utils";

export type SignSidebarFieldsChecklistProps = {
	fields: PlacementField[];
	fieldCompletions: FieldCompletionMap;
	completedFieldIds: string[];
	alreadySigned: boolean;
	canSign: boolean;
	canSubmitPlacementSign: boolean;
	isFieldComplete: (field: PlacementField) => boolean;
	onToggleField: (field: PlacementField) => void;
	onClearField: (fieldId: string) => void;
};

export function SignSidebarFieldsChecklist({
	fields,
	fieldCompletions,
	completedFieldIds,
	alreadySigned,
	canSign,
	canSubmitPlacementSign,
	isFieldComplete,
	onToggleField,
	onClearField,
}: SignSidebarFieldsChecklistProps) {
	if (fields.length === 0) return null;
	if (!canSign && !alreadySigned) return null;

	const requiredProgress = requiredFieldCompletionProgress(
		fields,
		fieldCompletions,
		completedFieldIds,
	);

	return (
		<div className="space-y-3">
			{requiredProgress.total > 0 ? (
				<div className="space-y-1.5">
					<div className="flex items-center justify-between text-[11px] text-muted-foreground">
						<span>
							{requiredProgress.completed} of {requiredProgress.total} required
							fields
						</span>
						<span className="tabular-nums">{requiredProgress.percent}%</span>
					</div>
					<div
						className="h-1.5 overflow-hidden rounded-full bg-muted"
						role="progressbar"
						aria-valuenow={requiredProgress.completed}
						aria-valuemin={0}
						aria-valuemax={requiredProgress.total}
					>
						<div
							className="h-full bg-primary transition-all duration-300"
							style={{ width: `${requiredProgress.percent}%` }}
						/>
					</div>
				</div>
			) : null}

			<Stagger className="space-y-1" staggerDelay={0.03}>
				{fields.map((field) => {
					const done = isFieldComplete(field);
					const label = signatureFieldTypeLabel(field.type);

					return (
						<div
							key={field.id}
							className={cn(
								"group flex items-center gap-2.5 rounded-md px-1 py-1.5",
								!alreadySigned && "hover:bg-muted/40",
							)}
						>
							<button
								type="button"
								disabled={alreadySigned}
								className="flex min-w-0 flex-1 items-center gap-2.5 text-left disabled:cursor-default"
								onClick={() => onToggleField(field)}
								aria-label={`${label}, page ${field.pageIndex + 1}`}
							>
								<PresenceSwap customKey={done ? "done" : "pending"}>
									{done ? (
										<CheckCircleIcon
											className="size-4 shrink-0 text-primary"
											weight="fill"
											aria-hidden
										/>
									) : (
										<CircleIcon
											className="size-4 shrink-0 text-muted-foreground/70"
											aria-hidden
										/>
									)}
								</PresenceSwap>
								<span className="shrink-0" aria-hidden="true">
									<SignatureFieldTypeIcon type={field.type} isMobile />
								</span>
								<span className="min-w-0 flex-1">
									<span
										className={cn(
											"block text-sm leading-snug",
											done
												? "text-muted-foreground line-through"
												: "text-foreground",
										)}
									>
										{label}
									</span>
									<span className="block text-[11px] text-muted-foreground">
										Page {field.pageIndex + 1}
										{field.required ? " · Required" : ""}
									</span>
								</span>
							</button>
							{done && !alreadySigned ? (
								<Button
									type="button"
									variant="ghost"
									size="icon-xs"
									className="size-7 shrink-0 text-muted-foreground opacity-70 hover:text-foreground group-hover:opacity-100"
									onClick={(event) => {
										event.stopPropagation();
										onClearField(field.id);
									}}
									aria-label={`Clear ${label}`}
								>
									<XIcon className="size-3.5" weight="bold" />
								</Button>
							) : (
								<span className="size-7 shrink-0" aria-hidden />
							)}
						</div>
					);
				})}
			</Stagger>

			{canSign && !canSubmitPlacementSign ? (
				<p className="text-[11px] text-amber-800 dark:text-amber-200">
					Complete every required field to enable Sign.
				</p>
			) : null}

			{requiredProgress.total === 0 ? (
				<p className="text-[11px] text-muted-foreground">
					{alreadySigned
						? "Your signature is recorded on this document."
						: "Tap a field on the document or use the list above."}
				</p>
			) : null}
		</div>
	);
}
