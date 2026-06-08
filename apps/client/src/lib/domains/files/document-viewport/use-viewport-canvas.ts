import { useContext } from "react";
import {
	DocumentViewportContext,
	type DocumentViewportContextValue,
} from "./viewport-context";

export function useDocumentViewportCanvas(): DocumentViewportContextValue {
	const ctx = useContext(DocumentViewportContext);
	if (!ctx) {
		throw new Error(
			"useDocumentViewportCanvas requires DocumentViewportProvider",
		);
	}
	return ctx;
}
