import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

export function useViewportDimensions() {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
		};

		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	return {
		width: isMobile ? 300 : 600,
		height: isMobile ? 400 : 800,
		margin: 0,
		isMobile,
	};
}
