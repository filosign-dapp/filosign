import { FileTextIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { Label } from "@/src/lib/components/ui/label";
import { Textarea } from "@/src/lib/components/ui/textarea";

type DocCanvasPanelProps = {
	busy?: boolean;
	showRecovery?: boolean;
	recoveryPhrase?: string;
	onRecoveryPhraseChange?: (value: string) => void;
	recoveryError?: string;
	onRecoverySubmit?: () => void;
	recoveryPending?: boolean;
	error?: string | null;
	onRetry?: () => void;
	retryPending?: boolean;
};

export function DocCanvasPanel({
	busy,
	showRecovery,
	recoveryPhrase = "",
	onRecoveryPhraseChange,
	recoveryError,
	onRecoverySubmit,
	recoveryPending,
	error,
	onRetry,
	retryPending,
}: DocCanvasPanelProps) {
	if (showRecovery) {
		return (
			<div className="flex w-full h-full items-center justify-center p-6">
				<div className="w-full max-w-sm space-y-3">
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
					<p className="text-sm text-destructive">{error}</p>
					{onRetry ? (
						<Button
							size="sm"
							variant="outline"
							disabled={retryPending}
							onClick={() => onRetry()}
						>
							Retry
						</Button>
					) : null}
				</div>
			</div>
		);
	}

	if (busy) {
		return (
			<div className="flex w-full h-full items-center justify-center">
				<InlineLoader size="lg" />
			</div>
		);
	}

	return null;
}
