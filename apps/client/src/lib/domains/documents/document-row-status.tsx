import type { DocumentListRow } from "@filosign/react/documents";
import { Badge } from "@/src/lib/components/ui/badge";
import { cn } from "@/src/lib/utils/index";

export type DocumentRowStatusTone =
	| "muted"
	| "success"
	| "warning"
	| "primary"
	| "destructive"
	| "secondary";

export type DocumentRowStatus = {
	label: string;
	tone: DocumentRowStatusTone;
	directionLabel?: "Sent" | "Received";
};

const statusToneClass: Record<DocumentRowStatusTone, string> = {
	muted: "border-border/60 bg-muted/60 text-muted-foreground",
	success: "border-border bg-secondary text-black",
	warning: "border-warning/30 bg-warning/10 text-warning",
	primary: "border-secondary/30 bg-secondary/5 text-secondary",
	destructive: "border-destructive/30 bg-destructive/10 text-destructive",
	secondary: "border-badge-yellow/25 bg-badge-yellow/20 text-white/90",
};

const directionToneClass: Record<"Sent" | "Received", string> = {
	Sent: "border-badge-blue/25 bg-badge-blue/20 text-white/90",
	Received: "border-badge-green/25 bg-badge-green/10 text-white/90",
};

export const rowAccentClass: Record<DocumentRowStatusTone, string> = {
	muted: "border-l-muted-foreground/35",
	success: "border-l-secondary",
	warning: "border-l-warning",
	primary: "border-l-primary",
	destructive: "border-l-destructive/70",
	secondary: "border-l-border",
};

export function resolveDocumentRowStatus(
	row: DocumentListRow,
): DocumentRowStatus {
	if (row.kind === "draft") {
		return { label: "Draft", tone: "muted" };
	}

	const directionLabel = row.direction === "sent" ? "Sent" : "Received";

	if (row.lifecycle === "voided") {
		return { label: "Voided", tone: "destructive", directionLabel };
	}

	if (row.lifecycle === "completed") {
		return { label: "Completed", tone: "success", directionLabel };
	}

	if (row.direction === "received") {
		if (!row.signedByMe) {
			return {
				label: "Needs signature",
				tone: "primary",
				directionLabel,
			};
		}
		return {
			label: "Signed by you",
			tone: "secondary",
			directionLabel,
		};
	}

	if (row.signing) {
		return {
			label: `${row.signing.signedCount}/${row.signing.requiredCount} signed`,
			tone: "warning",
			directionLabel,
		};
	}

	return { label: "In progress", tone: "warning", directionLabel };
}

export function documentRowStatusLabelFromRow(row: DocumentListRow): string {
	return resolveDocumentRowStatus(row).label;
}

type DocumentRowStatusBadgeProps = {
	row: DocumentListRow;
	showDirection?: boolean;
	className?: string;
};

export function DocumentRowStatusBadge({
	row,
	showDirection = true,
	className,
}: DocumentRowStatusBadgeProps) {
	const status = resolveDocumentRowStatus(row);
	const isDraft = row.kind === "draft";

	return (
		<div className={cn("flex flex-wrap items-center gap-1.5", className)}>
			{isDraft ? (
				<Badge
					variant="outline"
					className={cn("text-[11px] font-medium", statusToneClass.muted)}
				>
					Draft
				</Badge>
			) : showDirection && status.directionLabel ? (
				<Badge
					variant="outline"
					className={cn(
						"text-[10px] font-normal",
						directionToneClass[status.directionLabel],
					)}
				>
					{status.directionLabel}
				</Badge>
			) : null}
			{!isDraft ? (
				<Badge
					variant="outline"
					className={cn(
						"text-[11px] font-medium",
						statusToneClass[status.tone],
					)}
				>
					{status.label}
				</Badge>
			) : null}
		</div>
	);
}
