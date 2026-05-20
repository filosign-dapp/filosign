import { createContext, useContext } from "react";
import type { SignatureCreateController } from "@/src/routes/dashboard/signature/create/-lib/hooks/use-signature-create-controller";

const SignatureCreateContext = createContext<SignatureCreateController | null>(
	null,
);

export function SignatureCreateProvider({
	value,
	children,
}: {
	value: SignatureCreateController;
	children: React.ReactNode;
}) {
	return (
		<SignatureCreateContext.Provider value={value}>
			{children}
		</SignatureCreateContext.Provider>
	);
}

export function useSignatureCreate(): SignatureCreateController {
	const context = useContext(SignatureCreateContext);
	if (!context) {
		throw new Error(
			"useSignatureCreate must be used within SignatureCreateProvider",
		);
	}
	return context;
}
