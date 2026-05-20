import { SignInContent } from "@/src/routes/-components/sign-in-content";
import { SignInHeroPanel } from "@/src/routes/-components/sign-in-hero-panel";

export function SignInPage() {
	return (
		<main className="min-h-dvh grid lg:grid-cols-2 bg-background">
			<SignInHeroPanel />
			<SignInContent />
		</main>
	);
}
