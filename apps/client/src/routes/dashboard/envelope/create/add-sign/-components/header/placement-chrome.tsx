import {
	ArrowLeftIcon,
	CheckCircleIcon,
	PaperPlaneRightIcon,
	XCircleIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import Logo from "@/src/lib/components/app/chrome/logo";
import { Button } from "@/src/lib/components/ui/button";
import { DisabledTooltip } from "@/src/lib/components/ui/disabled-tooltip";
import { InlineLoader } from "@/src/lib/components/ui/loader";
import { PAYOUT_EXCEEDS_BALANCE_MESSAGE } from "@/src/lib/domains/settlements/payout-copy";
import { useAttachedPayoutBalance } from "@/src/lib/domains/settlements/use-attached-payout-balance";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { cn } from "@/src/lib/utils/utils";
import { AddSignDraftActions } from "@/src/routes/dashboard/envelope/create/add-sign/-components/draft/actions";
import { PlacementHistoryButtons } from "@/src/routes/dashboard/envelope/create/add-sign/-components/header/placement-history";
import { PlacedFieldsSheet } from "@/src/routes/dashboard/envelope/create/add-sign/-components/placed-fields-sheet";
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
					<InlineLoader size="sm" className="text-current" />
					<span className="hidden sm:inline">Signing…</span>
				</>
			);
		}
		if (sendStatus === "loading") {
			return (
				<>
					<InlineLoader size="sm" className="text-current" />
					<span className="hidden sm:inline">Sending…</span>
				</>
			);
		}
		if (isSuccess) {
			return (
				<>
					<CheckCircleIcon className="size-4" weight="fill" />
					<span className="hidden sm:inline">Sent</span>
				</>
			);
		}
		if (isError) {
			return (
				<>
					<XCircleIcon className="size-4" weight="fill" />
					<span className="hidden sm:inline">Failed</span>
				</>
			);
		}
		return (
			<>
				<PaperPlaneRightIcon className="size-4" weight="bold" />
				<span className="hidden sm:inline">Send</span>
			</>
		);
	};

	return (
		<header className="glass z-50 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/50 px-4 md:px-8">
			<div className="flex min-w-0 items-center gap-3 md:gap-4">
				<Logo className="px-0" textClassName="text-foreground" iconOnly />
				<div className="min-w-0">
					<h3 className="truncate text-base font-semibold text-foreground">
						Place fields
					</h3>
					<Button
						type="button"
						variant="link"
						size="sm"
						className="h-auto gap-1.5 px-0 text-xs text-muted-foreground"
						render={
							<Link
								to="/dashboard/envelope/create"
								className="inline-flex items-center gap-1.5"
							/>
						}
					>
						<ArrowLeftIcon className="size-3.5" weight="bold" />
						Envelope details
					</Button>
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-2 md:gap-3">
				<div className="lg:hidden">
					<PlacedFieldsSheet variant="toolbar" />
				</div>
				<PlacementHistoryButtons />
				<AddSignDraftActions />
				<DisabledTooltip disabled={sendBlocked} reason={sendReason}>
					<Button
						variant="primary"
						size="lg"
						onClick={handleSend}
						disabled={sendBlocked}
						className={cn(
							"gap-2",
							isSuccess && "bg-secondary hover:bg-secondary/90",
							isError && "bg-destructive hover:bg-destructive/90",
						)}
					>
						{getButtonContent()}
					</Button>
				</DisabledTooltip>
			</div>
		</header>
	);
}
