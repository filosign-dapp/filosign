import type { Virtualizer } from "@tanstack/react-virtual";

export type PanZoomScrollBridge = {
	getScrollElement: () => HTMLElement | null;
	getScrollOffset: () => number;
	subscribeScrollOffset: (listener: () => void) => () => void;
};

/** TanStack Virtual offset observer for react-zoom-pan-pinch pan instead of scrollLeft. */
export function observePanZoomScrollOffset(
	bridge: PanZoomScrollBridge,
): (
	instance: Virtualizer<HTMLElement, Element>,
	cb: (offset: number, isScrolling: boolean) => void,
) => () => void {
	return (_instance, cb) => {
		cb(bridge.getScrollOffset(), false);
		return bridge.subscribeScrollOffset(() => {
			cb(bridge.getScrollOffset(), false);
		});
	};
}
