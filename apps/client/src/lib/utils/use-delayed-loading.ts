import { useEffect, useState } from "react";

/** Wait before showing spinners so sub-second work does not flash loading UI. */
export const LOADING_INDICATOR_DELAY_MS = 400;

export function useDelayedLoading(
	active: boolean,
	delayMs = LOADING_INDICATOR_DELAY_MS,
): boolean {
	const [show, setShow] = useState(false);

	useEffect(() => {
		if (!active) {
			setShow(false);
			return;
		}

		const timer = window.setTimeout(() => setShow(true), delayMs);
		return () => window.clearTimeout(timer);
	}, [active, delayMs]);

	return show;
}
