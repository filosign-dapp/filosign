import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef } from "react";
import {
	navigatePostAuthDestination,
	type PostAuthDestination,
	postAuthDestinationKey,
} from "@/src/lib/auth/post-auth-destination";

type NavigatePostAuthOnceOptions = {
	replace?: boolean;
	/** When this changes, repeat navigation to the same destination is allowed. */
	resetKey?: string;
};

/** Navigate once per destination key; avoids effect-driven duplicate navigations. */
export function useNavigatePostAuthOnce(options?: { resetKey?: string }) {
	const navigate = useNavigate();
	const lastKeyRef = useRef<string | null>(null);

	useEffect(() => {
		lastKeyRef.current = null;
	}, [options?.resetKey]);

	return useCallback(
		(
			destination: PostAuthDestination,
			navigateOptions?: NavigatePostAuthOnceOptions,
		) => {
			if (destination.type === "pending") return;

			const key = postAuthDestinationKey(destination);
			if (lastKeyRef.current === key) return;
			lastKeyRef.current = key;

			void navigatePostAuthDestination(navigate, destination, {
				replace: navigateOptions?.replace,
			});
		},
		[navigate],
	);
}
