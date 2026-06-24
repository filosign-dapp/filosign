import type { ReactNode } from "react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import { PLACEMENT_FIELD_OVERLAY_CLASS } from "@/src/lib/domains/files/document-viewport/viewport-coordinates";
import type { PanZoomScrollBridge } from "@/src/lib/domains/files/pdf/pan-zoom-scroll-offset";
import { PdfStripVirtual } from "@/src/lib/domains/files/pdf/pdf-strip-virtual";
import { cn } from "@/src/lib/utils";

type PdfLayoutCacheEntry = {
	numPages: number | null;
	pageLayoutHeight: number | null;
};

const pdfLayoutCache = new Map<string, PdfLayoutCacheEntry>();

function getPdfLayoutCache(key: string): PdfLayoutCacheEntry | undefined {
	return pdfLayoutCache.get(key);
}

function setPdfLayoutCache(key: string, patch: Partial<PdfLayoutCacheEntry>) {
	const prev = pdfLayoutCache.get(key) ?? {
		numPages: null,
		pageLayoutHeight: null,
	};
	pdfLayoutCache.set(key, { ...prev, ...patch });
}

function normalizeFile(file: string | ArrayBuffer | Uint8Array) {
	if (typeof file === "string") {
		return file;
	}
	const u8 = file instanceof Uint8Array ? file : new Uint8Array(file);
	return { data: u8.slice() };
}

function fileIdentity(file: string | ArrayBuffer | Uint8Array): string {
	if (typeof file === "string") {
		return file;
	}
	const bytes = file instanceof Uint8Array ? file : new Uint8Array(file);
	return `${bytes.byteLength}:${bytes[0] ?? 0}:${bytes[bytes.byteLength - 1] ?? 0}`;
}

type PdfPageWrapProps = {
	docKey: string;
	pageNumber: number;
	width: number;
	isStrip: boolean;
	setPageRef?: (pageNumber: number, el: HTMLDivElement | null) => void;
	renderPageOverlay?: (pageIndex: number) => ReactNode;
	onPageLayoutLoaded?: (
		layout: { width: number; height: number },
		pageNumber?: number,
	) => void;
	onRenderError: (message: string) => void;
	onSinglePageHeight: (height: number) => void;
};

const PdfPageWrap = memo(function PdfPageWrap({
	docKey,
	pageNumber,
	width,
	isStrip,
	setPageRef,
	renderPageOverlay,
	onPageLayoutLoaded,
	onRenderError,
	onSinglePageHeight,
}: PdfPageWrapProps) {
	const pageProps = {
		width,
		renderTextLayer: false as const,
		renderAnnotationLayer: false as const,
	};

	return (
		<div
			ref={(el) => setPageRef?.(pageNumber, el)}
			className="relative shrink-0 bg-white shadow-sm"
			style={{ width }}
		>
			<Page
				key={`${docKey}-page-${pageNumber}`}
				pageNumber={pageNumber}
				{...pageProps}
				onLoadSuccess={(page) => {
					const base = page.getViewport({ scale: 1 });
					const scale = width / base.width;
					const height = Math.ceil(base.height * scale);
					if (!isStrip) {
						onSinglePageHeight(height);
					}
					onPageLayoutLoaded?.({ width, height }, pageNumber);
				}}
				onRenderError={(err) =>
					onRenderError(err.message || "Could not render PDF page")
				}
			/>
			{renderPageOverlay ? (
				<div
					className={cn(
						"pointer-events-none absolute inset-0 z-20",
						"[&_button]:pointer-events-auto",
						"[&_[role=button]]:pointer-events-auto",
						`[&_.${PLACEMENT_FIELD_OVERLAY_CLASS}]:pointer-events-auto`,
					)}
				>
					{renderPageOverlay(pageNumber - 1)}
				</div>
			) : null}
			{isStrip ? (
				<span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-background/80 px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
					{pageNumber}
				</span>
			) : null}
		</div>
	);
});

export type PdfJsPreviewProps = {
	file: string | ArrayBuffer | Uint8Array;
	/** Remount `Document` when the underlying bytes / URL identity changes. */
	documentKey?: string;
	/** 1-based page (react-pdf convention). Ignored when `layout` is `strip`. */
	pageNumber?: number;
	/** `strip` renders a virtualized horizontal page row when `stripScrollBridge` is set. */
	layout?: "single" | "strip";
	/** Pan/zoom offset bridge for strip virtualization. */
	stripScrollBridge?: PanZoomScrollBridge;
	/** 0-based page index, aligned with {@link PlacementManifest} `pageIndex`. */
	renderPageOverlay?: (pageIndex: number) => ReactNode;
	/** Called once per page element in strip layout (1-based page number). */
	setPageRef?: (pageNumber: number, el: HTMLDivElement | null) => void;
	width: number;
	className?: string;
	maxHeight?: number;
	/** Called once the PDF is parsed (authoritative page count). */
	onNumPagesLoaded?: (numPages: number) => void;
	/** Rendered page size in CSS pixels at `width`. Optional `pageNumber` in strip layout. */
	onPageLayoutLoaded?: (
		layout: { width: number; height: number },
		pageNumber?: number,
	) => void;
};

