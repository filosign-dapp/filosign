import { AsteriskIcon, CircleIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";
import { SignatureFieldTypeIcon } from "@/src/lib/domains/files/placement-field-display";
import { cn } from "@/src/lib/utils";

export type PlacementFieldChromeVariant =
	| "pending"
	| "applied"
	| "muted"
	| "complete";

type PlacementFieldChromeProps = {
	type: SignatureField["type"];
	primaryLabel: string;
	secondaryLabel?: string;
	assigneeEmail?: string | null;
	required?: boolean;
	accentColor: string;
	variant?: PlacementFieldChromeVariant;
	isMobile?: boolean;
	focused?: boolean;
	className?: string;
	children?: ReactNode;
};

export function PlacementFieldChrome({
	type,
	primaryLabel,
	secondaryLabel,
	assigneeEmail,
	required = false,
	accentColor,
	variant = "pending",
	isMobile = false,
	focused = false,
	className,
	children,
}: PlacementFieldChromeProps) {
	const showAssignee =
		assigneeEmail && (variant === "muted" || variant === "pending");
	const displayPrimary = showAssignee ? assigneeEmail : primaryLabel;
	const displaySecondary =
		showAssignee && secondaryLabel
			? secondaryLabel
			: (secondaryLabel ?? primaryLabel);

	return (
		<div
			className={cn(
				"box-border h-full w-full overflow-hidden rounded-sm border shadow-md",
				variant === "applied" || variant === "complete"
					? "placement-field-applied-shell"
					: variant === "muted"
						? "placement-field-chrome-muted"
						: "placement-field-chrome",
				focused && "ring-2 ring-ring/60",
				variant === "complete" && "opacity-80",
				className,
			)}
			style={{
				borderLeftWidth: 3,
				borderLeftColor: accentColor,
			}}
		>
			{children ? (
				<div className="placement-field-applied-fill h-full w-full">
					{children}
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
						{displaySecondary && displaySecondary !== displayPrimary ? (
							<div className="truncate placement-field-subtle">
								{displaySecondary}
							</div>
						) : null}
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
}
