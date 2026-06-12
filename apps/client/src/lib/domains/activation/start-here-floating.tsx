import { MotionReveal } from "@filosign/motion";
import type { EvaluatedActivationStep } from "@filosign/shared";
import { BASIC_ONBOARDING_STEP_IDS } from "@filosign/shared";
import {
	ArrowSquareOutIcon,
	CheckCircleIcon,
	CircleIcon,
} from "@phosphor-icons/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useMemo } from "react";
import { BackdropImage } from "@/src/lib/components/app/chrome/page-backdrop";
import { Button, buttonVariants } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { useStartHereController } from "@/src/lib/domains/activation/use-start-here-controller";
import { useStartNewEnvelope } from "@/src/lib/domains/drafts";
import { cn } from "@/src/lib/utils";

const START_HERE_BODY_BACKDROP = "/images/stock_3.webp";
const START_HERE_HEADER_IMAGE = "/sign-bg.webp";

function primaryActionLabel(step: EvaluatedActivationStep): string {
	switch (step.id) {
		case "confirm_signature":
			return "Create signature";
		case "sign_practice_agreement":
			return "Sign agreement";
		case "send_first_envelope":
			return "Send envelope";
		default:
			return "Continue";
	}
}

function StartHereCardShell({
	children,
	titleId,
}: {
	children: ReactNode;
	titleId: string;
}) {
	return (
		<MotionReveal
			preset="smooth"
			delay={0.15}
			onlyOnce
			className="pointer-events-none fixed bottom-6 right-6 z-40 w-min(100vw-2rem,96)"
			id="start-here-floating"
		>
			<article
				className="pointer-events-auto overflow-hidden rounded-large border border-border/50 bg-card text-card-foreground shadow-2xl ring-1 ring-foreground/5"
				aria-labelledby={titleId}
			>
				<div className="relative h-36 overflow-hidden">
					<img
						src={START_HERE_HEADER_IMAGE}
						alt=""
						className="absolute inset-0 size-full object-cover object-center"
					/>
					<div
						className="absolute inset-0 bg-linear-to-b from-black/10 via-transparent to-card opacity-30"
						aria-hidden
					/>
				</div>
				<div className="relative overflow-hidden">
					<BackdropImage src={START_HERE_BODY_BACKDROP} />
					<div className="relative z-10">{children}</div>
				</div>
			</article>
		</MotionReveal>
	);
}

