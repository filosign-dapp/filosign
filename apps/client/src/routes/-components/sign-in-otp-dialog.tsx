import { useEffect, useRef } from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import type { SignInGateController } from "@/src/routes/-lib/hooks/use-sign-in-gate";

type Props = {
	gate: SignInGateController;
	pricingUrl: string;
};

export function SignInOtpDialog({ gate, pricingUrl }: Props) {
	const otpInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!gate.otpDialogOpen || gate.otpDialogStep !== "otp") return;
		const id = window.requestAnimationFrame(() => {
			otpInputRef.current?.focus();
		});
		return () => window.cancelAnimationFrame(id);
	}, [gate.otpDialogOpen, gate.otpDialogStep]);

	return (
		<Dialog
			open={gate.otpDialogOpen}
			onOpenChange={(open) => {
				if (!open && !gate.authPending) gate.closeOtpDialog();
			}}
		>
			<DialogContent
				className="sm:max-w-md"
				showCloseButton={!gate.authPending}
			>
				{gate.otpDialogStep === "not_registered" ? (
					<>
						<DialogHeader>
							<DialogTitle>Account not found</DialogTitle>
							<DialogDescription>
								This email isn&apos;t registered yet. Purchase a plan to get
								started, then finish setup from your email.
							</DialogDescription>
						</DialogHeader>
						<div className="flex flex-col gap-3">
							<a
								href={pricingUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
							>
								View plans
							</a>
							<Button
								type="button"
								variant="ghost"
								className="w-full"
								onClick={() => {
									gate.setEmailInput("");
									gate.beginLogin();
								}}
							>
								Try a different email
							</Button>
						</div>
					</>
				) : gate.otpDialogStep === "email" ? (
					<>
						<DialogHeader>
							<DialogTitle>Login</DialogTitle>
							<DialogDescription>
								Enter the email on your Filosign account. We&apos;ll send a
								sign-in code.
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-2">
							<Label htmlFor="sign-in-gate-email">Email</Label>
							<Input
								id="sign-in-gate-email"
								type="email"
								autoComplete="email"
								value={gate.emailInput}
								onChange={(e) => gate.setEmailInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										void (gate.showLoginHome
											? gate.submitLoginEmail()
											: gate.submitEmailAndSendOtp());
									}
								}}
								placeholder="you@example.com"
							/>
						</div>
						{gate.authError ? (
							<p className="text-sm text-destructive">{gate.authError}</p>
						) : null}
						<Button
							type="button"
							variant="primary"
							className="w-full"
							disabled={gate.authPending}
							isLoading={gate.authPending}
							onClick={() =>
								void (gate.showLoginHome
									? gate.submitLoginEmail()
									: gate.submitEmailAndSendOtp())
							}
						>
							Continue
						</Button>
					</>
				) : (
					<>
						<DialogHeader>
							<DialogTitle>Enter verification code</DialogTitle>
							<DialogDescription>
								{gate.dialogPlanLabel && gate.effectiveEmail ? (
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
								) : gate.effectiveEmail ? (
									<>
										We sent a code to{" "}
										<span className="font-medium text-foreground">
											{gate.effectiveEmail}
										</span>
										.
									</>
								) : (
									"Enter the code from your email."
								)}
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-2">
							<Label htmlFor="sign-in-gate-otp">Verification code</Label>
							<Input
								ref={otpInputRef}
								id="sign-in-gate-otp"
								inputMode="numeric"
								autoComplete="one-time-code"
								value={gate.otpCode}
								onChange={(e) => gate.setOtpCode(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										void gate.verifyOtp();
									}
								}}
								placeholder="6-digit code"
							/>
						</div>
						{gate.authError ? (
							<p className="text-sm text-destructive">{gate.authError}</p>
						) : null}
						<Button
							type="button"
							variant="primary"
							className="w-full"
							disabled={gate.authPending}
							isLoading={gate.authPending}
							onClick={() => void gate.verifyOtp()}
						>
							Verify and continue
						</Button>
						<Button
							type="button"
							variant="ghost"
							className="w-full"
							disabled={gate.authPending}
							onClick={() => void gate.sendOtp()}
						>
							Resend code
						</Button>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
