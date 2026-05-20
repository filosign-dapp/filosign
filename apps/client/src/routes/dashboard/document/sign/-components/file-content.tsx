import type { PlacementField } from "@filosign/shared";
import { DownloadIcon, FileTextIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { cn } from "@/src/lib/utils";
import { PLACEMENT_VIEWPORT_WIDTH } from "@/src/lib/utils/placement-viewport";
import {
	useSignCompliance,
	useSignFile,
	useSignPlacement,
	useSignSigning,
	useSignViewer,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";
import { SignDocumentPdfPreview } from "./pdf-preview";

type SignDocumentPdfPlacementOverlayProps = {
	pageIndex: number;
	myPlacementFields: PlacementField[];
	alreadySigned: boolean;
	isMyPlacementFieldDone: (fieldId: string) => boolean;
	togglePlacementField: (fieldId: string) => void;
};

function SignDocumentPdfPlacementOverlay({
	pageIndex,
	myPlacementFields,
	alreadySigned,
	isMyPlacementFieldDone,
	togglePlacementField,
}: SignDocumentPdfPlacementOverlayProps) {
	return (
		<>
			{myPlacementFields
				.filter((f) => f.pageIndex === pageIndex)
				.map((field) => {
					const done = isMyPlacementFieldDone(field.id);
					return (
						<button
							key={field.id}
							type="button"
							disabled={alreadySigned}
							className={cn(
								"pointer-events-auto absolute z-10 flex items-center justify-center rounded border-2 px-0.5 text-[9px] font-semibold uppercase tracking-tight transition-colors",
								done
									? "border-emerald-600 bg-emerald-500/25 text-emerald-950"
									: "border-amber-500 bg-amber-400/20 text-amber-950 hover:bg-amber-400/35",
							)}
							style={{
								left: `${field.rect.x * 100}%`,
								top: `${field.rect.y * 100}%`,
								width: `${Math.max(field.rect.width * 100, 8)}%`,
								height: `${Math.max(field.rect.height * 100, 5)}%`,
							}}
							onClick={() => togglePlacementField(field.id)}
						>
							{alreadySigned
								? "Signed"
								: done
									? "Selected"
									: field.required
										? "Required"
										: "Optional"}
						</button>
					);
				})}
		</>
	);
}

export function SignDocumentFileContent() {
	const { pieceCid } = useSignFile();
	const [pdfLayoutHeight, setPdfLayoutHeight] = useState<number | null>(null);
	const viewportWidth = PLACEMENT_VIEWPORT_WIDTH;
	const viewportHeight = pdfLayoutHeight ?? 800;

	const {
		fileData,
		viewError,
		viewFile,
		handleViewFile,
		zoom,
		previewPdfBytes,
		signPdfPage,
		setSignPdfPage,
		setSignPdfNumPages,
	} = useSignViewer();

	useEffect(() => {
		setPdfLayoutHeight(null);
	}, [pieceCid, signPdfPage]);
	const { myPlacementFields, isMyPlacementFieldDone, togglePlacementField } =
		useSignPlacement();
	const { alreadySigned, canSign } = useSignSigning();
	const { handleDownload } = useSignCompliance();
	const viewFilePending = viewFile.isPending;
	if (viewError) {
		return (
			<div className="flex items-center justify-center w-full h-full text-sm text-muted-foreground p-4 text-center">
				<div className="flex flex-col items-center gap-3 md:gap-4">
					<FileTextIcon className="size-12 md:size-16 text-destructive/50" />
					<div className="text-xs md:text-sm text-destructive font-medium">
						Failed to decrypt file
					</div>
					<div className="text-xs text-muted-foreground max-w-md">
						{viewError}
					</div>
					<Button
						size="sm"
						variant="outline"
						onClick={() => void handleViewFile()}
						disabled={viewFilePending}
					>
						Retry
					</Button>
				</div>
			</div>
		);
	}

	if (!fileData) {
		return (
			<div className="flex items-center justify-center w-full h-full text-sm text-muted-foreground p-4 text-center">
				<div className="flex flex-col items-center gap-3 md:gap-4">
					<FileTextIcon className="size-12 md:size-16 text-muted-foreground/50" />
					<div className="text-xs md:text-sm">No file preview available</div>
				</div>
			</div>
		);
	}

	const { fileBytes, metadata } = fileData;
	const mimeType = metadata.mimeType;
	const fileName = metadata.name;

	if (
		mimeType?.startsWith("image/") ||
		fileName?.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)
	) {
		const arrayBuffer = new ArrayBuffer(fileBytes.length);
		new Uint8Array(arrayBuffer).set(fileBytes);
		const blob = new Blob([arrayBuffer], { type: mimeType });
		const imageUrl = URL.createObjectURL(blob);

		return (
			<div className="flex flex-col items-center justify-center w-full h-full gap-4 p-4 md:p-8 bg-muted/5">
				<div
					className="relative bg-white border shadow-lg border-border"
					style={{
						width: viewportWidth,
						height: viewportHeight,
						transform: `scale(${zoom / 100})`,
						transformOrigin: "center",
					}}
				>
					<img
						src={imageUrl}
						alt={fileName || "Document"}
						className="absolute inset-0 w-full h-full object-contain"
						onLoad={() => URL.revokeObjectURL(imageUrl)}
					/>
					{myPlacementFields
						.filter((f) => f.pageIndex === 0)
						.map((field) => {
							const done = isMyPlacementFieldDone(field.id);
							return (
								<button
									key={field.id}
									type="button"
									disabled={alreadySigned}
									className={cn(
										"absolute z-10 flex items-center justify-center rounded border-2 px-0.5 text-[9px] font-semibold uppercase tracking-tight transition-colors",
										done
											? "border-emerald-600 bg-emerald-500/25 text-emerald-950"
											: "border-amber-500 bg-amber-400/20 text-amber-950 hover:bg-amber-400/35",
									)}
									style={{
										left: `${field.rect.x * 100}%`,
										top: `${field.rect.y * 100}%`,
										width: `${Math.max(field.rect.width * 100, 8)}%`,
										height: `${Math.max(field.rect.height * 100, 5)}%`,
									}}
									onClick={() => togglePlacementField(field.id)}
								>
									{alreadySigned
										? "Signed"
										: done
											? "Done"
											: field.required
												? "Req"
												: "Opt"}
								</button>
							);
						})}
				</div>
				{myPlacementFields.some((f) => f.pageIndex !== 0) && (
					<div className="w-full max-w-[600px] rounded-lg border border-border bg-background/80 p-3">
						<p className="mb-2 text-xs font-medium text-muted-foreground">
							Fields on other pages — tap to mark complete
						</p>
						<div className="flex flex-wrap gap-2">
							{myPlacementFields
								.filter((f) => f.pageIndex !== 0)
								.map((field) => {
									const done = isMyPlacementFieldDone(field.id);
									return (
										<Button
											key={field.id}
											type="button"
											size="sm"
											variant={done ? "secondary" : "outline"}
											className="h-8 text-xs"
											disabled={alreadySigned}
											onClick={() => togglePlacementField(field.id)}
										>
											P{field.pageIndex + 1} ·{" "}
											{field.required ? "Required" : "Optional"}
											{alreadySigned ? " · signed" : done ? " ✓" : ""}
										</Button>
									);
								})}
						</div>
					</div>
				)}
			</div>
		);
	}

	if (
		mimeType === "application/pdf" ||
		fileName?.toLowerCase().endsWith(".pdf")
	) {
		if (!previewPdfBytes) {
			return (
				<div className="flex items-center justify-center w-full h-full p-4 text-sm text-muted-foreground">
					Loading PDF…
				</div>
			);
		}

		return (
			<div className="flex flex-col items-center justify-center w-full h-full gap-4 p-4 md:p-8 bg-muted/5">
				<div
					className="relative bg-white border shadow-lg border-border"
					style={{
						width: viewportWidth,
						height: viewportHeight,
						transform: `scale(${zoom / 100})`,
						transformOrigin: "center",
					}}
				>
					<div className="absolute inset-0 overflow-hidden bg-white">
						<SignDocumentPdfPreview
							className="absolute inset-0 z-0"
							documentKey={pieceCid ?? "sign"}
							file={previewPdfBytes}
							pageNumber={signPdfPage}
							width={viewportWidth}
							maxHeight={800}
							onPageLayoutLoaded={({ height }) => setPdfLayoutHeight(height)}
							onNumPagesLoaded={(n) => {
								setSignPdfNumPages(n);
								setSignPdfPage((p) => Math.min(p, n));
							}}
							renderPageOverlay={(pageIndex) => (
								<SignDocumentPdfPlacementOverlay
									pageIndex={pageIndex}
									myPlacementFields={myPlacementFields}
									alreadySigned={alreadySigned}
									isMyPlacementFieldDone={isMyPlacementFieldDone}
									togglePlacementField={togglePlacementField}
								/>
							)}
						/>
					</div>
				</div>
			</div>
		);
	}

	if (
		mimeType?.startsWith("text/") ||
		fileName?.toLowerCase().match(/\.(txt|md|json|xml|html|css|js|ts)$/)
	) {
		try {
			const textContent = new TextDecoder().decode(fileBytes);
			return (
				<div className="w-full h-full p-4 md:p-8 overflow-auto">
					<pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
						{textContent}
					</pre>
				</div>
			);
		} catch (error) {
			console.error("Error decoding text file:", error);
			return (
				<div className="flex items-center justify-center w-full h-full text-sm text-muted-foreground p-4 text-center">
					<div className="flex flex-col items-center gap-3 md:gap-4">
						<FileTextIcon className="size-12 md:size-16 text-muted-foreground/50" />
						<div className="text-xs md:text-sm">Cannot display text file</div>
					</div>
				</div>
			);
		}
	}

	return (
		<div className="flex flex-col items-center justify-center w-full h-full gap-4 p-4 text-sm text-muted-foreground">
			<div className="flex flex-col items-center gap-3 text-center">
				<FileTextIcon className="size-12 md:size-16 text-muted-foreground/50" />
				<div className="text-xs md:text-sm">
					Preview not available for this file type
				</div>
				<div className="text-xs text-muted-foreground/70">
					{mimeType || fileName}
				</div>
				<Button
					size="sm"
					variant="outline"
					onClick={handleDownload}
					className="mt-2"
				>
					<DownloadIcon className="size-4 mr-2" />
					Download File
				</Button>
			</div>
			{canSign && myPlacementFields.length > 0 && (
				<div className="w-full max-w-md rounded-lg border border-border bg-background/90 p-4 text-left">
					<p className="mb-3 text-xs font-medium text-foreground">
						Mark each field you are signing (required fields must all be
						selected):
					</p>
					<div className="flex flex-col gap-2">
						{myPlacementFields.map((field) => {
							const done = isMyPlacementFieldDone(field.id);
							return (
								<Button
									key={field.id}
									type="button"
									size="sm"
									variant={done ? "secondary" : "outline"}
									className="h-auto justify-start py-2 text-left text-xs"
									disabled={alreadySigned}
									onClick={() => togglePlacementField(field.id)}
								>
									p.{field.pageIndex + 1} · {field.type}
									{field.required ? " · required" : ""}
									{alreadySigned ? " · signed" : done ? " ✓" : ""}
								</Button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
