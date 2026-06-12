import type * as React from "react";
import { Badge } from "@/src/lib/components/ui/badge";
import { cn } from "@/src/lib/utils/index";

export const featureShellTitleClassName =
	"font-manrope text-2xl font-semibold tracking-tight sm:text-3xl";

export const featureShellDescriptionClassName =
	"max-w-prose text-base leading-relaxed text-muted-foreground";

export const featureShellBadgeClassName =
	"w-fit font-manrope text-[10px] uppercase tracking-wider";

export type FeatureShellHeaderProps = {
	badge?: React.ReactNode;
	title: React.ReactNode;
	description?: React.ReactNode;
	titleId?: string;
	descriptionClassName?: string;
};

type FeatureShellHeaderSlotProps = {
	Title: React.ElementType<{
		id?: string;
		className?: string;
		children: React.ReactNode;
	}>;
	Description: React.ElementType<{
		className?: string;
		children: React.ReactNode;
	}>;
};

function FeatureShellHeaderFields({
	badge,
	title,
	description,
	titleId,
	descriptionClassName,
	Title,
	Description,
}: FeatureShellHeaderProps & FeatureShellHeaderSlotProps) {
	return (
		<>
			{badge ? (
				<Badge variant="secondary" className={featureShellBadgeClassName}>
					{badge}
				</Badge>
			) : null}
			<div className="space-y-4">
				<Title id={titleId} className={featureShellTitleClassName}>
					{title}
				</Title>
				{description ? (
					<Description
						className={cn(
							featureShellDescriptionClassName,
							descriptionClassName,
						)}
					>
						{description}
					</Description>
				) : null}
			</div>
		</>
	);
}

function FeatureShell({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"grid w-full overflow-hidden rounded-3xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10",
				"md:grid-cols-[2fr_3fr]",
				className,
			)}
			{...props}
		/>
	);
}

function FeatureShellMedia({
	src,
	badge,
	className,
	...props
}: React.ComponentProps<"img"> & {
	badge?: React.ReactNode;
}) {
	return (
		<div
			className={cn(
				"relative aspect-16/10 max-h-52 w-full shrink-0 overflow-hidden sm:max-h-none md:aspect-auto md:min-h-88 lg:min-h-104",
				className,
			)}
		>
			<img
				src={src}
				alt=""
				className="absolute inset-0 size-full object-cover"
				{...props}
			/>
			<div
				className="absolute inset-0 bg-linear-to-t from-black/50 via-black/10 to-transparent"
				aria-hidden="true"
			/>
			{badge ? (
				<div className="absolute inset-x-0 bottom-0 flex p-5 sm:p-6">
					<Badge
						variant="outline"
						className="border-border/40 bg-popover/90 px-3 py-1 backdrop-blur-sm"
					>
						{badge}
					</Badge>
				</div>
			) : null}
		</div>
	);
}

function FeatureShellPanel({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"relative flex min-h-0 flex-col overflow-y-auto p-7 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:p-9 md:p-10 lg:p-12",
				className,
			)}
			{...props}
		/>
	);
}

function FeatureShellHeader({
	badge,
	title,
	description,
	titleId,
	descriptionClassName,
	className,
	...props
}: FeatureShellHeaderProps & React.ComponentProps<"header">) {
	return (
		<header
			className={cn("flex flex-col gap-4 text-left", className)}
			{...props}
		>
			<FeatureShellHeaderFields
				badge={badge}
				title={title}
				description={description}
				titleId={titleId}
				descriptionClassName={descriptionClassName}
				Title="h1"
				Description="p"
			/>
		</header>
	);
}

function FeatureShellBody({
	className,
	...props
}: React.ComponentProps<"div">) {
	return <div className={cn("mt-8 space-y-6", className)} {...props} />;
}

function FeatureShellActions({
	className,
	...props
}: React.ComponentProps<"div">) {
	return <div className={cn("flex flex-col gap-3", className)} {...props} />;
}

export type { FeatureShellHeaderSlotProps };
export {
	FeatureShell,
	FeatureShellActions,
	FeatureShellBody,
	FeatureShellHeader,
	FeatureShellHeaderFields,
	FeatureShellMedia,
	FeatureShellPanel,
};
