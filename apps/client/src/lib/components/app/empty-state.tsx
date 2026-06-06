import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/src/lib/components/ui/empty";
import { cn } from "@/src/lib/utils";

export type AppEmptyStatePreset = "page" | "section" | "inline";
export type AppEmptyStateVariant = "default" | "outline" | "muted";

export type AppEmptyStateProps = {
	icon?: Icon;
	title?: string;
	description?: ReactNode;
	children?: ReactNode;
	preset?: AppEmptyStatePreset;
	variant?: AppEmptyStateVariant;
	className?: string;
};

const presetClassName: Record<AppEmptyStatePreset, string> = {
	page: "min-h-0 flex-1 border-transparent p-8 py-20",
	section: "p-8",
	inline: "p-6",
};

const variantClassName: Record<AppEmptyStateVariant, string> = {
	default: "border-transparent",
	outline: "border-border/80 bg-muted/5",
	muted: "border-transparent bg-muted/30",
};

export function AppEmptyState({
	icon: IconComponent,
	title,
	description,
	children,
	preset = "section",
	variant = "default",
	className,
}: AppEmptyStateProps) {
	return (
		<Empty
			className={cn(
				presetClassName[preset],
				variantClassName[variant],
				className,
			)}
		>
			<EmptyHeader>
				{IconComponent ? (
					<EmptyMedia variant="icon">
						<IconComponent className="size-6" />
					</EmptyMedia>
				) : null}
				{title ? <EmptyTitle>{title}</EmptyTitle> : null}
				{description ? (
					<EmptyDescription>{description}</EmptyDescription>
				) : null}
			</EmptyHeader>
			{children ? <EmptyContent>{children}</EmptyContent> : null}
		</Empty>
	);
}

/** Compact dashed empty for admin settings tables. */
export function AdminSectionEmpty({
	title,
	description,
	className,
}: {
	title: string;
	description?: string;
	className?: string;
}) {
	return (
		<AppEmptyState
			preset="section"
			variant="outline"
			title={title}
			description={description}
			className={cn("py-8", className)}
		/>
	);
}
