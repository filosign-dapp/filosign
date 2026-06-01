import { useFileInfo } from "@filosign/react/files";
import { useUserProfile } from "@filosign/react/users";
import {
	normalizePlacementRecipientEmail,
	zPlacementManifest,
} from "@filosign/shared";
import { useMemo } from "react";
import { defaultChain } from "@/src/constants";
import { useOptionalSignPieceFile } from "@/src/routes/dashboard/document/sign/-lib/context/sign-piece-file-context";

export function useSignFileMeta(pieceCid: string | undefined) {
	const shared = useOptionalSignPieceFile();
	const useShared = Boolean(shared && pieceCid && shared.pieceCid === pieceCid);

	const {
		data: file,
		isPending: filePending,
		error: fileError,
	} = useFileInfo({ pieceCid: useShared ? undefined : pieceCid });

	if (useShared && shared) {
		return {
			file: shared.file,
			filePending: shared.filePending,
			fileError: shared.fileError,
		};
	}

	return { file, filePending, fileError };
}

export function useSignSigningMeta(
	file: ReturnType<typeof useSignFileMeta>["file"],
	signerAddress: `0x${string}` | undefined,
) {
	const { data: userProfile } = useUserProfile();

	const mySignature = useMemo(() => {
		if (!signerAddress || !file?.signatures?.length) return undefined;
		return file.signatures.find(
			(s) => s.signer.toLowerCase() === signerAddress.toLowerCase(),
		);
	}, [file, signerAddress]);

	const alreadySigned = Boolean(mySignature);

	const signedTxExplorerUrl = useMemo(() => {
		if (!mySignature?.onchainTxHash) return null;
		const base = defaultChain.blockExplorers?.default?.url;
		if (!base) return null;
		return `${base}/tx/${mySignature.onchainTxHash}` as const;
	}, [mySignature]);

	const explorerLabel =
		defaultChain.blockExplorers?.default?.name ?? "Block explorer";

	const isSender = Boolean(
		signerAddress &&
			file?.sender &&
			signerAddress.toLowerCase() === file.sender.toLowerCase(),
	);

	const senderHasAssignedFields = useMemo(() => {
		if (!isSender || file?.placementManifest == null) return false;
		const parsed = zPlacementManifest.safeParse(file.placementManifest);
		if (!parsed.success) return false;
		const profileEmail = userProfile?.email?.trim();
		if (!profileEmail) return false;
		const normalized = normalizePlacementRecipientEmail(profileEmail);
		return parsed.data.fields.some(
			(field) => field.assignedRecipientEmail === normalized,
		);
	}, [isSender, file?.placementManifest, userProfile?.email]);

	const serverCanSign = file?.participantAccess?.canSign;
	const canSign = Boolean(
		signerAddress &&
			file &&
			!alreadySigned &&
			(serverCanSign !== undefined
				? serverCanSign
				: !isSender || senderHasAssignedFields),
	);

	return {
		mySignature,
		alreadySigned,
		signedTxExplorerUrl,
		explorerLabel,
		isSender,
		canSign,
	};
}
