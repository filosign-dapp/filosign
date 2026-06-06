export function signInGatedCardSubtitle(args: {
	isReturningUser: boolean;
	isAdminBootstrap: boolean;
	isPaidSetup: boolean;
	planLabel: string | null;
	effectiveEmail: string;
	needsEmailInput: boolean;
}) {
	if (args.isAdminBootstrap && args.effectiveEmail) {
		return (
			<>
				Setting up{" "}
				<span className="font-medium text-foreground">
					{args.planLabel ?? "Teams Pro"}
				</span>
				. We&apos;ll send a verification code to{" "}
				<span className="font-medium text-foreground">
					{args.effectiveEmail}
				</span>
				.
			</>
		);
	}
	if (args.isReturningUser && args.effectiveEmail) {
		return (
			<>
				We&apos;ll send a sign-in code to{" "}
				<span className="font-medium text-foreground">
					{args.effectiveEmail}
				</span>
				.
			</>
		);
	}
	if (args.isPaidSetup && args.planLabel && args.effectiveEmail) {
		return (
			<>
				Your{" "}
				<span className="font-medium text-foreground">{args.planLabel}</span>{" "}
				subscription is active. We emailed setup instructions to{" "}
				<span className="font-medium text-foreground">
					{args.effectiveEmail}
				</span>
				. Click below to verify your email and finish sign up.
			</>
		);
	}
	if (args.planLabel && args.effectiveEmail) {
		return (
			<>
				Setting up{" "}
				<span className="font-medium text-foreground">{args.planLabel}</span>.
				We&apos;ll send a verification code to{" "}
				<span className="font-medium text-foreground">
					{args.effectiveEmail}
				</span>
				.
			</>
		);
	}
	if (args.planLabel) {
		return (
			<>
				Setting up{" "}
				<span className="font-medium text-foreground">{args.planLabel}</span>.
				Click below and we&apos;ll email you a verification code.
			</>
		);
	}
	if (args.effectiveEmail) {
		return (
			<>
				We&apos;ll send a verification code to{" "}
				<span className="font-medium text-foreground">
					{args.effectiveEmail}
				</span>
				.
			</>
		);
	}
	if (args.needsEmailInput) {
		return "Click below to enter your email and receive a verification code.";
	}
	return "Click below and we will email you a verification code.";
}
