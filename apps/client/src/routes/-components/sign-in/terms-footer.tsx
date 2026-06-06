import env from "@/src/env";

export function SignInTermsFooter() {
	return (
		<p className="text-center text-xs text-muted-foreground">
			By continuing you agree to Filosign&apos;s{" "}
			<a
				href={`${env.VITE_ASTRO_URL.replace(/\/$/, "")}/terms`}
				target="_blank"
				rel="noopener noreferrer"
				className="underline underline-offset-2 hover:text-foreground"
			>
				Terms of Service
			</a>{" "}
			and{" "}
			<a
				href={`${env.VITE_ASTRO_URL.replace(/\/$/, "")}/privacy`}
				target="_blank"
				rel="noopener noreferrer"
				className="underline underline-offset-2 hover:text-foreground"
			>
				Privacy Policy
			</a>
			.
		</p>
	);
}
