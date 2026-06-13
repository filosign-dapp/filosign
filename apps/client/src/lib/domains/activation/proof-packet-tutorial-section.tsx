import type { EvaluatedActivationStep } from "@filosign/shared";
import { ArrowSquareOutIcon, SealCheckIcon } from "@phosphor-icons/react";
import { BackdropImage } from "@/src/lib/components/app/chrome/page-backdrop";
import { Button, buttonVariants } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/loader";
import { DOCS_LINKS } from "@/src/lib/docs/links";
import { cn } from "@/src/lib/utils";

const PROOF_TUTORIAL_BACKDROP = "/images/stock_3.webp";

type ProofPacketTutorialSectionProps = {
	step: EvaluatedActivationStep;
	isMarking: boolean;
	onMarkProofLearned: () => void;
	onTrackStep?: (stepId: EvaluatedActivationStep["id"]) => void;
	className?: string;
};

export function ProofPacketTutorialSection({
	step,
	isMarking,
	onMarkProofLearned,
	onTrackStep,
	className,
}: ProofPacketTutorialSectionProps) {
	const docsHref = DOCS_LINKS.completionPacket();
	const verifyHref = DOCS_LINKS.verifyProofPacket();

	return (
		<section
			className={cn(
				"relative overflow-hidden rounded-large border border-border/60 bg-card shadow-sm ring-1 ring-foreground/5",
				className,
			)}
		>
			<BackdropImage src={PROOF_TUTORIAL_BACKDROP} />
			<div className="relative z-10 space-y-5 p-6 md:p-8">
				<div className="flex items-start gap-3">
					<div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/80 text-primary">
						<SealCheckIcon className="size-5" weight="duotone" aria-hidden />
					</div>
					<div className="min-w-0 space-y-2">
						<h2 className="font-manrope text-xl tracking-tight text-foreground">
							{step.title}
						</h2>
						<p className="text-sm leading-relaxed text-muted-foreground">
							After signing, Filosign packages signatures, field completions,
							and audit data into exports you can share with finance, legal, or
							counterparties.
						</p>
					</div>
				</div>

				<ul className="space-y-2 text-sm text-muted-foreground">
					<li>
						<span className="font-medium text-foreground">Proof report</span> -
						human-readable PDF summary of who signed and when.
					</li>
					<li>
						<span className="font-medium text-foreground">Proof packet</span> -
						ZIP with the document, compliance bundle, and verification metadata.
					</li>
					<li>
						Anyone can verify a packet independently using Filosign&apos;s open
						verifier - no account required.
					</li>
				</ul>

				<div className="flex flex-wrap items-center gap-2.5 pt-1">
					<a
						href={docsHref}
						target="_blank"
						rel="noopener noreferrer"
						className={buttonVariants({
							variant: "primary",
							size: "sm",
							className: "rounded-full gap-1.5",
						})}
						onClick={() => onTrackStep?.(step.id)}
					>
						Read the guide
						<ArrowSquareOutIcon className="size-3.5" aria-hidden />
					</a>
					<a
						href={verifyHref}
						target="_blank"
						rel="noopener noreferrer"
						className={buttonVariants({
							variant: "outline",
							size: "sm",
							className: "rounded-full gap-1.5",
						})}
						onClick={() => onTrackStep?.(step.id)}
					>
						Open verifier
						<ArrowSquareOutIcon className="size-3.5" aria-hidden />
					</a>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="rounded-full"
						disabled={isMarking}
						onClick={() => {
							onTrackStep?.(step.id);
							onMarkProofLearned();
						}}
					>
						{isMarking ? (
							<span className="inline-flex items-center gap-2">
								<InlineLoader size="sm" />
								Saving
							</span>
						) : (
							"Mark as learned"
						)}
					</Button>
				</div>
			</div>
		</section>
	);
}
