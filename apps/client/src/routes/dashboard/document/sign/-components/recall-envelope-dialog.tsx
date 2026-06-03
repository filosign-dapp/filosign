import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => Promise<void>;
	pending?: boolean;
};

export function RecallEnvelopeDialog({
	open,
	onOpenChange,
	onConfirm,
	pending,
}: Props) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent showCloseButton className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Recall envelope</DialogTitle>
					<DialogDescription>
						Voids this send on-chain before the envelope is complete. Partial
						signatures may remain in the audit trail. Pending invites are
						revoked. You cannot void after all required signers (or quorum) have
						finished.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="gap-2 sm:gap-0">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={pending}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="destructive"
						disabled={pending}
						onClick={async () => {
							await onConfirm();
							onOpenChange(false);
						}}
					>
						{pending ? "Recalling…" : "Recall envelope"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
