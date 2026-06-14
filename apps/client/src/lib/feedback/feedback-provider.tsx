import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

type FeedbackContextValue = {
	dialogOpen: boolean;
	openFeedback: () => void;
	closeFeedback: () => void;
	setDialogOpen: (open: boolean) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
	const [dialogOpen, setDialogOpen] = useState(false);

	const openFeedback = useCallback(() => {
		setDialogOpen(true);
	}, []);

	const closeFeedback = useCallback(() => {
		setDialogOpen(false);
	}, []);

	const value = useMemo(
		() => ({
			dialogOpen,
			openFeedback,
			closeFeedback,
			setDialogOpen,
		}),
		[dialogOpen, openFeedback, closeFeedback],
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
