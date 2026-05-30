import { SIGN_CONFIRM_DESCRIPTION_V1 } from "@filosign/shared";
import { SpinnerIcon } from "@phosphor-icons/react";
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

type SignConfirmDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void | Promise<void>;
	pending?: boolean;
};

export function SignConfirmDialog({
	open,
	onOpenChange,
	onConfirm,
	pending,
}: SignConfirmDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirm signing intent</AlertDialogTitle>
					<AlertDialogDescription>
						{SIGN_CONFIRM_DESCRIPTION_V1}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						variant="primary"
						disabled={pending}
						onClick={() => {
							void (async () => {
								try {
									await onConfirm();
									onOpenChange(false);
								} catch {
									// Caller handles user feedback; keep dialog open on failure.
								}
							})();
						}}
					>
						{pending ? (
							<>
								<SpinnerIcon className="size-4 animate-spin" />
								Signing…
							</>
						) : (
							"Sign document"
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
