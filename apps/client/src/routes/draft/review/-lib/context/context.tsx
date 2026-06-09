import { createContext, useContext, useMemo } from "react";
import type { DraftReviewController } from "@/src/routes/draft/review/-lib/hooks/use-controller";

export type DraftReviewContextValue = {
	controller: DraftReviewController;
};

const DraftReviewContext = createContext<DraftReviewContextValue | null>(null);

export function DraftReviewProvider({
	value,
	children,
}: {
	value: DraftReviewContextValue;
	children: React.ReactNode;
}) {
	return (
		<DraftReviewContext.Provider value={value}>
			{children}
		</DraftReviewContext.Provider>
	);
}

export function useDraftReviewContext(): DraftReviewContextValue {
	const context = useContext(DraftReviewContext);
	if (!context) {
		throw new Error(
			"useDraftReviewContext must be used within DraftReviewProvider",
		);
	}
	return context;
}

export function useDraftReviewControllerSlice() {
	return useDraftReviewContext().controller;
}

export function useDraftReviewViewerSlice() {
	return useDraftReviewContext().controller.viewer;
}

export function useDraftReviewMeta() {
	const { displayTitle, data, payload, isUnlocked, decrypted, isWarm, isCold } =
		useDraftReviewControllerSlice();
	return useMemo(
		() => ({
			displayTitle,
			data,
			payload,
			isUnlocked,
			decrypted,
			isWarm,
			isCold,
		}),
		[displayTitle, data, payload, isUnlocked, decrypted, isWarm, isCold],
	);
}

export function useDraftReviewWarmSlice() {
	return useDraftReviewControllerSlice().warmUnlock;
}

export function useDraftReviewColdSlice() {
	return useDraftReviewControllerSlice().cold;
}
