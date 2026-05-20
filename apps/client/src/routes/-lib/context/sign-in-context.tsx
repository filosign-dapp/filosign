import { createContext, useContext } from "react";
import type { SignInController } from "@/src/routes/-lib/hooks/use-sign-in-controller";

const SignInContext = createContext<SignInController | null>(null);

export function SignInProvider({
	value,
	children,
}: {
	value: SignInController;
	children: React.ReactNode;
}) {
	return (
		<SignInContext.Provider value={value}>{children}</SignInContext.Provider>
	);
}

export function useSignIn(): SignInController {
	const context = useContext(SignInContext);
	if (!context) {
		throw new Error("useSignIn must be used within SignInProvider");
	}
	return context;
}
