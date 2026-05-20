import { CheckIcon, WarningIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Button } from "@/src/lib/components/ui/button";

interface SaveButtonProps {
	onSave: () => void;
	disabled: boolean;
	isLoading: boolean;
	isSaved: boolean;
	error?: string;
	show: boolean;
}

export function SaveButton({
	onSave,
	disabled,
	isLoading,
	isSaved,
	error,
	show,
}: SaveButtonProps) {
	if (!show) return null;

	return (
		<motion.div
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 6 }}
			transition={{ duration: 0.15 }}
			className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-end"
		>
			{error ? (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="flex max-w-full items-start gap-1.5 text-xs text-destructive/90"
				>
					<WarningIcon className="size-3.5 shrink-0 mt-0.5" />
					<span className="text-right">{error}</span>
				</motion.div>
			) : null}
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="shrink-0 text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:opacity-60"
				onClick={onSave}
				disabled={disabled || isLoading}
			>
				{isLoading ? (
					"Saving…"
				) : isSaved ? (
					<span className="flex items-center gap-1.5">
						<CheckIcon className="size-3.5" weight="bold" />
						Saved
					</span>
				) : (
					"Save"
				)}
			</Button>
		</motion.div>
	);
}
