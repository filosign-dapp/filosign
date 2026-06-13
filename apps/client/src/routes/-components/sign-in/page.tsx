import { PageBackdrop } from "@/src/lib/components/app/chrome/page-backdrop";
import { SignInContent } from "./content";
import { SignInHeroPanel } from "./hero-panel";

const SIGN_IN_CONTENT_BACKDROP = "/images/ww/stock_59.webp";

export function SignInPage() {
	return (
		<main className="relative isolate min-h-dvh grid lg:grid-cols-2">
			<SignInHeroPanel />
			<div className="relative h-full min-h-dvh overflow-hidden">
				<PageBackdrop src={SIGN_IN_CONTENT_BACKDROP} />
				<div className="relative z-10 flex h-full min-h-dvh flex-col justify-center">
					<SignInContent />
				</div>
			</div>
		</main>
	);
}
