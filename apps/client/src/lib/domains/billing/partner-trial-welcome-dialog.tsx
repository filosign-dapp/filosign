import type { AppRouterClient, InferClientOutputs } from "@filosign/react/orpc";
import { ArrowSquareOutIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { useId, useMemo } from "react";
import env from "@/src/env";
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
import { FEATURE_DIALOG_IMAGES } from "@/src/lib/domains/feature-dialog/images";

export type PartnerInviteTrialContext = NonNullable<
	InferClientOutputs<AppRouterClient>["billing"]["getWorkspaceBillingContext"]["partnerInviteTrial"]
>;

function pricingHref(): string {
	return `${env.VITE_ASTRO_URL.replace(/\/$/, "")}/pricing`;
}

function formatTrialEnd(periodEnd: string | null): string | null {
	if (!periodEnd) return null;
	const date = new Date(periodEnd);
	if (Number.isNaN(date.getTime())) return null;
	return date.toLocaleDateString(undefined, {
		month: "long",
		day: "numeric",
		year: "numeric",
	});
}

const TRIAL_HIGHLIGHTS = [
	"Advanced signing order and routing for complex workflows",
	"USDC payout attachments, already approved for your workspace",
	"Shared templates and team workspace features",
	"Higher monthly send limits while your trial is active",
] as const;

export type PartnerTrialWelcomeDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	trial: PartnerInviteTrialContext;
};

export function PartnerTrialWelcomeDialog({
	open,
	onOpenChange,
	trial,
}: PartnerTrialWelcomeDialogProps) {
	const titleId = useId();
	const trialEndLabel = useMemo(
		() => formatTrialEnd(trial.periodEnd),
		[trial.periodEnd],
	);

	const description = trialEndLabel
		? `Your ${trial.planName} trial runs for ${trial.trialDays} days, through ${trialEndLabel}. No credit card required.`
		: `Your ${trial.planName} trial runs for ${trial.trialDays} days. No credit card required.`;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<FeatureDialogContent aria-labelledby={titleId}>
				<FeatureDialogMedia
					src={FEATURE_DIALOG_IMAGES.workspaceCreateInviteTrialDialog}
					badge="Teams Pro trial"
				/>

				<FeatureDialogPanel>
					<FeatureDialogClose />

					<FeatureDialogHeader
						badge="Your trial is active"
						title={`Welcome to ${trial.planName}`}
						titleId={titleId}
						description={description}
					/>

					<FeatureDialogBody>
						<ul className="space-y-3 text-sm text-muted-foreground">
							{TRIAL_HIGHLIGHTS.map((item) => (
								<li key={item} className="flex gap-3 text-pretty">
									<CheckCircleIcon
										className="mt-0.5 size-4 shrink-0 text-primary"
										aria-hidden
									/>
									<span>{item}</span>
								</li>
							))}
						</ul>

						<FeatureDialogActions className="pt-2">
							<Button
								type="button"
								variant="primary"
								size="lg"
								className="w-full"
								onClick={() => onOpenChange(false)}
							>
								Get started
							</Button>
							<a
								href={pricingHref()}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex w-full items-center justify-center gap-2 py-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
							>
								View plans
								<ArrowSquareOutIcon className="size-4" aria-hidden />
							</a>
						</FeatureDialogActions>
					</FeatureDialogBody>
				</FeatureDialogPanel>
			</FeatureDialogContent>
		</Dialog>
	);
}
