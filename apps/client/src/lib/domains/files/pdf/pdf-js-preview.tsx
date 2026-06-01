import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import { configurePdfWorker } from "@/src/lib/domains/files/pdf/configure-pdf-worker";
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

export type PdfJsPreviewProps = {
	file: string | ArrayBuffer | Uint8Array;
	/** Remount `Document` when the underlying bytes / URL identity changes. */
	documentKey?: string;
	/** 1-based page (react-pdf convention). */
	pageNumber?: number;
	/** 0-based page index, aligned with {@link PlacementManifest} `pageIndex`. */
	renderPageOverlay?: (pageIndex: number) => ReactNode;
	width: number;
	className?: string;
	maxHeight?: number;
	/** Called once the PDF is parsed (authoritative page count). */
	onNumPagesLoaded?: (numPages: number) => void;
	/** Rendered page size in CSS pixels at `width` (for placement coordinate alignment). */
	onPageLayoutLoaded?: (layout: { width: number; height: number }) => void;
};

/**
 * Renders a PDF page with **pdf.js** (canvas). Prefer this over `<iframe>` / `<object>`
 * so previews work under strict CSP (`object-src 'none'`, tight `frame-src`).
 */
export function PdfJsPreview({
	file,
	documentKey,
	pageNumber = 1,
	renderPageOverlay,
	width,
	className,
	maxHeight,
	onNumPagesLoaded,
	onPageLayoutLoaded,
}: PdfJsPreviewProps) {
	configurePdfWorker();

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

	const pageProps = {
		width,
		renderTextLayer: false as const,
		renderAnnotationLayer: false as const,
	};

	const overlayWrap = Boolean(renderPageOverlay);

	const pageStack =
		numPages != null ? (
			<div className="absolute inset-0">
				<div className="absolute inset-0 flex items-start justify-center overflow-hidden">
					<Page
						key={`${docKey}-page-${safePageNumber}`}
						pageNumber={safePageNumber}
						{...pageProps}
						onLoadSuccess={(page) => {
							const base = page.getViewport({ scale: 1 });
							const scale = width / base.width;
							const height = Math.ceil(base.height * scale);
							setPageLayoutHeight(height);
							setPdfLayoutCache(docKey, { pageLayoutHeight: height });
							onPageLayoutLoadedRef.current?.({ width, height });
						}}
						onRenderError={(err) =>
							setLoadError(err.message || "Could not render PDF page")
						}
					/>
				</div>
				{overlayWrap ? (
					<div className="pointer-events-none absolute inset-0 z-20 [&_button]:pointer-events-auto">
						{renderPageOverlay?.(safePageNumber - 1)}
					</div>
				) : null}
			</div>
		) : null;

	const containerHeight = pageLayoutHeight ?? maxHeight;

	return (
		<div
			className={cn("relative overflow-hidden bg-white", className)}
			style={{
				width,
				...(containerHeight == null
					? {}
					: { height: containerHeight, maxHeight: containerHeight }),
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
