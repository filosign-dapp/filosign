import type { useFileInfo } from "@filosign/react/files";
import { useUserProfile } from "@filosign/react/users";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { useMemo } from "react";
import { useThirdweb } from "@/src/lib/web3/use-thirdweb";

type SignFile = NonNullable<ReturnType<typeof useFileInfo>["data"]>;

export function useSignIdentity(file: SignFile | undefined) {
	const { user } = useThirdweb();
	const { data: userProfile } = useUserProfile();
	const signerAddress = user?.wallet?.address as `0x${string}` | undefined;

	const signerPlacementEmail = useMemo(() => {
		const fromProfile = userProfile?.email?.trim();
		if (fromProfile) return normalizePlacementRecipientEmail(fromProfile);
		const row = file?.signers?.find((s) => {
			if (typeof s === "string" || !signerAddress) return false;
			return s.wallet.toLowerCase() === signerAddress.toLowerCase();
		});
		if (row && typeof row === "object" && row.email?.trim()) {
			return normalizePlacementRecipientEmail(row.email);
		}
		const walletEmail = user?.email?.address?.trim();
		if (walletEmail) return normalizePlacementRecipientEmail(walletEmail);
		return null;
	}, [userProfile?.email, file?.signers, signerAddress, user?.email?.address]);

	return { user, userProfile, signerAddress, signerPlacementEmail };
}
