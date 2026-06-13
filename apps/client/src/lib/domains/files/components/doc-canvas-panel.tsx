import { FileTextIcon } from "@phosphor-icons/react";
import { SkeletonDocumentCanvas } from "@/src/lib/components/app/skeletons";
import { Button } from "@/src/lib/components/ui/button";
import { Label } from "@/src/lib/components/ui/label";
import { Textarea } from "@/src/lib/components/ui/textarea";

type DocCanvasPanelProps = {
	busy?: boolean;
	documentWidth?: number;
	documentHeight?: number;
	showRecovery?: boolean;
	recoveryPhrase?: string;
	onRecoveryPhraseChange?: (value: string) => void;
	recoveryError?: string;
	walletUnlockError?: string | null;
	onRecoverySubmit?: () => void;
	recoveryPending?: boolean;
	error?: string | null;
	onRetry?: () => void;
	retryPending?: boolean;
};

export function DocCanvasPanel({
	busy,
	documentWidth,
	documentHeight,
	showRecovery,
	recoveryPhrase = "",
	onRecoveryPhraseChange,
	recoveryError,
	walletUnlockError,
	onRecoverySubmit,
	recoveryPending,
	error,
	onRetry,
	retryPending,
}: DocCanvasPanelProps) {
	if (showRecovery) {
		return (
			<div className="flex w-full h-full items-center justify-center p-6">
				<div className="w-full max-w-md space-y-4">
					<div className="space-y-2 text-center">
						<h2 className="text-base font-semibold">Unlock encryption keys</h2>
						<p className="text-sm text-muted-foreground">
							You are still signed in. Confirm in your wallet to decrypt this
							document. If wallet unlock does not work, enter your 24-word
							recovery phrase from Profile settings.
						</p>
					</div>
					{walletUnlockError ? (
						<p className="text-sm text-destructive">{walletUnlockError}</p>
					) : null}
					{recoveryError ? (
						<p className="text-sm text-destructive">{recoveryError}</p>
					) : null}
					<div className="space-y-2">
						<Label htmlFor="doc-recovery-phrase">Recovery phrase</Label>
						<Textarea
							id="doc-recovery-phrase"
							value={recoveryPhrase}
							onChange={(e) => onRecoveryPhraseChange?.(e.target.value)}
							rows={3}
							className="font-mono text-sm"
							placeholder="Enter your 24-word recovery phrase"
						/>
					</div>
					<Button
						variant="primary"
						className="w-full"
						disabled={recoveryPending || !recoveryPhrase.trim()}
						onClick={() => onRecoverySubmit?.()}
					>
						Unlock
					</Button>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex w-full h-full items-center justify-center p-6 text-center">
				<div className="flex max-w-md flex-col items-center gap-3">
					<FileTextIcon className="size-12 text-destructive/50" />
					<p className="text-sm font-medium">
						Could not unlock with your wallet
					</p>
					<p className="text-sm text-destructive">{error}</p>
					{onRetry ? (
						<Button
							size="sm"
							variant="outline"
							disabled={retryPending}
							onClick={() => onRetry()}
						>
							{retryPending ? "Retrying…" : "Retry"}
						</Button>
					) : null}
				</div>
			</div>
		);
	}

	if (busy) {
		return (
			<SkeletonDocumentCanvas
				className="h-full w-full"
				documentWidth={documentWidth}
				documentHeight={documentHeight}
			/>
		);
	}

	return null;
}
