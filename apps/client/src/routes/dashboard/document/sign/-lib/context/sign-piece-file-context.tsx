import { useFileInfo } from "@filosign/react/files";
import { createContext, type ReactNode, useContext, useMemo } from "react";

type SignPieceFileContextValue = {
	pieceCid: string;
	file: ReturnType<typeof useFileInfo>["data"];
	filePending: boolean;
	fileError: Error | null;
};

const SignPieceFileContext = createContext<SignPieceFileContextValue | null>(
	null,
);

export function SignPieceFileProvider({
	pieceCid,
	children,
}: {
	pieceCid: string;
	children: ReactNode;
}) {
	const {
		data: file,
		isPending: filePending,
		error: fileError,
	} = useFileInfo({
		pieceCid,
		refetchWhileSupplementaryPacketsLocked: true,
	});

	const value = useMemo(
		(): SignPieceFileContextValue => ({
			pieceCid,
			file,
			filePending,
			fileError: fileError ?? null,
		}),
		[pieceCid, file, filePending, fileError],
	);

	return (
		<SignPieceFileContext.Provider value={value}>
			{children}
		</SignPieceFileContext.Provider>
	);
}

export function useOptionalSignPieceFile(): SignPieceFileContextValue | null {
	return useContext(SignPieceFileContext);
}

export function useSignPieceFileContext(): SignPieceFileContextValue {
	const ctx = useOptionalSignPieceFile();
	if (!ctx) {
		throw new Error("useSignPieceFileContext requires SignPieceFileProvider");
	}
	return ctx;
}
