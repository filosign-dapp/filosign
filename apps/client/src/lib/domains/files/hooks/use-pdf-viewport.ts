import { useCallback, useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

export function usePdfViewport(options?: {
	initialZoom?: number;
	mobile?: { width: number; height: number };
	desktop?: { width: number; height: number };
}) {
	const {
		initialZoom = 100,
		mobile = { width: 300, height: 400 },
		desktop = { width: 600, height: 800 },
	} = options ?? {};

	const [zoom, setZoom] = useState(initialZoom);
	const [documentDimensions, setDocumentDimensions] = useState(desktop);

	useEffect(() => {
		const checkMobile = () => {
			const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
			setDocumentDimensions(isMobile ? mobile : desktop);
		};
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, [mobile.width, mobile.height, desktop.width, desktop.height]);

	const handleZoomIn = useCallback(() => {
		setZoom((prev) => Math.min(prev + 25, 200));
	}, []);

	const handleZoomOut = useCallback(() => {
		setZoom((prev) => Math.max(prev - 25, 50));
	}, []);

	return {
		zoom,
		setZoom,
		documentDimensions,
		handleZoomIn,
		handleZoomOut,
	};
}
