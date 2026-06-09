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

		const walletNorm = signerAddress?.toLowerCase();
		const row = file?.signers?.find(
			(s) => walletNorm && s.wallet.toLowerCase() === walletNorm,
		);
		if (row?.email?.trim()) {
			return normalizePlacementRecipientEmail(row.email);
		}

		const senderWallet = file?.sender?.toLowerCase();
		if (walletNorm && senderWallet === walletNorm) {
			const senderRow = file?.signers?.find(
				(s) => s.wallet.toLowerCase() === senderWallet && s.email?.trim(),
			);
			if (senderRow?.email) {
				return normalizePlacementRecipientEmail(senderRow.email);
			}
		}

		const walletEmail = user?.email?.address?.trim();
		if (walletEmail) return normalizePlacementRecipientEmail(walletEmail);
		return null;
	}, [
		userProfile?.email,
		file?.signers,
		file?.sender,
		signerAddress,
		user?.email?.address,
	]);

	return { user, userProfile, signerAddress, signerPlacementEmail };
}
