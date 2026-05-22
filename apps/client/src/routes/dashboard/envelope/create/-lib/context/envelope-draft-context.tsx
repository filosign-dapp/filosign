import { createContext, useContext } from "react";
import type { PaymentAttachmentDraft } from "@/src/routes/dashboard/envelope/create/-lib/types/payment-attachment";
import type { EnvelopeForm } from "../types";

type EnvelopeDraftContextValue = {
	documentsField: {
		value: EnvelopeForm["documents"];
		onChange: (documents: EnvelopeForm["documents"]) => void;
		error?: string;
		showError?: boolean;
	};
	recipientsField: {
		value: EnvelopeForm["recipients"];
		onChange: (recipients: EnvelopeForm["recipients"]) => void;
		error?: string;
		showError?: boolean;
	};
	paymentDraftsField: {
		value: PaymentAttachmentDraft[];
		onChange: (drafts: PaymentAttachmentDraft[]) => void;
	};
};

const EnvelopeDraftContext = createContext<EnvelopeDraftContextValue | null>(
	null,
);

export function EnvelopeDraftProvider({
	value,
	children,
}: {
	value: EnvelopeDraftContextValue;
	children: React.ReactNode;
}) {
	return (
		<EnvelopeDraftContext.Provider value={value}>
			{children}
		</EnvelopeDraftContext.Provider>
	);
}

export function useEnvelopeDraft() {
	const context = useContext(EnvelopeDraftContext);
	if (!context) {
		throw new Error(
			"useEnvelopeDraft must be used within EnvelopeDraftProvider",
		);
	}
	return context;
}

export function useDocumentUpload() {
	return useEnvelopeDraft().documentsField;
}

export function useRecipients() {
	return useEnvelopeDraft().recipientsField;
}

export function usePayments() {
	return useEnvelopeDraft().paymentDraftsField;
}
