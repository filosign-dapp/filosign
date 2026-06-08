import {
	CheckIcon,
	FloppyDiskIcon,
	SpinnerGapIcon,
} from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import { DisabledTooltip } from "@/src/lib/components/ui/disabled-tooltip";

type Props = {
	planId: string | undefined;
	isSaving: boolean;
	showSavedState: boolean;
	savedLabel: string;
	hasChanges: boolean;
	isSavedToServer: boolean;
	needsDraftCrypto: boolean;
	cryptoReady: boolean;
	needsRecovery: boolean;
	documentCount: number;
	onSave: () => void;
	onPromptUpgrade: () => void;
};

export function DraftSaveButton({
	planId,
	isSaving,
	showSavedState,
	savedLabel,
	hasChanges,
	isSavedToServer,
	needsDraftCrypto,
	cryptoReady,
	needsRecovery,
	documentCount,
	onSave,
	onPromptUpgrade,
}: Props) {
	const saveDisabled =
		planId !== "free" &&
		(isSaving ||
			(needsDraftCrypto && !cryptoReady) ||
			(isSavedToServer && !hasChanges) ||
			documentCount === 0);
	const saveDisabledReason =
		needsDraftCrypto && !cryptoReady
			? needsRecovery
				? "Unlock encryption keys with recovery phrase to save."
				: "Unlocking encryption keys..."
			: undefined;

	return (
		<DisabledTooltip disabled={saveDisabled} reason={saveDisabledReason}>
			<Button
				type="button"
				variant="outline"
				size="sm"
				disabled={saveDisabled}
				title={hasChanges && !saveDisabled ? "Unsaved changes" : undefined}
				onClick={() => {
					if (planId === "free") {
						onPromptUpgrade();
						return;
					}
					onSave();
				}}
				className="gap-1.5"
			>
				{isSaving ? (
					<>
						<SpinnerGapIcon className="size-4 animate-spin" />
						<span>Saving…</span>
					</>
				) : showSavedState ? (
					<>
						<CheckIcon className="size-4 text-green-500" weight="bold" />
						<span className="text-muted-foreground">{savedLabel}</span>
					</>
				) : (
					<>
						<FloppyDiskIcon className="size-4 text-primary" />
						<span>Save draft</span>
					</>
				)}
			</Button>
		</DisabledTooltip>
	);
}
