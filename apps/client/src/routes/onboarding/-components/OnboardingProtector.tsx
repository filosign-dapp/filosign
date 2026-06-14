import { useUserProfile } from "@filosign/react/users";
import { isPersonalizationComplete } from "@/src/lib/auth/account-defaults";
import { Loader } from "@/src/lib/components/ui/loader";
import { useThirdweb } from "@/src/lib/web3/use-thirdweb";

/** Auth + profile loading gate for onboarding routes. Redirects live in layout hook. */
export default function OnboardingProtector({
	children,
}: {
	children: React.ReactNode;
}) {
	const { ready, authenticated } = useThirdweb();
	const { data: profile, isPending: profilePending } = useUserProfile({
		enabled: ready && authenticated,
	});

	if (!ready || !authenticated) {
		return <>{children}</>;
	}

	if (profilePending) {
		return <Loader />;
	}

	if (isPersonalizationComplete(profile)) {
		return <Loader />;
	}

	return <>{children}</>;
}
