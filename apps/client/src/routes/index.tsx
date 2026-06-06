import { createFileRoute } from "@tanstack/react-router";
import { coldInviteEntrySearchSchema } from "@/src/lib/domains/invites/cold-invite-search";
import { SignInPage } from "@/src/routes/-components/sign-in/page";
import { SignInProvider } from "@/src/routes/-lib/context/sign-in-context";
import { useSignInController } from "@/src/routes/-lib/hooks/use-sign-in-controller";

function SignInRoutePage() {
	const controller = useSignInController();
	return (
		<SignInProvider value={controller}>
			<SignInPage />
		</SignInProvider>
	);
}

export const Route = createFileRoute("/")({
	validateSearch: coldInviteEntrySearchSchema,
	component: SignInRoutePage,
});
