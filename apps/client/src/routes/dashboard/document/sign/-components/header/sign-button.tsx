import { PenNibIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import { DisabledTooltip } from "@/src/lib/components/ui/disabled-tooltip";
import {
	useSignFile,
	useSignIdentity,
	useSignMeta,
	useSignPlacement,
	useSignSigning,
	useSignViewer,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";
import { useSignHeaderUi } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-header-ui";
import {
	resolveSignButtonDisabledReason,
	shouldShowSignButton,
} from "@/src/routes/dashboard/document/sign/-lib/utils/sign-button-state";

type SignHeaderSignButtonProps = {
	label: string;
	density: "compact" | "comfortable";
};

export function SignHeaderSignButton({
	label,
	density,
}: SignHeaderSignButtonProps) {
	const { signerAddress } = useSignIdentity();
	const { canSign, alreadySigned, signFile, signProgressOpen } =
		useSignSigning();
	const { canSubmitSign, setSignConfirmOpen } = useSignHeaderUi();
	const { myPlacementFields, canSubmitPlacementSign } = useSignPlacement();
	const { file } = useSignFile();
	const { fileData, docCanvasBusy } = useSignViewer();
	const { isSender } = useSignMeta();

	const showButton = shouldShowSignButton({
		signerAddress,
		alreadySigned,
		canSign,
		assignedFieldCount: myPlacementFields.length,
	});

	if (!showButton) return null;

	const docReady = Boolean(fileData) && !docCanvasBusy;
	const isLoading = signFile.isPending || signProgressOpen;
	const submitBlocked = !canSubmitSign;
	const disabledReason = resolveSignButtonDisabledReason({
		canSubmitSign,
		canSign,
		canSignByRouting: file?.participantAccess?.canSignByRouting,
		signerReplacementPending: file?.envelopeProgress?.signerReplacementPending,
		canSubmitPlacementSign,
		docReady,
		isSender,
		acknowledged: file?.participantAccess?.acknowledged,
		firstViewedAt: file?.participantAccess?.firstViewedAt,
	});

	const disabled = submitBlocked || isLoading;
	const buttonLabel = isLoading ? "Signing…" : label;

	const button =
		density === "comfortable" ? (
			<Button
				variant="primary"
				className="hidden gap-2 lg:inline-flex"
				onClick={() => setSignConfirmOpen(true)}
				disabled={disabled}
				isLoading={isLoading}
			>
				<PenNibIcon className="size-4" weight="bold" />
				<span className="hidden sm:inline">{buttonLabel}</span>
			</Button>
		) : (
			<Button
				variant="primary"
				size="sm"
				onClick={() => setSignConfirmOpen(true)}
				disabled={disabled}
				isLoading={isLoading}
			>
				{buttonLabel}
			</Button>
		);

	return (
		<DisabledTooltip
			disabled={submitBlocked}
			reason={disabledReason}
			side="bottom"
		>
			{button}
		</DisabledTooltip>
	);
}
