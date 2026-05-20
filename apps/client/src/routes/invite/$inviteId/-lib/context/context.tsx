import { createContext, useContext } from "react";
import type { InviteController } from "@/src/routes/invite/$inviteId/-lib/hooks/use-invite-controller";

const InviteContext = createContext<InviteController | null>(null);

export function InviteProvider({
	value,
	children,
}: {
	value: InviteController;
	children: React.ReactNode;
}) {
	return (
		<InviteContext.Provider value={value}>{children}</InviteContext.Provider>
	);
}

export function useInvite(): InviteController {
	const context = useContext(InviteContext);
	if (!context) {
		throw new Error("useInvite must be used within InviteProvider");
	}
	return context;
}
