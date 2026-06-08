import { useEffect, useRef, useState } from "react";
import {
	type ClientRect,
	collectFieldIdsInMarquee,
	isMarqueeModifierKey,
	isPlacementFieldOverlayTarget,
	MARQUEE_DRAG_THRESHOLD_PX,
	normalizeClientRect,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/marquee-selection";

type UseMarqueeSelectionArgs = {
	enabled: boolean;
	container: HTMLElement | null;
	onSelect: (fieldIds: string[], additive: boolean) => void;
	onActiveChange: (active: boolean) => void;
};

export function useMarqueeSelection({
	enabled,
	container,
	onSelect,
	onActiveChange,
}: UseMarqueeSelectionArgs) {
	const [marqueeRect, setMarqueeRect] = useState<ClientRect | null>(null);
	const dragRef = useRef<{
		startX: number;
		startY: number;
		additive: boolean;
		active: boolean;
	} | null>(null);
	const onSelectRef = useRef(onSelect);
	const onActiveChangeRef = useRef(onActiveChange);

	onSelectRef.current = onSelect;
	onActiveChangeRef.current = onActiveChange;

	useEffect(() => {
		if (!enabled || !container) return;

		const finishDrag = (clientX: number, clientY: number) => {
			const drag = dragRef.current;
			if (!drag) return;
			dragRef.current = null;

			const moved =
				Math.hypot(clientX - drag.startX, clientY - drag.startY) >=
				MARQUEE_DRAG_THRESHOLD_PX;

			if (drag.active && moved) {
				const rect = normalizeClientRect(
					drag.startX,
					drag.startY,
					clientX,
					clientY,
				);
				const fieldIds = collectFieldIdsInMarquee(rect, container);
				onSelectRef.current(fieldIds, drag.additive);
			}

			setMarqueeRect(null);
			onActiveChangeRef.current(false);
		};

		const onPointerDown = (event: PointerEvent) => {
			if (event.button !== 0) return;
			if (!isMarqueeModifierKey(event)) return;
			if (isPlacementFieldOverlayTarget(event.target)) return;

			event.preventDefault();
			event.stopPropagation();

			dragRef.current = {
				startX: event.clientX,
				startY: event.clientY,
				additive: event.shiftKey,
				active: false,
			};
			onActiveChangeRef.current(true);
		};

		const onPointerMove = (event: PointerEvent) => {
			const drag = dragRef.current;
			if (!drag) return;

			if (!drag.active) {
				const moved =
					Math.hypot(
						event.clientX - drag.startX,
						event.clientY - drag.startY,
					) >= MARQUEE_DRAG_THRESHOLD_PX;
				if (!moved) return;
				drag.active = true;
			}

			setMarqueeRect(
				normalizeClientRect(
					drag.startX,
					drag.startY,
					event.clientX,
					event.clientY,
				),
			);
		};

		const onPointerUp = (event: PointerEvent) => {
			finishDrag(event.clientX, event.clientY);
		};

		container.addEventListener("pointerdown", onPointerDown, { capture: true });
		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerup", onPointerUp);
		window.addEventListener("pointercancel", onPointerUp);

		return () => {
			container.removeEventListener("pointerdown", onPointerDown, {
				capture: true,
			});
			window.removeEventListener("pointermove", onPointerMove);
			window.removeEventListener("pointerup", onPointerUp);
			window.removeEventListener("pointercancel", onPointerUp);
			dragRef.current = null;
			setMarqueeRect(null);
		};
	}, [enabled, container]);

	return { marqueeRect };
}
