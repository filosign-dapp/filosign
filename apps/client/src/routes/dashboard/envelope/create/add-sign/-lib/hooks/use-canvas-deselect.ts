import { type RefObject, useCallback } from "react";
import {
	isMarqueeModifierKey,
	isPlacementFieldOverlayTarget,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/marquee-selection";

type UseCanvasDeselectArgs = {
	enabled: boolean;
	onDeselect: () => void;
	suppressNextRef: RefObject<boolean>;
};

export function useCanvasDeselect({
	enabled,
	onDeselect,
	suppressNextRef,
}: UseCanvasDeselectArgs) {
	return useCallback(
		(event: React.PointerEvent) => {
			if (!enabled || event.button !== 0) return;
			if (isMarqueeModifierKey(event)) return;
			if (isPlacementFieldOverlayTarget(event.target)) return;
			if (suppressNextRef.current) {
				suppressNextRef.current = false;
				return;
			}
			onDeselect();
		},
		[enabled, onDeselect, suppressNextRef],
	);
}
