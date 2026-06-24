import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import type { SendFileIncompleteStep } from "@filosign/react/files";
import { useEffect, useId } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { Dialog } from "@/src/lib/components/ui/dialog";
import {
	FeatureDialogActions,
	FeatureDialogBody,
	FeatureDialogContent,
	FeatureDialogHeader,
	FeatureDialogMedia,
	FeatureDialogPanel,
} from "@/src/lib/components/ui/feature-dialog";
import { postSendIncompleteStepsMessage } from "@/src/lib/copy/send";
import { FEATURE_DIALOG_IMAGES } from "@/src/lib/domains/feature-dialog/images";
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
	incompleteSteps?: SendFileIncompleteStep[];
	onDone: () => void;
}) {
	const titleId = useId();
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

	const incompleteMessage = props.incompleteSteps?.length
		? postSendIncompleteStepsMessage(props.incompleteSteps)
		: null;
	const title = isColdVariant ? "Share access" : "Envelope sent";
	const description = isColdVariant
		? "First-time recipients get the link by email. Share the secret code so they can paste it after opening the link."
		: "Your envelope is live. Recipients can sign from their inbox.";
	const badge = isColdVariant ? "Share access" : "Envelope sent";
	const imageSrc = isColdVariant
		? FEATURE_DIALOG_IMAGES.coldShareAccessDialog
		: FEATURE_DIALOG_IMAGES.postSendEnvelopeSentDialog;

	return (
		<Dialog open={props.open}>
			<FeatureDialogContent aria-labelledby={titleId}>
				<FeatureDialogMedia src={imageSrc} badge={badge} />

				<FeatureDialogPanel>
					<FeatureDialogHeader
						title={title}
						titleId={titleId}
						description={description}
					/>

					<FeatureDialogBody>
						{incompleteMessage ? (
							<div className="flex items-start gap-3 rounded-large border border-amber-500/30 bg-amber-500/5 p-4">
								<p className="text-xs leading-relaxed text-muted-foreground">
									{incompleteMessage}
								</p>
							</div>
						) : null}

						{isColdVariant && share ? (
							<ColdSharePanel share={share} warmSummary={warmSummary} />
						) : warmSummary ? (
							<WarmSharePanel summary={warmSummary} />
						) : null}

						<FeatureDialogActions>
							<Button
								type="button"
								variant="primary"
								size="lg"
								className="w-full"
								onClick={props.onDone}
							>
								{isColdVariant ? "Done" : "Continue to dashboard"}
							</Button>
						</FeatureDialogActions>
					</FeatureDialogBody>
				</FeatureDialogPanel>
			</FeatureDialogContent>
		</Dialog>
	);
}
