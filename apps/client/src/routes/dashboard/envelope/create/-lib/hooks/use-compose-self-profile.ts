import { useFilosignContext } from "@filosign/react";
import { useUserProfile } from "@filosign/react/users";
import { useMemo } from "react";
import type { SelfProfileForRoster } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placement-assignees";

export function useComposeSelfProfile(): SelfProfileForRoster {
	const { data: selfProfile } = useUserProfile();
	const { wallet } = useFilosignContext();

	return useMemo(
		() => ({
			email: selfProfile?.email,
			walletAddress:
				wallet?.account.address ?? selfProfile?.walletAddress ?? null,
			firstName: selfProfile?.firstName,
			lastName: selfProfile?.lastName,
		}),
		[
			selfProfile?.email,
			selfProfile?.walletAddress,
			selfProfile?.firstName,
			selfProfile?.lastName,
			wallet?.account.address,
		],
	);
}
