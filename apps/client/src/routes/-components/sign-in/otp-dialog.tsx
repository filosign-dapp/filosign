import { AnimatePresence, motion, SPRING_TOKENS } from "@filosign/motion";
import { UserCircleIcon } from "@phosphor-icons/react";
import { useEffect, useId, useRef } from "react";
import { Button, buttonVariants } from "@/src/lib/components/ui/button";
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
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { OtpInput } from "@/src/lib/components/ui/otp-input";
import { FEATURE_DIALOG_IMAGES } from "@/src/lib/domains/feature-dialog/images";
import { cn } from "@/src/lib/utils";
import type {
	SignInGateController,
	SignInOtpDialogStep,
} from "@/src/routes/-lib/hooks/use-sign-in-gate";

type Props = {
	gate: SignInGateController;
	pricingUrl: string;
};

function stepMeta(
	step: SignInOtpDialogStep,
	planLabel: string | null,
): { badge: string; title: string; description: string } {
	switch (step) {
		case "email":
			return {
				badge: planLabel ?? "Sign in",
				title: "Login",
				description:
					"Enter the email on your Filosign account. We'll send a sign-in code.",
			};
		case "otp":
			return {
				badge: planLabel ?? "Verification",
				title: "Enter verification code",
				description: "Enter the code from your email to continue.",
			};
		case "not_registered":
			return {
				badge: "Get started",
				title: "Account not found",
				description:
					"This email isn't registered yet. Purchase a plan to get started, then finish setup from your email.",
			};
	}
}

function OtpStepDescription({ gate }: { gate: SignInGateController }) {
	if (gate.dialogPlanLabel && gate.effectiveEmail) {
		return (
			<>
				Setting up{" "}
				<span className="font-medium text-foreground">
					{gate.dialogPlanLabel}
				</span>
				. We sent a code to{" "}
				<span className="font-medium text-foreground">
					{gate.effectiveEmail}
				</span>
				.
			</>
		);
	}

	if (gate.effectiveEmail) {
		return (
			<>
				We sent a code to{" "}
				<span className="font-medium text-foreground">
					{gate.effectiveEmail}
				</span>
				.
			</>
		);
	}

	return <>Enter the code from your email.</>;
}

function EmailStepContent({ gate }: { gate: SignInGateController }) {
	const emailInputId = useId();
	const emailInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const frame = window.requestAnimationFrame(() => {
			emailInputRef.current?.focus();
		});
		return () => window.cancelAnimationFrame(frame);
	}, []);

	const submit = () =>
		void (gate.showLoginHome
			? gate.submitLoginEmail()
			: gate.submitEmailAndSendOtp());

	return (
		<motion.div
			key="email"
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -8 }}
			transition={SPRING_TOKENS.snappy}
		>
			<FeatureDialogBody>
				<div className="space-y-2">
					<Label htmlFor={emailInputId}>Email</Label>
					<Input
						ref={emailInputRef}
						id={emailInputId}
						type="email"
						autoComplete="email"
						variant="field"
						value={gate.emailInput}
						onChange={(event) => gate.setEmailInput(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") submit();
						}}
						placeholder="you@example.com"
						disabled={gate.authPending}
					/>
				</div>
				{gate.authError ? (
					<p className="text-sm text-destructive" role="alert">
						{gate.authError}
					</p>
				) : null}
				<Button
					type="button"
					variant="primary"
					size="lg"
					className="w-full"
					disabled={gate.authPending}
					isLoading={gate.authPending}
					onClick={submit}
				>
					Continue
				</Button>
			</FeatureDialogBody>
		</motion.div>
	);
}

function OtpStepContent({ gate }: { gate: SignInGateController }) {
	const otpInputId = useId();

	return (
		<motion.div
			key="otp"
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -8 }}
			transition={SPRING_TOKENS.snappy}
		>
			<FeatureDialogBody>
				<div className="space-y-2">
					<Label htmlFor={otpInputId}>Verification code</Label>
					<OtpInput
						id={otpInputId}
						value={gate.otpCode}
						onChange={gate.setOtpCode}
						disabled={gate.authPending}
						autoFocus
						onSubmit={() => void gate.verifyOtp()}
					/>
				</div>
				{gate.authError ? (
					<p className="text-sm text-destructive" role="alert">
						{gate.authError}
					</p>
				) : null}
				<FeatureDialogActions>
					<Button
						type="button"
						variant="primary"
						size="lg"
						className="w-full"
						disabled={gate.authPending}
						isLoading={gate.authPending}
						onClick={() => void gate.verifyOtp()}
					>
						Verify and continue
					</Button>
					<Button
						type="button"
						variant="outline"
						size="lg"
						className="w-full"
						disabled={gate.authPending}
						onClick={() => void gate.sendOtp()}
					>
						Resend code
					</Button>
				</FeatureDialogActions>
			</FeatureDialogBody>
		</motion.div>
	);
}

function NotRegisteredContent({
	gate,
	pricingUrl,
}: {
	gate: SignInGateController;
	pricingUrl: string;
}) {
	return (
		<motion.div
			key="not_registered"
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -8 }}
			transition={SPRING_TOKENS.snappy}
		>
			<FeatureDialogBody>
				<div className="flex size-12 items-center justify-center rounded-full bg-secondary/20 text-secondary-foreground">
					<UserCircleIcon className="size-6" weight="duotone" aria-hidden />
				</div>
				<FeatureDialogActions>
					<a
						href={pricingUrl}
						target="_blank"
						rel="noopener noreferrer"
						className={cn(
							buttonVariants({ variant: "primary", size: "lg" }),
							"w-full",
						)}
					>
						View plans
					</a>
					<Button
						type="button"
						variant="outline"
						size="lg"
						className="w-full"
						onClick={() => {
							gate.setEmailInput("");
							gate.beginLogin();
						}}
					>
						Try a different email
					</Button>
				</FeatureDialogActions>
			</FeatureDialogBody>
		</motion.div>
	);
}

export function SignInOtpDialog({ gate, pricingUrl }: Props) {
	const titleId = useId();
	const { badge, title, description } = stepMeta(
		gate.otpDialogStep,
		gate.dialogPlanLabel,
	);

	return (
		<Dialog
			open={gate.otpDialogOpen}
			onOpenChange={(open) => {
				if (!open && !gate.authPending) gate.closeOtpDialog();
			}}
		>
			<FeatureDialogContent aria-labelledby={titleId}>
				<FeatureDialogMedia
					src={FEATURE_DIALOG_IMAGES.signInOtpAndInviteUnlockDialog}
					badge={badge}
				/>

				<FeatureDialogPanel>
					<FeatureDialogClose disabled={gate.authPending} />

					<FeatureDialogHeader
						badge={badge}
						title={title}
						titleId={titleId}
						description={
							gate.otpDialogStep === "otp" ? (
								<OtpStepDescription gate={gate} />
							) : (
								description
							)
						}
					/>

					<AnimatePresence mode="wait" initial={false}>
						{gate.otpDialogStep === "email" ? (
							<EmailStepContent gate={gate} />
						) : gate.otpDialogStep === "otp" ? (
							<OtpStepContent gate={gate} />
						) : (
							<NotRegisteredContent gate={gate} pricingUrl={pricingUrl} />
						)}
					</AnimatePresence>
				</FeatureDialogPanel>
			</FeatureDialogContent>
		</Dialog>
	);
}
