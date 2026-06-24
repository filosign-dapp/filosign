import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader } from "@/src/lib/components/ui/loader";
import { hydrationMark } from "@/src/lib/utils/hydration-lifecycle";
import { stashReturnTo } from "./return-to";
import { ReturnToHandler } from "./return-to-handler";
import { useSessionGateDerived, useSessionGateFlags } from "./use-session-gate";

interface SessionProtectorProps {
	children: React.ReactNode;
}

/** Session gate without workspace setup requirement (admin, etc.). */
export function SessionProtector({ children }: SessionProtectorProps) {
	const navigate = useNavigate();
	const flags = useSessionGateFlags();
	const derived = useSessionGateDerived(flags);

	useEffect(() => {
		if (derived.shouldRedirectToSignIn) {
			stashReturnTo();
			const params = new URLSearchParams(window.location.search);
			const upgrade = params.get("upgrade") || undefined;
			const interval = params.get("interval") || undefined;

			void navigate({
				to: "/",
				search: (prev) => ({
					...prev,
					...(upgrade ? { upgrade } : {}),
					...(interval ? { interval } : {}),
				}),
			});
		}
	}, [derived.shouldRedirectToSignIn, navigate]);

	const shouldShowLoader = derived.shouldShowBootstrapLoader;

	useEffect(() => {
		hydrationMark("session-protector:ui-state", {
			shouldShowLoader,
			filosignSessionActive: derived.filosignSessionActive,
			shouldRedirectToSignIn: derived.shouldRedirectToSignIn,
			shouldShowBootstrapLoader: derived.shouldShowBootstrapLoader,
		});
	}, [
		shouldShowLoader,
		derived.filosignSessionActive,
		derived.shouldRedirectToSignIn,
		derived.shouldShowBootstrapLoader,
	]);

	if (shouldShowLoader || !derived.filosignSessionActive) {
		return <Loader />;
	}

	return (
		<>
			<ReturnToHandler />
			{children}
		</>
	);
}
