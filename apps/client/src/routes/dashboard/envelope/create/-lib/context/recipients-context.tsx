import { createContext, useContext } from "react";
import type { RecipientsController } from "@/src/routes/dashboard/envelope/create/-lib/hooks/use-recipients-controller";
import { useRecipientsController } from "@/src/routes/dashboard/envelope/create/-lib/hooks/use-recipients-controller";

const RecipientsContext = createContext<RecipientsController | null>(null);

export function RecipientsProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const value = useRecipientsController();
	return (
		<RecipientsContext.Provider value={value}>
			{children}
		</RecipientsContext.Provider>
	);
}

export function useRecipientsContext(): RecipientsController {
	const context = useContext(RecipientsContext);
	if (!context) {
		throw new Error(
			"useRecipientsContext must be used within RecipientsProvider",
		);
	}
	return context;
}
