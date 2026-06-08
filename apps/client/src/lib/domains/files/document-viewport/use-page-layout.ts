import { useCallback, useRef, useState } from "react";

export function usePageLayout(fallbackHeight: number) {
	const pageHeightsRef = useRef<Map<number, number>>(new Map());
	const [pdfLayoutHeight, setPdfLayoutHeight] = useState<number | null>(null);
	const [pdfNumPages, setPdfNumPages] = useState<number | null>(null);
	const placementDocHeight = pdfLayoutHeight ?? fallbackHeight;

	const recordPdfPageLayout = useCallback((page: number, height: number) => {
		pageHeightsRef.current.set(page, height);
		const maxHeight = Math.max(...pageHeightsRef.current.values(), height);
		setPdfLayoutHeight(maxHeight);
	}, []);

	const getPageHeight = useCallback(
		(page: number) => pageHeightsRef.current.get(page) ?? placementDocHeight,
		[placementDocHeight],
	);

	const resetPageLayout = useCallback(() => {
		pageHeightsRef.current = new Map();
		setPdfLayoutHeight(null);
		setPdfNumPages(null);
	}, []);

	return {
		pdfLayoutHeight,
		pdfNumPages,
		setPdfNumPages,
		placementDocHeight,
		recordPdfPageLayout,
		getPageHeight,
		resetPageLayout,
	};
}
