import type { useCryptoRequired } from "@/src/lib/auth/use-crypto-required";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import { Label } from "@/src/lib/components/ui/label";
import { Textarea } from "@/src/lib/components/ui/textarea";

type CryptoRequiredState = ReturnType<typeof useCryptoRequired>;

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	cryptoRequired: CryptoRequiredState;
	onSubmitRecovery: () => Promise<void>;
};

export function DraftCryptoRecoveryDialog({
	open,
	onOpenChange,
	cryptoRequired,
	onSubmitRecovery,
}: Props) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Unlock encryption keys</DialogTitle>
					<DialogDescription>
						Your wallet could not unlock this session automatically. Enter your
						24-word recovery phrase to continue saving this draft.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2">
					<Label htmlFor="add-sign-recovery-phrase">Recovery phrase</Label>
					<Textarea
						id="add-sign-recovery-phrase"
						rows={5}
						value={cryptoRequired.recoveryPhrase}
						onChange={(event) =>
							cryptoRequired.setRecoveryPhrase(event.target.value)
						}
						placeholder="24-word recovery phrase"
						spellCheck={false}
					/>
				</div>
				{cryptoRequired.recoveryError ? (
					<p className="text-sm text-destructive">
						{cryptoRequired.recoveryError}
					</p>
				) : null}
				<div className="flex justify-end gap-2">
					<Button
						type="button"
						variant="ghost"
						onClick={() => onOpenChange(false)}
						disabled={cryptoRequired.recoveryPending}
					>
						Close
					</Button>
					<Button
						type="button"
						variant="primary"
						onClick={() => void onSubmitRecovery()}
						disabled={
							cryptoRequired.recoveryPending ||
							!cryptoRequired.recoveryPhrase.trim()
						}
					>
						{cryptoRequired.recoveryPending ? "Unlocking…" : "Unlock"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
