import { SignInContent } from "./content";
import { SignInHeroPanel } from "./hero-panel";

export function SignInPage() {
	return (
		<main className="min-h-dvh grid lg:grid-cols-2 bg-background">
			<SignInHeroPanel />
			<SignInContent />
		</main>
	);
}