/**
 * Renders a PDF page with **pdf.js** (canvas). Prefer this over `<iframe>` / `<object>`
 * so previews work under strict CSP (`object-src 'none'`, tight `frame-src`).
 */
export function PdfJsPreview({
	file,
	documentKey,
	pageNumber = 1,
	layout = "single",
	stripScrollBridge,
	renderPageOverlay,
	setPageRef,
	width,
	className,
	maxHeight,
	onNumPagesLoaded,
	onPageLayoutLoaded,
}: PdfJsPreviewProps) {
	const docKey =
		documentKey ??
		(typeof file === "string" ? file.slice(0, 128) : "pdf-binary");

	const identity = useMemo(() => fileIdentity(file), [file]);
	const fileSource = useMemo(() => normalizeFile(file), [docKey, identity]);

	const cached = getPdfLayoutCache(docKey);
	const [numPages, setNumPages] = useState<number | null>(
		cached?.numPages ?? null,
	);
	const [loadError, setLoadError] = useState<string | null>(null);
	const activeDocKeyRef = useRef(docKey);
	const onNumPagesLoadedRef = useRef(onNumPagesLoaded);
	onNumPagesLoadedRef.current = onNumPagesLoaded;
	const onPageLayoutLoadedRef = useRef(onPageLayoutLoaded);
	onPageLayoutLoadedRef.current = onPageLayoutLoaded;
	const [pageLayoutHeight, setPageLayoutHeight] = useState<number | null>(
		cached?.pageLayoutHeight ?? null,
	);

	useEffect(() => {
		activeDocKeyRef.current = docKey;
		const entry = getPdfLayoutCache(docKey);
		setNumPages(entry?.numPages ?? null);
		setPageLayoutHeight(entry?.pageLayoutHeight ?? null);
		setLoadError(null);
	}, [docKey, fileSource]);

	const safePageNumber =
		numPages == null ? 1 : Math.min(Math.max(1, pageNumber), numPages);

	const isStrip = layout === "strip";

	const handleRenderError = (message: string) => {
		setLoadError(message);
	};

	const handleSinglePageHeight = (height: number) => {
		setPageLayoutHeight(height);
		setPdfLayoutCache(docKey, { pageLayoutHeight: height });
	};

	const sharedPageProps = {
		docKey,
		width,
		isStrip,
		setPageRef,
		renderPageOverlay,
		onPageLayoutLoaded: (
			layout: { width: number; height: number },
			pn?: number,
		) => onPageLayoutLoadedRef.current?.(layout, pn),
		onRenderError: handleRenderError,
		onSinglePageHeight: handleSinglePageHeight,
	};

	const pageStack =
		numPages != null ? (
			isStrip && stripScrollBridge ? (
				<PdfStripVirtual
					numPages={numPages}
					pageWidth={width}
					scrollBridge={stripScrollBridge}
					renderPage={(pn) => (
						<PdfPageWrap pageNumber={pn} {...sharedPageProps} />
					)}
				/>
			) : isStrip ? (
				<div className="flex flex-row items-start gap-6">
					{Array.from({ length: numPages }, (_, i) => (
						<PdfPageWrap
							key={`${docKey}-page-wrap-${i + 1}`}
							pageNumber={i + 1}
							{...sharedPageProps}
						/>
					))}
				</div>
			) : (
				<div className="absolute inset-0">
					<div className="absolute inset-0 flex items-start justify-center overflow-hidden">
						<PdfPageWrap pageNumber={safePageNumber} {...sharedPageProps} />
					</div>
				</div>
			)
		) : null;

	const containerHeight = isStrip ? undefined : (pageLayoutHeight ?? maxHeight);

	return (
		<div
			className={cn(
				"relative",
				isStrip ? "w-fit bg-transparent" : "overflow-hidden bg-white",
				className,
			)}
			style={{
				...(isStrip
					? {}
					: {
							width,
							...(containerHeight == null
								? {}
								: { height: containerHeight, maxHeight: containerHeight }),
						}),
			}}
		>
			{loadError ? (
				<div className="flex min-h-30 w-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
					{loadError}
				</div>
			) : (
				<Document
					key={docKey}
					file={fileSource}
					onLoadError={(err) =>
						setLoadError(err.message || "Could not load PDF")
					}
					onLoadSuccess={(pdf) => {
						if (activeDocKeyRef.current !== docKey) return;
						setLoadError(null);
						setNumPages(pdf.numPages);
						setPdfLayoutCache(docKey, { numPages: pdf.numPages });
						onNumPagesLoadedRef.current?.(pdf.numPages);
					}}
					loading={
						<div className="flex min-h-30 w-full items-center justify-center p-4 text-sm text-muted-foreground">
							Loading document…
						</div>
					}
				>
					{pageStack}
				</Document>
			)}
		</div>
	);
}
