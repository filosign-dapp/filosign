import { useEffect, useState } from "react";
import { isMarqueeModifierKey } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/marquee-selection";

function readMarqueeModifierHeld(event?: KeyboardEvent): boolean {
	if (event) {
		return event.metaKey || event.ctrlKey;
	}
	return false;
}

/** True while Cmd (Mac) or Ctrl (Win/Linux) is held — used to block canvas pan instantly. */
export function useMarqueeModifierHeld(enabled: boolean): boolean {
	const [held, setHeld] = useState(false);

	useEffect(() => {
		if (!enabled) {
			setHeld(false);
			return;
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (isMarqueeModifierKey(event)) {
				setHeld(true);
			}
		};

		const onKeyUp = (event: KeyboardEvent) => {
			setHeld(readMarqueeModifierHeld(event));
		};

		const onBlur = () => {
			setHeld(false);
		};

		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);
		window.addEventListener("blur", onBlur);

		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
			window.removeEventListener("blur", onBlur);
			setHeld(false);
		};
	}, [enabled]);

	return held;
}
