import { useEntitlements } from "@filosign/react/billing";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import env from "@/src/env";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import Logo from "./Logo";

export type UpgradePlanLimitReason =
	| "documents.sent.monthly"
	| "envelope.recipients.max";

const COPY: Record<
	UpgradePlanLimitReason,
	{ title: string; description: string }
> = {
	"documents.sent.monthly": {
		title: "Monthly document limit reached",
		description:
			"You've exhausted your document quota for this month. Upgrade to continue sending envelopes.",
	},
	"envelope.recipients.max": {
		title: "Recipient limit reached",
		description:
			"You've reached the maximum recipients per envelope on your current plan. Upgrade to add more recipients.",
	},
};

function pricingHref(): string {
	const base = env.VITE_ASTRO_URL.replace(/\/$/, "");
	return `${base}/pricing`;
}

export type UpgradePlanDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	reason: UpgradePlanLimitReason;
};

export function UpgradePlanDialog({
	open,
	onOpenChange,
	reason,
}: UpgradePlanDialogProps) {
	const { data } = useEntitlements();
	const copy = COPY[reason];
	const planLabel = data?.planId ?? "free";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="gap-0 overflow-hidden p-0 sm:max-w-md"
				showCloseButton
			>
				<div className="border-b border-border/60 bg-muted/20 px-6 py-5">
					<DialogHeader className="gap-3 space-y-0">
						<div className="flex items-center gap-3">
							<Logo iconOnly animatedLogo={false} noHref />
							<div className="min-w-0 space-y-1">
								<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
									{planLabel} plan
								</p>
								<DialogTitle className="text-lg leading-snug">
									{copy.title}
								</DialogTitle>
							</div>
						</div>
						<DialogDescription className="text-sm leading-relaxed">
							{copy.description}
						</DialogDescription>
					</DialogHeader>
				</div>

				<div className="space-y-1 px-6 py-5">
					<p className="text-sm font-medium text-foreground">
						Upgrade to continue
					</p>
					<p className="text-xs leading-relaxed text-muted-foreground">
						Compare plans and unlock higher monthly limits on the Filosign
						pricing page.
					</p>
				</div>

				<DialogFooter className="border-t border-border/60 bg-muted/10 px-6 py-4 sm:justify-end">
					<Button
						type="button"
						variant="outline"
						className="border-border/60 shadow-none"
						onClick={() => onOpenChange(false)}
					>
						Close
					</Button>
					<Button
						type="button"
						variant="primary"
						className="gap-1.5"
						onClick={() => {
							window.open(pricingHref(), "_blank", "noopener,noreferrer");
							onOpenChange(false);
						}}
					>
						Upgrade
						<ArrowSquareOutIcon className="size-4" weight="bold" aria-hidden />
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
