import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import { useEffect } from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import { ColdSharePanel } from "@/src/lib/domains/invites/-components/cold-share-panel";
import { WarmSharePanel } from "@/src/lib/domains/invites/-components/warm-share-panel";
import type {
	ColdSharePackage,
	WarmShareSummary,
} from "@/src/lib/domains/invites/types";

export type {
	ColdSharePackage,
	WarmShareSummary,
} from "@/src/lib/domains/invites/types";

export function ColdShareDialog(props: {
	open: boolean;
	share: ColdSharePackage | null;
	warmSummary?: WarmShareSummary | null;
	onDone: () => void;
}) {
	const captureAppEvent = useCaptureAppEvent();
	const share = props.share;
	const warmSummary = props.warmSummary ?? null;
	const isColdVariant = Boolean(share);

	useEffect(() => {
		if (!props.open) return;
		if (share) {
			captureAppEvent(CLIENT_ANALYTICS_EVENTS.coldShareDialogShown);
		} else {
			captureAppEvent(CLIENT_ANALYTICS_EVENTS.envelopePostSendDialogShown);
		}
	}, [props.open, share, captureAppEvent]);

	const title = isColdVariant ? "Share access" : "Envelope sent";
	const description = isColdVariant
		? "First-time recipients get the link by email. Share the secret code so they can paste it after opening the link."
		: "Your envelope is live. Recipients can sign from their inbox.";

	return (
		<Dialog open={props.open}>
			<DialogContent
				className="gap-0 overflow-hidden p-0 sm:max-w-lg"
				showCloseButton={false}
			>
				<div className="border-b border-border/50 bg-muted/20 px-6 py-5">
					<DialogHeader className="gap-1.5 space-y-0 text-left">
						<DialogTitle className="font-manrope text-lg font-semibold tracking-tight">
							{title}
						</DialogTitle>
						<DialogDescription className="text-sm leading-relaxed">
							{description}
						</DialogDescription>
					</DialogHeader>
				</div>

				<div className="overflow-y-auto px-6 py-5">
					{isColdVariant && share ? (
						<ColdSharePanel share={share} warmSummary={warmSummary} />
					) : warmSummary ? (
						<WarmSharePanel summary={warmSummary} />
					) : null}
				</div>

				<DialogFooter className="border-t border-border/50 bg-muted/10 px-6 py-4">
					<Button
						type="button"
						variant="primary"
						className="w-full sm:w-auto"
						onClick={props.onDone}
					>
						{isColdVariant ? "Done" : "Continue to dashboard"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
