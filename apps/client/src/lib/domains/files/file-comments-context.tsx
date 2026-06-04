import {
	type PieceFileDekSource,
	useFileCommentsDecrypted,
} from "@filosign/react/files";
import { createContext, type ReactNode, useContext } from "react";

type FileCommentsContextValue = ReturnType<typeof useFileCommentsDecrypted> & {
	pieceCid: string;
	dekSource: PieceFileDekSource;
};

const FileCommentsContext = createContext<FileCommentsContextValue | null>(
	null,
);

export function FileCommentsProvider(props: {
	pieceCid: string;
	dekSource: PieceFileDekSource;
	fileDek?: Uint8Array;
	enabled?: boolean;
	children: ReactNode;
}) {
	const comments = useFileCommentsDecrypted({
		pieceCid: props.pieceCid,
		dekSource: props.dekSource,
		fileDek: props.fileDek,
		enabled: props.enabled,
	});

	return (
		<FileCommentsContext.Provider
			value={{
				...comments,
				pieceCid: props.pieceCid,
				dekSource: props.dekSource,
			}}
		>
			{props.children}
		</FileCommentsContext.Provider>
	);
}

export function useFileCommentsContext() {
	const ctx = useContext(FileCommentsContext);
	if (!ctx) {
		throw new Error(
			"useFileCommentsContext must be used within FileCommentsProvider",
		);
	}
	return ctx;
}
