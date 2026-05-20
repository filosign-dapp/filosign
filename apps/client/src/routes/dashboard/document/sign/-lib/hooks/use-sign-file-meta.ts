import { useFileInfo } from "@filosign/react/files";
import { useMemo } from "react";
import { defaultChain } from "@/src/constants";

export function useSignFileMeta(pieceCid: string | undefined) {
	const {
		data: file,
		isPending: filePending,
		error: fileError,
	} = useFileInfo({ pieceCid });

	return { file, filePending, fileError };
}

export function useSignSigningMeta(
	file: ReturnType<typeof useSignFileMeta>["file"],
	signerAddress: `0x${string}` | undefined,
) {
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

	const canSign = Boolean(signerAddress && file && !alreadySigned && !isSender);

	return {
		mySignature,
		alreadySigned,
		signedTxExplorerUrl,
		explorerLabel,
		isSender,
		canSign,
	};
}
