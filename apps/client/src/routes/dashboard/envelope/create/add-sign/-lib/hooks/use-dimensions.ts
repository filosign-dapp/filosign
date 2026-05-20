import { useEffect, useState } from "react";

export function useDocumentDimensions() {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768);
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
