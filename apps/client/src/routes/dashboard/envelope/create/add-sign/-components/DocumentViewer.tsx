import {
	ArrowClockwiseIcon,
	ArrowCounterClockwiseIcon,
	CalendarIcon,
	CaretLeftIcon,
	CaretRightIcon,
	CheckSquareIcon,
	EnvelopeIcon,
	FileIcon,
	MagnifyingGlassMinusIcon,
	MagnifyingGlassPlusIcon,
	SignatureIcon,
	TextAaIcon,
	TextBIcon,
	UserIcon,
	XIcon,
} from "@phosphor-icons/react";
import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image } from "@/src/lib/components/shared/Image";
import { PdfJsPreview } from "@/src/lib/components/shared/PdfJsPreview";
import { Button } from "@/src/lib/components/ui/button";
import { cn } from "@/src/lib/utils/utils";
import {
	type Document,
	type SignatureField,
	signatureFieldBoxCssPx,
} from "../-lib/utils/mock";

function fieldSignerAriaSnippet(field: SignatureField): string {
	const name = field.assignedSignerName.trim() || "Signer";
	const email = field.assignedSignerEmail.trim();
	return email ? `${name}, ${email}` : name;
}

export const useDocumentDimensions = () => {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768); // md breakpoint
		};

		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	return {
		width: isMobile ? 300 : 600,
		height: isMobile ? 400 : 800,
		margin: 0,
		isMobile,
	};
};

interface DocumentViewerProps {
	document: Document | null;
	zoom: number;
	signatureFields: SignatureField[];
	selectedField: string | null;
	isPlacingField: boolean;
	pendingFieldType: SignatureField["type"] | null;
	/** 1-based page for non-PDF placement (PDF uses internal PDF page). */
	documentPage: number;
	onFieldPlacementRequest: (coords: {
		x: number;
		y: number;
		page: number;
	}) => void;
	onPdfPageChange?: (page: number) => void;
	onFieldSelect: (fieldId: string) => void;
	onFieldRemove: (fieldId: string) => void;
	onFieldUpdate: (fieldId: string, updates: Partial<SignatureField>) => void;
	onZoomChange: (zoom: number) => void;
	onBack: () => void;
}

