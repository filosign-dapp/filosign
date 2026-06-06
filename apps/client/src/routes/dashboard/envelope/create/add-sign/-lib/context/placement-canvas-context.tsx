import { createContext, type ReactNode, useCallback, useRef } from "react";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";

export type PlacementCanvasContextValue = {
	pageRef: React.RefObject<HTMLDivElement | null>;
	wrapperRef: React.RefObject<HTMLDivElement | null>;
	panPinchRef: React.RefObject<ReactZoomPanPinchRef | null>;
	setPageEl: (el: HTMLDivElement | null) => void;
	setWrapperEl: (el: HTMLDivElement | null) => void;
};

export const PlacementCanvasContext =
	createContext<PlacementCanvasContextValue | null>(null);

export function PlacementCanvasProvider({ children }: { children: ReactNode }) {
	const pageRef = useRef<HTMLDivElement | null>(null);
	const wrapperRef = useRef<HTMLDivElement | null>(null);
	const panPinchRef = useRef<ReactZoomPanPinchRef | null>(null);

	const setPageEl = useCallback((el: HTMLDivElement | null) => {
		pageRef.current = el;
	}, []);

	const setWrapperEl = useCallback((el: HTMLDivElement | null) => {
		wrapperRef.current = el;
	}, []);

	return (
		<PlacementCanvasContext.Provider
			value={{
				pageRef,
				wrapperRef,
				panPinchRef,
				setPageEl,
				setWrapperEl,
			}}
		>
			{children}
		</PlacementCanvasContext.Provider>
	);
}
