import type { FeedbackKind } from "@filosign/shared";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

type OpenFeedbackOptions = {
	kind?: FeedbackKind;
};

type FeedbackContextValue = {
	dialogOpen: boolean;
	initialKind: FeedbackKind;
	openFeedback: (options?: OpenFeedbackOptions) => void;
	closeFeedback: () => void;
	setDialogOpen: (open: boolean) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const [initialKind, setInitialKind] = useState<FeedbackKind>("feedback");

	const openFeedback = useCallback((options?: OpenFeedbackOptions) => {
		setInitialKind(options?.kind ?? "feedback");
		setDialogOpen(true);
	}, []);

	const closeFeedback = useCallback(() => {
		setDialogOpen(false);
	}, []);

	const value = useMemo(
		() => ({
			dialogOpen,
			initialKind,
			openFeedback,
			closeFeedback,
			setDialogOpen,
		}),
		[dialogOpen, initialKind, openFeedback, closeFeedback],
	);

	return (
		<FeedbackContext.Provider value={value}>
			{children}
		</FeedbackContext.Provider>
	);
}

export function useFeedback() {
	const ctx = useContext(FeedbackContext);
	if (!ctx) {
		throw new Error("useFeedback must be used within FeedbackProvider");
	}
	return ctx;
}
