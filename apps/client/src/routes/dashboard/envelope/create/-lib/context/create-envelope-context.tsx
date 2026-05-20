import { createContext, useContext } from "react";
import type { CreateEnvelopeController } from "@/src/routes/dashboard/envelope/create/-lib/hooks/use-create-controller";

const CreateEnvelopeContext = createContext<CreateEnvelopeController | null>(
	null,
);

export function CreateEnvelopeProvider({
	value,
	children,
}: {
	value: CreateEnvelopeController;
	children: React.ReactNode;
}) {
	return (
		<CreateEnvelopeContext.Provider value={value}>
			{children}
		</CreateEnvelopeContext.Provider>
	);
}

export function useCreateEnvelope(): CreateEnvelopeController {
	const context = useContext(CreateEnvelopeContext);
	if (!context) {
		throw new Error(
			"useCreateEnvelope must be used within CreateEnvelopeProvider",
		);
	}
	return context;
}
