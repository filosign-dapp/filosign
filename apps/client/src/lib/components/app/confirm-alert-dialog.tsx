import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/src/lib/components/ui/alert-dialog";

type ConfirmAlertDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	confirmLabel?: string;
	onConfirm: () => void | Promise<void>;
	pending?: boolean;
	destructive?: boolean;
};

export function ConfirmAlertDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel = "Continue",
	onConfirm,
	pending,
	destructive,
}: ConfirmAlertDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						variant={destructive ? "destructive" : "primary"}
						disabled={pending}
						onClick={() => {
							void (async () => {
								await onConfirm();
								onOpenChange(false);
							})();
						}}
					>
						{confirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
