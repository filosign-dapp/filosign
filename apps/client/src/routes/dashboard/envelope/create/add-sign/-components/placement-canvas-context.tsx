import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useRef,
} from "react";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";

type PlacementCanvasContextValue = {
	pageRef: React.RefObject<HTMLDivElement | null>;
	wrapperRef: React.RefObject<HTMLDivElement | null>;
	panPinchRef: React.RefObject<ReactZoomPanPinchRef | null>;
	setPageEl: (el: HTMLDivElement | null) => void;
	setWrapperEl: (el: HTMLDivElement | null) => void;
};

const PlacementCanvasContext =
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

export function usePlacementCanvas() {
	const ctx = useContext(PlacementCanvasContext);
	if (!ctx) {
		throw new Error("usePlacementCanvas requires PlacementCanvasProvider");
	}
	return ctx;
}
