import { AsteriskIcon, CircleIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Skeleton } from "@/src/lib/components/ui/skeleton";
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";
import { PlacementChromeScaled } from "@/src/lib/domains/files/placement-chrome-scaled";
import { shouldUseCompactFieldDisplay } from "@/src/lib/domains/files/placement-field-compact";
import { SignatureFieldTypeIcon } from "@/src/lib/domains/files/placement-field-display";
import { cn } from "@/src/lib/utils";

export type PlacementFieldChromeVariant =
	| "pending"
	| "applied"
	| "muted"
	| "complete";

export type PlacementFieldContentFill = "interactive" | "preview";

function defaultContentFill(
	type: SignatureField["type"],
): PlacementFieldContentFill {
	return type === "signature" || type === "initial" ? "preview" : "interactive";
}

type PlacementFieldChromeProps = {
	type: SignatureField["type"];
	primaryLabel: string;
	assigneeEmail?: string | null;
	required?: boolean;
	accentColor: string;
	variant?: PlacementFieldChromeVariant;
	contentFill?: PlacementFieldContentFill;
	isMobile?: boolean;
	focused?: boolean;
	loading?: boolean;
	fieldHeightPx?: number;
	className?: string;
	children?: ReactNode;
};

function placementAccentBarWidth(fieldHeightPx?: number): number {
	if (fieldHeightPx === undefined) return 2;
	return Math.max(1, Math.min(2, fieldHeightPx * 0.1));
}

export function PlacementFieldChrome({
	type,
	primaryLabel,
	assigneeEmail,
	required = false,
	accentColor,
	variant = "pending",
	contentFill,
	isMobile = false,
	focused = false,
	loading = false,
	fieldHeightPx,
	className,
	children,
}: PlacementFieldChromeProps) {
	const resolvedContentFill: PlacementFieldContentFill =
		contentFill ?? defaultContentFill(type);
	const usesPreviewFill = resolvedContentFill === "preview";
	const showAssignee =
		assigneeEmail && (variant === "muted" || variant === "pending");
	const displayPrimary = showAssignee ? assigneeEmail : primaryLabel;
	const useMinimalChrome =
		fieldHeightPx !== undefined &&
		shouldUseCompactFieldDisplay(fieldHeightPx) &&
		!children &&
		!loading;
	const skipScale =
		fieldHeightPx !== undefined && shouldUseCompactFieldDisplay(fieldHeightPx);
	const isAppliedVisual =
		usesPreviewFill && variant === "applied" && Boolean(children);
	const accentBarPx = placementAccentBarWidth(fieldHeightPx);

	const shell = (
		<div
			className={cn(
				"box-border h-full w-full overflow-hidden placement-field-radius",
				isAppliedVisual
					? "placement-field-applied-shell-minimal"
					: usesPreviewFill && (variant === "applied" || variant === "complete")
						? "placement-field-applied-shell border shadow-md"
						: variant === "muted"
							? "placement-field-chrome-muted border shadow-md"
							: "placement-field-chrome border shadow-md",
				focused && "ring-2 ring-ring/60",
				variant === "complete" && "opacity-80",
				useMinimalChrome && "shadow-sm",
				className,
			)}
			style={{
				borderLeftWidth: accentBarPx,
				borderLeftColor: accentColor,
			}}
		>
			{children ? (
				<div
					className={cn(
						"flex h-full min-h-0 w-full items-center justify-center",
						isAppliedVisual
							? "placement-field-applied-fill-minimal"
							: usesPreviewFill
								? "placement-field-applied-fill"
								: "placement-field-text-fill",
					)}
				>
					{children}
				</div>
			) : loading ? (
				<div className="flex h-full w-full items-center justify-center px-2">
					<Skeleton className="h-2 w-full max-w-[95%] rounded-full" />
					<span className="sr-only">Loading {primaryLabel}</span>
				</div>
			) : useMinimalChrome ? (
				<div className="relative h-full w-full">
					<span className="sr-only">{displayPrimary}</span>
					{(variant === "pending" || variant === "muted") && required ? (
						<AsteriskIcon
							className="absolute top-0 right-0.5 size-2 shrink-0 text-amber-400"
							weight="bold"
							aria-hidden
						/>
					) : null}
				</div>
			) : (
				<div className="flex h-full w-full items-center gap-1.5 px-1.5">
					<span className="shrink-0 text-placement-chrome-foreground">
						<SignatureFieldTypeIcon type={type} isMobile={isMobile} />
					</span>
					<div className="min-w-0 flex-1 leading-none">
						<div className="truncate placement-field-label">
							{displayPrimary}
						</div>
					</div>
					{variant === "pending" || variant === "muted" ? (
						required ? (
							<AsteriskIcon
								className="size-3 shrink-0 text-amber-400"
								weight="bold"
							/>
						) : (
							<CircleIcon
								className="size-3 shrink-0 opacity-50"
								weight="regular"
							/>
						)
					) : null}
				</div>
			)}
		</div>
	);

	if (fieldHeightPx === undefined || skipScale) {
		return shell;
	}

	return (
		<PlacementChromeScaled fieldHeightPx={fieldHeightPx}>
			{shell}
		</PlacementChromeScaled>
	);
}
