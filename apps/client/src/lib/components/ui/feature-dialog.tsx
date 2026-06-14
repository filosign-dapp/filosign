"use client";

import { XIcon } from "@phosphor-icons/react";
import type * as React from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import {
	FeatureShell,
	FeatureShellActions,
	FeatureShellBody,
	FeatureShellHeaderFields,
	type FeatureShellHeaderProps,
	FeatureShellMedia,
	FeatureShellPanel,
} from "@/src/lib/components/ui/feature-shell";
import { cn } from "@/src/lib/utils/index";

const featureDialogPositionClassName = cn(
	"top-auto bottom-0 flex max-h-[90dvh] min-h-0 w-full flex-col translate-x-[-50%] translate-y-0 gap-0 overflow-hidden rounded-t-3xl rounded-b-none p-0 ring-0",
	"max-w-[calc(100vw-1rem)] sm:top-1/2 sm:bottom-auto sm:max-w-[min(72rem,calc(100vw-2rem))] sm:-translate-y-1/2 sm:rounded-3xl sm:min-h-[min(34rem,85dvh)]",
);

const featureDialogShellClassName =
	"min-h-0 max-h-full w-full flex-1 overflow-hidden shadow-none ring-0 max-sm:grid-rows-[auto_minmax(0,1fr)] sm:grid-cols-[1fr_1fr] sm:grid-rows-[minmax(0,1fr)]";

function FeatureDialogMedia({
	className,
	...props
}: React.ComponentProps<typeof FeatureShellMedia>) {
	return (
		<FeatureShellMedia
			className={cn(
				"min-h-0 max-sm:max-h-52 sm:aspect-auto sm:h-full sm:max-h-full sm:min-h-0",
				className,
			)}
			{...props}
		/>
	);
}

function FeatureDialogPanel({
	className,
	...props
}: React.ComponentProps<typeof FeatureShellPanel>) {
	return (
		<FeatureShellPanel
			className={cn("min-h-0 overscroll-contain", className)}
			{...props}
		/>
	);
}

function FeatureDialogContent({
	className,
	overlayClassName,
	children,
	...props
}: React.ComponentProps<typeof DialogContent>) {
	return (
		<DialogContent
			className={cn(featureDialogPositionClassName, className)}
			overlayClassName={overlayClassName}
			showCloseButton={false}
			{...props}
		>
			<FeatureShell className={featureDialogShellClassName}>
				{children}
			</FeatureShell>
		</DialogContent>
	);
}

function FeatureDialogClose({
	className,
	disabled,
}: {
	className?: string;
	disabled?: boolean;
}) {
	if (disabled) return null;

	return (
		<DialogClose
			render={
				<Button
					variant="ghost"
					size="icon-lg"
					className={cn("absolute top-4 right-4", className)}
				/>
			}
		>
			<XIcon className="size-5" aria-hidden />
			<span className="sr-only">Close</span>
		</DialogClose>
	);
}

export type FeatureDialogHeaderProps = Omit<FeatureShellHeaderProps, "badge">;

function FeatureDialogHeader({
	title,
	description,
	titleId,
	descriptionClassName,
	className,
}: FeatureDialogHeaderProps & Pick<React.ComponentProps<"div">, "className">) {
	return (
		<DialogHeader
			className={cn("gap-4 space-y-0 pr-12 text-left sm:pr-14", className)}
		>
			<FeatureShellHeaderFields
				title={title}
				description={description}
				titleId={titleId}
				descriptionClassName={descriptionClassName}
				Title={DialogTitle}
				Description={DialogDescription}
			/>
		</DialogHeader>
	);
}

export {
	FeatureDialogClose,
	FeatureDialogContent,
	FeatureDialogHeader,
	FeatureDialogMedia,
	FeatureDialogPanel,
	FeatureShellActions as FeatureDialogActions,
	FeatureShellBody as FeatureDialogBody,
};
