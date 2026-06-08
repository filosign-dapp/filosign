import {
	createContext,
	type ReactNode,
	useCallback,
	useMemo,
	useRef,
} from "react";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import type { PanZoomScrollBridge } from "@/src/lib/domains/files/pdf/pan-zoom-scroll-offset";

export type PanZoomTransform = {
	positionX: number;
	scale: number;
};

export type DocumentViewportContextValue = {
	pageRefs: React.RefObject<Map<number, HTMLDivElement>>;
	wrapperRef: React.RefObject<HTMLDivElement | null>;
	panPinchRef: React.RefObject<ReactZoomPanPinchRef | null>;
	stripScrollBridge: PanZoomScrollBridge;
	setPageElForPage: (page: number, el: HTMLDivElement | null) => void;
	getPageEl: (page: number) => HTMLDivElement | null;
	clearPageEls: () => void;
	setWrapperEl: (el: HTMLDivElement | null) => void;
	setPanZoomTransform: (transform: PanZoomTransform) => void;
};

export const DocumentViewportContext =
	createContext<DocumentViewportContextValue | null>(null);

export function DocumentViewportProvider({
	children,
}: {
	children: ReactNode;
}) {
	const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
	const wrapperRef = useRef<HTMLDivElement | null>(null);
	const panPinchRef = useRef<ReactZoomPanPinchRef | null>(null);
	const panZoomTransformRef = useRef<PanZoomTransform>({
		positionX: 0,
		scale: 1,
	});
	const panZoomListenersRef = useRef(new Set<() => void>());

	const setPageElForPage = useCallback(
		(page: number, el: HTMLDivElement | null) => {
			if (el) {
				pageRefs.current.set(page, el);
			} else {
				pageRefs.current.delete(page);
			}
		},
		[],
	);

	const getPageEl = useCallback((page: number) => {
		return pageRefs.current.get(page) ?? null;
	}, []);

	const clearPageEls = useCallback(() => {
		pageRefs.current.clear();
	}, []);

	const setWrapperEl = useCallback((el: HTMLDivElement | null) => {
		wrapperRef.current = el;
	}, []);

	const getStripScrollOffset = useCallback(() => {
		const { positionX, scale } = panZoomTransformRef.current;
		const safeScale = scale > 0 ? scale : 1;
		return Math.max(0, -positionX / safeScale);
	}, []);

	const subscribeStripScrollOffset = useCallback((listener: () => void) => {
		panZoomListenersRef.current.add(listener);
		return () => {
			panZoomListenersRef.current.delete(listener);
		};
	}, []);

	const setPanZoomTransform = useCallback((transform: PanZoomTransform) => {
		panZoomTransformRef.current = transform;
		for (const listener of panZoomListenersRef.current) {
			listener();
		}
	}, []);

	const stripScrollBridge = useMemo(
		(): PanZoomScrollBridge => ({
			getScrollElement: () => wrapperRef.current,
			getScrollOffset: getStripScrollOffset,
			subscribeScrollOffset: subscribeStripScrollOffset,
		}),
		[getStripScrollOffset, subscribeStripScrollOffset],
	);

	return (
		<DocumentViewportContext.Provider
			value={{
				pageRefs,
				wrapperRef,
				panPinchRef,
				stripScrollBridge,
				setPageElForPage,
				getPageEl,
				clearPageEls,
				setWrapperEl,
				setPanZoomTransform,
			}}
		>
			{children}
		</DocumentViewportContext.Provider>
	);
}