export function StartHereFloating() {
	const navigate = useNavigate();
	const startNewEnvelope = useStartNewEnvelope();
	const {
		evaluated,
		isLoading,
		showChecklist,
		showNextSteps,
		checklistDismissed,
		isProvisioning,
		nextStepActions,
		dismissChecklist,
		dismissNextSteps,
		restoreChecklist,
		openSignPractice,
		trackStepNavigation,
	} = useStartHereController();

	const basicSteps = useMemo(() => {
		if (!evaluated) return [];
		return evaluated.steps.filter((step) =>
			(BASIC_ONBOARDING_STEP_IDS as readonly string[]).includes(step.id),
		);
	}, [evaluated]);

	const nextStep = basicSteps.find((step) => !step.completed) ?? null;
	const completedCount = basicSteps.filter((step) => step.completed).length;

	const runPrimaryAction = () => {
		if (!nextStep) return;
		trackStepNavigation(nextStep.id);

		switch (nextStep.id) {
			case "sign_practice_agreement":
				void openSignPractice();
				break;
			case "send_first_envelope":
				startNewEnvelope();
				break;
			case "confirm_signature":
				void navigate({ to: "/dashboard/signature/create" });
				break;
		}
	};

	if (isLoading || !evaluated) return null;

	if (checklistDismissed && !evaluated.basicOnboardingComplete) {
		return (
			<div className="pointer-events-none fixed bottom-6 right-6 z-40">
				<Button
					type="button"
					size="sm"
					variant="secondary"
					className="pointer-events-auto rounded-full px-4 shadow-lg"
					onClick={restoreChecklist}
				>
					Get started
				</Button>
			</div>
		);
	}

	if (showNextSteps && nextStepActions) {
		const {
			advancedStepTeasers,
			advancedStepCount,
			sandboxHref,
			isSandboxDeployment,
			sandboxNote,
			tutorialsHref,
		} = nextStepActions;

		return (
			<StartHereCardShell titleId="start-here-next-steps-title">
				<div className="px-8 pb-8 pt-6 text-center">
					<p className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
						Starter steps complete
					</p>
					<h2
						id="start-here-next-steps-title"
						className="mt-2 font-manrope text-2xl text-foreground"
					>
						You&apos;re ready to go
					</h2>
					<p className="mx-auto mt-2 max-w-72 text-sm leading-relaxed text-muted-foreground">
						{advancedStepCount > 0
							? `${advancedStepCount} more tutorial${advancedStepCount === 1 ? "" : "s"} cover advanced features for your plan.`
							: "Explore tutorials to learn advanced workflows when your plan unlocks them."}
					</p>

					{advancedStepTeasers.length > 0 ? (
						<ul className="mx-auto mt-5 flex w-full max-w-70 flex-col gap-2 text-left">
							{advancedStepTeasers.map((step) => (
								<li
									key={step.id}
									className="flex items-start gap-2 text-sm text-muted-foreground"
								>
									<CircleIcon
										className="mt-0.5 size-3.5 shrink-0 text-primary/70"
										weight="fill"
										aria-hidden
									/>
									<span>{step.title}</span>
								</li>
							))}
						</ul>
					) : null}

					{isSandboxDeployment && sandboxNote ? (
						<p className="mx-auto mt-4 max-w-72 text-xs leading-relaxed text-muted-foreground">
							{sandboxNote}
						</p>
					) : null}

					<div className="mt-7 flex flex-col items-center gap-2.5">
						<Link
							to={tutorialsHref}
							className={buttonVariants({
								variant: "primary",
								size: "sm",
								className: "min-w-44 rounded-full",
							})}
							onClick={() => trackStepNavigation("learn_proof_packets")}
						>
							Explore tutorials
						</Link>
						{sandboxHref ? (
							<a
								href={sandboxHref.href}
								target="_blank"
								rel="noopener noreferrer"
								className={buttonVariants({
									variant: "outline",
									size: "sm",
									className: "min-w-44 rounded-full gap-1.5",
								})}
								onClick={() => trackStepNavigation("try_sandbox_workflow")}
							>
								Open sandbox
								<ArrowSquareOutIcon className="size-3.5" aria-hidden />
							</a>
						) : null}
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="mt-1 h-auto rounded-full px-4 text-xs text-muted-foreground"
							onClick={dismissNextSteps}
						>
							Got it
						</Button>
					</div>
				</div>
			</StartHereCardShell>
		);
	}

	if (!showChecklist) return null;

	return (
		<StartHereCardShell titleId="start-here-floating-title">
			<div className="px-8 pb-8 pt-6 text-center">
				<p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
					{completedCount}/{basicSteps.length} complete
				</p>
				<h2
					id="start-here-floating-title"
					className="mt-2 font-manrope text-2xl text-foreground"
				>
					Get started with filosign
				</h2>
				<p className="mx-auto mt-2 max-w-72 text-sm leading-relaxed text-muted-foreground">
					Three quick steps to sign, send, and track your first envelope.
				</p>

				<ul className="mx-auto mt-6 flex w-full max-w-70 flex-col gap-2.5">
					{basicSteps.map((step) => (
						<li
							key={step.id}
							className="flex items-center justify-start gap-2.5"
						>
							{step.completed ? (
								<CheckCircleIcon
									className="size-4 shrink-0 text-primary"
									weight="fill"
									aria-hidden
								/>
							) : (
								<CircleIcon
									className="size-4 shrink-0 text-muted-foreground/70"
									aria-hidden
								/>
							)}
							<span
								className={cn(
									"text-sm leading-snug",
									step.completed
										? "text-muted-foreground line-through"
										: "text-foreground",
								)}
							>
								{step.title}
							</span>
						</li>
					))}
				</ul>

				<div className="mt-7 flex items-center justify-center gap-3">
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="min-w-30 rounded-full"
						onClick={dismissChecklist}
					>
						Set up later
					</Button>
					<Button
						type="button"
						variant="primary"
						size="sm"
						className="min-w-30 rounded-full"
						disabled={!nextStep || isProvisioning}
						onClick={runPrimaryAction}
					>
						{isProvisioning ? (
							<span className="inline-flex items-center gap-2">
								<InlineLoader size="sm" />
								Preparing
							</span>
						) : nextStep ? (
							primaryActionLabel(nextStep)
						) : (
							"All done"
						)}
					</Button>
				</div>
			</div>
		</StartHereCardShell>
	);
}
