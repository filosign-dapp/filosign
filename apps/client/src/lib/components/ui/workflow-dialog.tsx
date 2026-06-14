"use client";

import type * as React from "react";
import {
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import {
	featureShellDescriptionClassName,
	featureShellTitleClassName,
} from "@/src/lib/components/ui/feature-shell";
import { cn } from "@/src/lib/utils/index";

function WorkflowDialogContent({
	className,
	overlayClassName,
	children,
	...props
}: React.ComponentProps<typeof DialogContent>) {
	return (
		<DialogContent
			className={cn(
				"flex max-h-[85dvh] min-h-0 w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg",
				className,
			)}
			overlayClassName={overlayClassName}
			showCloseButton={false}
			{...props}
		>
			{children}
		</DialogContent>
	);
}

function WorkflowDialogHeader({
	title,
	description,
	titleId,
	descriptionClassName,
	className,
}: {
	title: React.ReactNode;
	description?: React.ReactNode;
	titleId?: string;
	descriptionClassName?: string;
	className?: string;
}) {
	return (
		<DialogHeader
			className={cn(
				"shrink-0 gap-3 space-y-0 border-b border-border/60 px-6 py-5 text-left",
				className,
			)}
		>
			<DialogTitle id={titleId} className={featureShellTitleClassName}>
				{title}
			</DialogTitle>
			{description ? (
				<DialogDescription
					className={cn(featureShellDescriptionClassName, descriptionClassName)}
				>
					{description}
				</DialogDescription>
			) : null}
		</DialogHeader>
	);
}

function WorkflowDialogBody({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("min-h-0 flex-1 overflow-y-auto px-6 py-5", className)}
			{...props}
		/>
	);
}

function WorkflowDialogActions({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex shrink-0 flex-col gap-3 border-t border-border/60 px-6 py-5",
				className,
			)}
			{...props}
		/>
	);
}

export {
	WorkflowDialogActions,
	WorkflowDialogBody,
	WorkflowDialogContent,
	WorkflowDialogHeader,
};
