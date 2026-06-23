import { useContext, useMemo } from "react";
import type { SignDocumentContextValue } from "@/src/routes/dashboard/document/sign/-lib/context/context";
import { SignDocumentContext } from "@/src/routes/dashboard/document/sign/-lib/context/context";

export type PlacementLayout = {
	width: number;
	height: number;
};

export function placementLayoutFromSignController(
	sign: SignDocumentContextValue["sign"],
): PlacementLayout {
	return {
		width: sign.viewer.documentWidth,
		height: sign.viewer.getPageHeight(1),
	};
}

/** Live placement layout when rendered under SignDocumentProvider; null elsewhere. */
export function usePlacementLayout(): PlacementLayout | null {
	const context = useContext(SignDocumentContext);
	return useMemo(() => {
		if (!context) return null;
		return placementLayoutFromSignController(context.sign);
	}, [context]);
}
