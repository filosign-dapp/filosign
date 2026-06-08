import {
	CheckCircleIcon,
	PaperPlaneRightIcon,
	SpinnerGapIcon,
	XCircleIcon,
} from "@phosphor-icons/react";
import Logo from "@/src/lib/components/app/chrome/logo";
import { Button } from "@/src/lib/components/ui/button";
import { DisabledTooltip } from "@/src/lib/components/ui/disabled-tooltip";
import { PAYOUT_EXCEEDS_BALANCE_MESSAGE } from "@/src/lib/domains/settlements/payout-copy";
import { useAttachedPayoutBalance } from "@/src/lib/domains/settlements/use-attached-payout-balance";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { cn } from "@/src/lib/utils/utils";
import { AddSignDraftActions } from "@/src/routes/dashboard/envelope/create/add-sign/-components/draft/actions";
import { useAddSignChrome } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/context";

export function AddSignHeader() {
	const { sendStatus, handleSend } = useAddSignChrome();
	const createForm = useStorePersist((s) => s.createForm);
	const { exceedsBalance } = useAttachedPayoutBalance(
		createForm?.settlementDrafts,
	);
	const isLoading = sendStatus === "loading" || sendStatus === "signing";
	const sendBlocked = isLoading || exceedsBalance;
	const sendReason = exceedsBalance
		? PAYOUT_EXCEEDS_BALANCE_MESSAGE
		: undefined;
	const isSigning = sendStatus === "signing";
	const isSuccess = sendStatus === "success";
	const isError = sendStatus === "error";

	const getButtonContent = () => {
		if (isSigning) {
			return (
				<>
					<SpinnerGapIcon className="size-4 animate-spin" />
					<p className="hidden sm:block">Signing your fields...</p>
				</>
			);
		}
		if (sendStatus === "loading") {
			return (
				<>
					<SpinnerGapIcon className="size-4 animate-spin" />
					<p className="hidden sm:block">Sending...</p>
				</>
			);
		}
		if (isSuccess) {
			return (
				<>
					<CheckCircleIcon className="size-4" weight="fill" />
					<p className="hidden sm:block">Document Sent</p>
				</>
			);
		}
		if (isError) {
			return (
				<>
					<XCircleIcon className="size-4" weight="fill" />
					<p className="hidden sm:block">Failed to Send</p>
				</>
			);
		}
		return (
			<>
				<PaperPlaneRightIcon className="size-4" weight="bold" />
				<p className="hidden sm:block">Send Envelope</p>
			</>
		);
	};

	return (
		<header className="glass sticky top-0 z-50 border-b border-border bg-background/95">
			<div className="flex h-16 items-center justify-between px-6">
				<div className="flex items-center gap-4">
					<Logo className="px-0" textClassName="text-foreground" iconOnly />
					<h3>Place fields</h3>
				</div>

				<div className="flex items-center gap-3">
					<AddSignDraftActions />
					<DisabledTooltip disabled={sendBlocked} reason={sendReason}>
						<Button
							variant="primary"
							onClick={handleSend}
							disabled={sendBlocked}
							className={cn(
								"gap-2 transition-colors duration-300",
								isSuccess && "bg-secondary hover:bg-secondary/90",
								isError && "bg-destructive hover:bg-destructive/90",
							)}
						>
							{getButtonContent()}
						</Button>
					</DisabledTooltip>
				</div>
			</div>
		</header>
	);
}
