import { useId } from "react";
import type { useCryptoRequired } from "@/src/lib/auth/use-crypto-required";
import { Button } from "@/src/lib/components/ui/button";
import { Dialog } from "@/src/lib/components/ui/dialog";
import {
	FeatureDialogActions,
	FeatureDialogBody,
	FeatureDialogClose,
	FeatureDialogContent,
	FeatureDialogHeader,
	FeatureDialogMedia,
	FeatureDialogPanel,
} from "@/src/lib/components/ui/feature-dialog";
import { Label } from "@/src/lib/components/ui/label";
import { Textarea } from "@/src/lib/components/ui/textarea";
import { FEATURE_DIALOG_IMAGES } from "@/src/lib/domains/feature-dialog/images";

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
	const titleId = useId();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<FeatureDialogContent aria-labelledby={titleId}>
				<FeatureDialogMedia
					src={FEATURE_DIALOG_IMAGES.recoveryPhraseAndCryptoUnlockDialog}
					badge="Unlock keys"
				/>

				<FeatureDialogPanel>
					<FeatureDialogClose disabled={cryptoRequired.recoveryPending} />

					<FeatureDialogHeader
						badge="Unlock keys"
						title="Unlock encryption keys"
						titleId={titleId}
						description="Your wallet could not unlock this session automatically. Enter your 24-word recovery phrase to continue saving this draft."
					/>

					<FeatureDialogBody>
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

						<FeatureDialogActions>
							<Button
								type="button"
								variant="primary"
								size="lg"
								className="w-full"
								onClick={() => void onSubmitRecovery()}
								disabled={
									cryptoRequired.recoveryPending ||
									!cryptoRequired.recoveryPhrase.trim()
								}
								isLoading={cryptoRequired.recoveryPending}
							>
								{cryptoRequired.recoveryPending ? "Unlocking…" : "Unlock"}
							</Button>
							<Button
								type="button"
								variant="outline"
								size="lg"
								className="w-full"
								onClick={() => onOpenChange(false)}
								disabled={cryptoRequired.recoveryPending}
							>
								Close
							</Button>
						</FeatureDialogActions>
					</FeatureDialogBody>
				</FeatureDialogPanel>
			</FeatureDialogContent>
		</Dialog>
	);
}
