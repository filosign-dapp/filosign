import { createContext, useContext, useMemo } from "react";
import type { SignDocumentController } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-document";

export type SignDocumentContextValue = {
	sign: SignDocumentController;
	pieceCid: string;
	file: SignDocumentController["fileQuery"]["file"];
};

const SignDocumentContext = createContext<SignDocumentContextValue | null>(
	null,
);

export function SignDocumentProvider({
	value,
	children,
}: {
	value: SignDocumentContextValue;
	children: React.ReactNode;
}) {
	return (
		<SignDocumentContext.Provider value={value}>
			{children}
		</SignDocumentContext.Provider>
	);
}

export function useSignDocumentContext(): SignDocumentContextValue {
	const context = useContext(SignDocumentContext);
	if (!context) {
		throw new Error(
			"useSignDocumentContext must be used within SignDocumentProvider",
		);
	}
	return context;
}

export function useSignFile() {
	const { sign, pieceCid, file } = useSignDocumentContext();
	const { filePending, fileError, acknowledgeFile } = sign.fileQuery;
	const { handleAcknowledge } = sign.acknowledge;

	return useMemo(
		() => ({
			pieceCid,
			file,
			fileQuery: {
				file,
				filePending,
				fileError,
				acknowledgeFile,
			},
			acknowledge: { handleAcknowledge },
		}),
		[
			pieceCid,
			file,
			filePending,
			fileError,
			acknowledgeFile,
			handleAcknowledge,
		],
	);
}

export function useSignPlacement() {
	const { sign } = useSignDocumentContext();
	return sign.placement;
}

export function useSignViewer() {
	const { sign } = useSignDocumentContext();
	return sign.viewer;
}

export function useSignSigning() {
	const { sign } = useSignDocumentContext();
	return sign.signing;
}

export function useSignMeta() {
	const { sign } = useSignDocumentContext();
	return sign.meta;
}

export function useSignCompliance() {
	const { sign } = useSignDocumentContext();
	return sign.compliance;
}

export function useSignColdShare() {
	const { sign } = useSignDocumentContext();
	return sign.coldShare;
}

export function useSignRefs() {
	const { sign } = useSignDocumentContext();
	return sign.refs;
}

export function useSignIdentity() {
	const { sign } = useSignDocumentContext();
	return sign.identity;
}

export function useSignNavigation() {
	const { sign } = useSignDocumentContext();
	return sign.navigation;
}

export function useSignSettlements() {
	const { sign } = useSignDocumentContext();
	return sign.settlements;
}

export function useSignPlacementSlice() {
	return useSignPlacement();
}

export function useSignViewerSlice() {
	return useSignViewer();
}

export function useSignIdentitySlice() {
	return useSignIdentity();
}

export function useSignMetaSlice() {
	return useSignMeta();
}

export function useSignSigningSlice() {
	return useSignSigning();
}

export function useSignFileSlice() {
	return useSignFile();
}

export function useSignSettlementsSlice() {
	return useSignSettlements();
}

export function useSignComplianceSlice() {
	return useSignCompliance();
}

export function useSignNavigationSlice() {
	return useSignNavigation();
}

export function useSignColdShareSlice() {
	return useSignColdShare();
}

export function useSignRefsSlice() {
	return useSignRefs();
}
