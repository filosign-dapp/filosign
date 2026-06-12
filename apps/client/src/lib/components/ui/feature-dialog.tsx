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
	"top-auto bottom-0 max-h-[92dvh] w-full translate-x-[-50%] translate-y-0 gap-0 overflow-hidden rounded-t-3xl rounded-b-none p-0 ring-0",
	"max-w-[calc(100vw-1rem)] sm:top-1/2 sm:bottom-auto sm:max-w-[min(56rem,calc(100vw-2rem))] sm:-translate-y-1/2 sm:rounded-3xl sm:min-h-[min(32rem,85dvh)]",
);

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
			<FeatureShell className="h-full min-h-0 shadow-none ring-0">
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

function FeatureDialogHeader({
	badge,
	title,
	description,
	titleId,
	descriptionClassName,
	className,
}: FeatureShellHeaderProps & Pick<React.ComponentProps<"div">, "className">) {
	return (
		<DialogHeader
			className={cn("gap-4 space-y-0 pr-12 text-left sm:pr-14", className)}
		>
			<FeatureShellHeaderFields
				badge={badge}
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

export type { FeatureShellHeaderProps as FeatureDialogHeaderProps };
export {
	FeatureDialogClose,
	FeatureDialogContent,
	FeatureDialogHeader,
	FeatureShellActions as FeatureDialogActions,
	FeatureShellBody as FeatureDialogBody,
	FeatureShellMedia as FeatureDialogMedia,
	FeatureShellPanel as FeatureDialogPanel,
};
