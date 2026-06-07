import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import { DocsLink } from "@/src/lib/docs/docs-link";
import { DOCS_LINKS } from "@/src/lib/docs/links";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => Promise<void>;
	pending?: boolean;
};

export function ClearEnvelopeSignaturesDialog({
	open,
	onOpenChange,
	onConfirm,
	pending,
}: Props) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent showCloseButton className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Clear signatures</DialogTitle>
					<DialogDescription>
						Removes all on-chain signatures for this envelope without voiding
						it. Signers must acknowledge and sign again. This reopens payout and
						attachment rule edits that were locked after the first required
						signature. Blocked if any payout leg has already been paid.
					</DialogDescription>
				</DialogHeader>
				<DocsLink href={DOCS_LINKS.envelopeGovernance()} className="px-6 -mt-1">
					Envelope governance guide
				</DocsLink>
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
						{pending ? "Clearing…" : "Clear signatures"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