export default function DocumentViewer({
	document,
	zoom,
	signatureFields,
	selectedField,
	isPlacingField,
	pendingFieldType,
	documentPage,
	onFieldPlacementRequest,
	onPdfPageChange,
	onFieldSelect,
	onFieldRemove,
	onFieldUpdate,
	onZoomChange,
	onBack,
}: DocumentViewerProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [pdfPageNumber, setPdfPageNumber] = useState(1);
	const [pdfNumPages, setPdfNumPages] = useState<number | null>(null);
	const {
		width: documentWidth,
		height: documentHeight,
		margin,
		isMobile,
	} = useDocumentDimensions();
	const { width: fieldWidth, height: fieldHeight } =
		signatureFieldBoxCssPx(isMobile);
	const containerRef = useRef<HTMLDivElement>(null);
	const documentRef = useRef<HTMLDivElement>(null);
	const dragDataRef = useRef({
		startX: 0,
		startY: 0,
		fieldX: 0,
		fieldY: 0,
		fieldId: "",
	});
	const lastUpdateRef = useRef(0);

	const isPdfDocument = Boolean(
		document?.url &&
			(document.url.startsWith("data:application/pdf") ||
				document.name?.toLowerCase().endsWith(".pdf")),
	);

	useEffect(() => {
		setPdfPageNumber(1);
		const hint =
			document?.pages != null && document.pages > 0 ? document.pages : null;
		setPdfNumPages(hint);
		onPdfPageChange?.(1);
	}, [document?.id, document?.url, onPdfPageChange]);

	const handleDocumentClick = useCallback(
		(event: React.MouseEvent) => {
			if (!isPlacingField) return;

			const documentRect = documentRef.current?.getBoundingClientRect();
			if (!documentRect) return;

			const x = (event.clientX - documentRect.left) / (zoom / 100);
			const y = (event.clientY - documentRect.top) / (zoom / 100);

			// Use responsive dimensions

			const boundedX = Math.max(margin, Math.min(x, documentWidth - margin));
			const boundedY = Math.max(margin, Math.min(y, documentHeight - margin));

			const page = isPdfDocument ? pdfPageNumber : documentPage;
			onFieldPlacementRequest({ x: boundedX, y: boundedY, page });
		},
		[
			isPlacingField,
			onFieldPlacementRequest,
			zoom,
			documentWidth,
			documentHeight,
			margin,
			isPdfDocument,
			pdfPageNumber,
			documentPage,
		],
	);

	const handleFieldClick = (fieldId: string, event: React.MouseEvent) => {
		event.stopPropagation();
		onFieldSelect(fieldId);
	};

	const handleFieldMouseDown = (fieldId: string, event: React.MouseEvent) => {
		event.stopPropagation();

		const field = signatureFields.find((f) => f.id === fieldId);
		if (!field) return;

		// Store drag data in ref for immediate access
		dragDataRef.current = {
			startX: event.clientX,
			startY: event.clientY,
			fieldX: field.x,
			fieldY: field.y,
			fieldId: fieldId,
		};

		setIsDragging(true);
		onFieldSelect(fieldId);
	};

	// Handle mouse move for dragging - optimized with refs and throttling
	const handleMouseMove = useCallback(
		(event: MouseEvent) => {
			if (!isDragging) return;

			const now = performance.now();
			if (now - lastUpdateRef.current < 16) return;
			lastUpdateRef.current = now;

			const documentRect = documentRef.current?.getBoundingClientRect();
			if (!documentRect) return;

			const dragData = dragDataRef.current;
			const deltaX = (event.clientX - dragData.startX) / (zoom / 100);
			const deltaY = (event.clientY - dragData.startY) / (zoom / 100);

			// Use responsive dimensions

			const newX = Math.max(
				margin,
				Math.min(dragData.fieldX + deltaX, documentWidth - margin),
			);
			const newY = Math.max(
				margin,
				Math.min(dragData.fieldY + deltaY, documentHeight - margin),
			);

			onFieldUpdate(dragData.fieldId, { x: newX, y: newY });
		},
		[isDragging, onFieldUpdate, zoom, documentWidth, documentHeight, margin],
	);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
		dragDataRef.current = {
			startX: 0,
			startY: 0,
			fieldX: 0,
			fieldY: 0,
			fieldId: "",
		};
	}, []);

	// Add global mouse event listeners when dragging
	useEffect(() => {
		if (isDragging) {
			const handleGlobalMouseMove = (event: MouseEvent) =>
				handleMouseMove(event);
			const handleGlobalMouseUp = () => handleMouseUp();

			window.addEventListener("mousemove", handleGlobalMouseMove);
			window.addEventListener("mouseup", handleGlobalMouseUp);
			return () => {
				window.removeEventListener("mousemove", handleGlobalMouseMove);
				window.removeEventListener("mouseup", handleGlobalMouseUp);
			};
		}
	}, [isDragging, handleMouseMove, handleMouseUp]);

	// Local field configuration for icons and labels
	const fieldConfig = {
		signature: { icon: SignatureIcon, label: "Signature" },
		initial: { icon: TextAaIcon, label: "Initial" },
		date: { icon: CalendarIcon, label: "Date Signed" },
		name: { icon: UserIcon, label: "Name" },
		email: { icon: EnvelopeIcon, label: "Email" },
		text: { icon: TextBIcon, label: "Text" },
		checkbox: { icon: CheckSquareIcon, label: "Checkbox" },
	} as const;

	const getFieldIcon = (type: SignatureField["type"]) => {
		const config = fieldConfig[type];
		const IconComponent = config?.icon || FileIcon;
		return (
			<IconComponent
				className={cn(isMobile ? "size-4" : "size-6")}
				weight="fill"
			/>
		);
	};

	const getFieldLabel = (type: SignatureField["type"]) => {
		return fieldConfig[type]?.label || "Field";
	};

	return (
		<div className="flex flex-col flex-1">
			{/* Document Tools */}
			<div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 py-3 md:py-4 w-full border-b border-border bg-background px-3 md:px-4 z-20">
				<Button
					variant="ghost"
					size="sm"
					onClick={onBack}
					className="text-muted-foreground hover:text-foreground hover:bg-accent/50"
					title="Back"
				>
					<ArrowCounterClockwiseIcon className="size-5" />
				</Button>
				{isPdfDocument && (
					<>
						<Button
							variant="ghost"
							size="sm"
							type="button"
							onClick={() => {
								setPdfPageNumber((p) => {
									const n = Math.max(1, p - 1);
									onPdfPageChange?.(n);
									return n;
								});
							}}
							disabled={pdfPageNumber <= 1}
							className="text-muted-foreground hover:text-foreground hover:bg-accent/50"
							title="Previous page"
						>
							<CaretLeftIcon className="size-5" />
						</Button>
						<span className="min-w-11 text-center text-xs font-medium tabular-nums text-muted-foreground sm:text-sm">
							{pdfNumPages == null
								? `${pdfPageNumber} / …`
								: `${pdfPageNumber} / ${pdfNumPages}`}
						</span>
						<Button
							variant="ghost"
							size="sm"
							type="button"
							onClick={() => {
								setPdfPageNumber((p) => {
									const n =
										pdfNumPages == null ? p + 1 : Math.min(pdfNumPages, p + 1);
									onPdfPageChange?.(n);
									return n;
								});
							}}
							disabled={pdfNumPages != null && pdfPageNumber >= pdfNumPages}
							className="text-muted-foreground hover:text-foreground hover:bg-accent/50"
							title="Next page"
						>
							<CaretRightIcon className="size-5" />
						</Button>
					</>
				)}
				<Button
					variant="ghost"
					size="sm"
					className="text-muted-foreground hover:text-foreground hover:bg-accent/50"
					title="Redo (coming soon)"
					disabled
				>
					<ArrowClockwiseIcon className="size-5" />
				</Button>
				<div className="w-px h-6 bg-border mx-0.5 hidden sm:block" />
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onZoomChange(Math.max(zoom - 25, 50))}
					className="text-muted-foreground hover:text-foreground hover:bg-accent/50"
					title="Zoom out"
				>
					<MagnifyingGlassMinusIcon className="size-5" />
				</Button>
				<span className="text-sm font-medium min-w-12 text-center text-foreground tabular-nums">
					{zoom}%
				</span>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onZoomChange(Math.min(zoom + 25, 200))}
					className="text-muted-foreground hover:text-foreground hover:bg-accent/50"
					title="Zoom in"
				>
					<MagnifyingGlassPlusIcon className="size-5" />
				</Button>
			</div>

			{/* Document Container */}
			<div
				ref={containerRef}
				className={cn(
					"overflow-auto bg-muted/10 flex items-start justify-center px-8 py-8 flex-1",
					isPlacingField ? "cursor-crosshair" : "cursor-default",
				)}
			>
				<div
					ref={documentRef}
					className="w-fit bg-white border shadow-lg border-border"
					style={{
						transform: `scale(${zoom / 100})`,
						transformOrigin: "top left",
					}}
				>
					{/* Document Page */}
					<div
						className={cn(`bg-white relative`)}
						style={{
							width: documentWidth,
							height: documentHeight,
						}}
					>
						{/* Render uploaded PDF or image if provided */}
						{document?.url ? (
							document.url.startsWith("data:application/pdf") ||
							document.name?.toLowerCase().endsWith(".pdf") ? (
								<>
									<PdfJsPreview
										file={document.url}
										documentKey={document.id}
										pageNumber={pdfPageNumber}
										width={documentWidth}
										maxHeight={documentHeight}
										className="absolute inset-0 z-10"
										onNumPagesLoaded={(n) => {
											setPdfNumPages(n);
											setPdfPageNumber((prev) => Math.min(prev, n));
										}}
									/>
									{isPlacingField ? (
										<div
											className="absolute inset-0 w-full h-full pointer-events-auto cursor-crosshair bg-blue-500/5 z-20"
											onClick={handleDocumentClick}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													handleDocumentClick(e as unknown as React.MouseEvent);
												}
											}}
											role="button"
											tabIndex={0}
											aria-label={`Click to place ${pendingFieldType} field. Use Enter or Space to place at center.`}
										/>
									) : (
										<div className="absolute inset-0 w-full h-full pointer-events-auto cursor-default bg-transparent" />
									)}
									{isPlacingField && (
										<div className="absolute inset-0 border-2 border-dashed border-secondary/50 bg-secondary/20 pointer-events-none">
											<div className="absolute top-2 left-2 max-w-[min(100%,18rem)] rounded bg-secondary px-2 py-1 text-xs text-primary">
												Click to place — choose signer and required/optional in
												the dialog
											</div>
										</div>
									)}
								</>
							) : (
								<>
									<Image
										src={document.url}
										alt={document.name}
										className="absolute inset-0 w-full h-full object-contain bg-white z-10"
									/>
									{isPlacingField ? (
										<div
											className="absolute inset-0 w-full h-full pointer-events-auto cursor-crosshair bg-blue-500/5 z-20"
											onClick={handleDocumentClick}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													handleDocumentClick(e as unknown as React.MouseEvent);
												}
											}}
											role="button"
											tabIndex={0}
											aria-label={`Click to place ${pendingFieldType} field. Use Enter or Space to place at center.`}
										/>
									) : (
										<div className="absolute inset-0 w-full h-full pointer-events-auto cursor-default bg-transparent" />
									)}
									{isPlacingField && (
										<div className="absolute inset-0 border-2 border-dashed border-secondary/50 bg-secondary/20 pointer-events-none z-20">
											<div className="absolute top-2 left-2 max-w-[min(100%,18rem)] rounded bg-secondary px-2 py-1 text-xs text-primary">
												Click to place — choose signer and required/optional in
												the dialog
											</div>
										</div>
									)}
								</>
							)
						) : (
							<div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground px-6 text-center">
								No document preview available
							</div>
						)}

						{/* Signature Fields */}
						{signatureFields.map((field) => {
							const constrainedX = Math.max(
								margin,
								Math.min(field.x, documentWidth - fieldWidth - margin),
							);
							const constrainedY = Math.max(
								margin,
								Math.min(field.y, documentHeight - fieldHeight - margin),
							);

							return (
								<div
									key={field.id}
									className={cn(
										"absolute flex min-w-0 flex-col gap-1 rounded-md border-2 border-dashed bg-primary/10 p-1.5 hover:bg-primary/10 cursor-move select-none group z-30",
										isMobile ? "max-w-[10rem]" : "max-w-[12rem]",
										selectedField === field.id
											? "border-primary bg-primary/10 shadow-lg "
											: "border-primary/50 hover:border-primary/70 hover:bg-primary/80",
									)}
									style={{
										left: constrainedX,
										top: constrainedY,
									}}
									onClick={(e) => handleFieldClick(field.id, e)}
									onMouseDown={(e) => handleFieldMouseDown(field.id, e)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											handleFieldClick(
												field.id,
												e as unknown as React.MouseEvent,
											);
										}
									}}
									role="button"
									tabIndex={0}
									aria-label={`${getFieldLabel(field.type)} field for ${fieldSignerAriaSnippet(field)}, press Enter to select`}
								>
									<div
										className={cn(
											"flex items-center gap-1.5",
											isMobile ? "gap-1" : "gap-2",
										)}
									>
										<span className="shrink-0 text-primary">
											{getFieldIcon(field.type)}
										</span>
										<span
											className={cn(
												"min-w-0 flex-1 truncate font-medium text-primary",
												isMobile ? "text-[10px]" : "text-xs",
											)}
										>
											{getFieldLabel(field.type)}
										</span>
										<button
											type="button"
											className={cn(
												"shrink-0 p-0",
												isMobile ? "w-3 h-3" : "w-4 h-4",
											)}
											onClick={(e) => {
												e.stopPropagation();
												onFieldRemove(field.id);
											}}
										>
											<XIcon
												className={cn(isMobile ? "w-2.5 h-2.5" : "w-3 h-3")}
											/>
										</button>
									</div>
									<div className="flex items-start justify-between gap-1 border-t border-primary/20 pt-1">
										<div className="min-w-0 flex-1 flex flex-col gap-0.5 text-left">
											<span
												className={cn(
													"truncate font-medium text-foreground",
													isMobile ? "text-[10px]" : "text-xs",
												)}
											>
												{field.assignedSignerName.trim() || "Signer"}
											</span>
											{field.assignedSignerEmail.trim() ? (
												<span
													className={cn(
														"truncate text-muted-foreground",
														isMobile ? "text-[9px]" : "text-[10px]",
													)}
												>
													{field.assignedSignerEmail.trim()}
												</span>
											) : null}
										</div>
										<span
											className={cn(
												"shrink-0 rounded px-1 font-semibold uppercase tracking-tight",
												field.required
													? "bg-amber-500/25 text-amber-950"
													: "bg-muted text-muted-foreground",
												isMobile ? "text-[8px]" : "text-[9px]",
											)}
										>
											{field.required ? "Req" : "Opt"}
										</span>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
