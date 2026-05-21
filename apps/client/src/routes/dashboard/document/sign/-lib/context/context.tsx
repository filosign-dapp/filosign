import { createContext, useContext, useMemo } from "react";
import type { SignDocumentController } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-controller";

export type SignDocumentContextValue = {
	sign: SignDocumentController;
	pieceCid: string;
	file: NonNullable<SignDocumentController["fileQuery"]["file"]>;
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
	return useMemo(
		() => ({
			pieceCid,
			file,
			fileQuery: sign.fileQuery,
			acknowledge: sign.acknowledge,
		}),
		[pieceCid, file, sign.fileQuery, sign.acknowledge],
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

export function useSignPayments() {
	const { sign } = useSignDocumentContext();
	return sign.payments;
}
