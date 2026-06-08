import { useMonthlyDocumentQuota } from "@filosign/react/billing";
import { isAcceptedSignableDocumentUpload } from "@filosign/shared";
import {
	CaretDownIcon,
	PaperPlaneTiltIcon,
	UploadIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { ListGridViewToggle } from "@/src/lib/components/app/view/list-grid-view-toggle";
import { Button } from "@/src/lib/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/src/lib/components/ui/collapsible";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import {
	normalizeSignableDocumentToPdf,
	SignableDocumentNormalizeError,
} from "@/src/lib/domains/files/normalize-signable-document";
import { createClientId } from "@/src/lib/utils/id";
import { cn } from "@/src/lib/utils/utils";
import { useComposeDocuments } from "../-lib/hooks/use-compose-documents";
import { usePromptPlanUpgrade } from "../-lib/hooks/use-prompt-plan-upgrade";
import type { UploadedFile } from "../-lib/types";
import { ACCEPTED_FILE_EXTENSIONS } from "../-lib/types";
import FileCard from "./file-card";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function DocumentsSection() {
	const { documents, onChange, error, showError } = useComposeDocuments();
	const promptPlanUpgrade = usePromptPlanUpgrade();
	const { isMonthlyQuotaExhausted } = useMonthlyDocumentQuota();
	const [isDocumentsOpen, setIsDocumentsOpen] = useState(true);
	const [isDragOver, setIsDragOver] = useState(false);
	const [viewMode, setViewMode] = useState<"list" | "grid">("list");
	const [isViewSwitching, setIsViewSwitching] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [unsupportedFiles, setUnsupportedFiles] = useState<string[]>([]);
	const [oversizedFiles, setOversizedFiles] = useState<string[]>([]);
	const [preparingFiles, setPreparingFiles] = useState(false);

	const handleFileSelect = useCallback(
		async (files: FileList | null) => {
			if (!files) return;
			if (isMonthlyQuotaExhausted) {
				promptPlanUpgrade("documents.sent.monthly");
				return;
			}

			const incoming = Array.from(files);
			const rejected = incoming
				.filter(
					(file) =>
						!isAcceptedSignableDocumentUpload(file.name, file.type) ||
						file.size > MAX_FILE_SIZE,
				)
				.filter(
					(file) => !isAcceptedSignableDocumentUpload(file.name, file.type),
				)
				.map((file) => file.name);

			const oversized = incoming
				.filter((file) => file.size > MAX_FILE_SIZE)
				.map((file) => file.name);

			const candidates = incoming.filter(
				(file) =>
					isAcceptedSignableDocumentUpload(file.name, file.type) &&
					file.size > 0 &&
					file.size <= MAX_FILE_SIZE,
			);

			if (candidates.length === 0) {
				setUnsupportedFiles(rejected);
				setOversizedFiles(oversized);
				return;
			}

			setPreparingFiles(true);
			const newFiles: UploadedFile[] = [];

			try {
				for (const file of candidates) {
					const duplicate = documents?.some(
						(existingFile) =>
							existingFile.name === file.name &&
							existingFile.size === file.size,
					);
					if (duplicate) continue;

					try {
						const normalized = await normalizeSignableDocumentToPdf(file);
						newFiles.push({
							id: createClientId(),
							file: normalized.pdfFile,
							name: normalized.displayName,
							size: normalized.pdfFile.size,
							type: "application/pdf",
							sourceMimeType: normalized.sourceMimeType,
							pageCount: normalized.pageCount,
						});
					} catch (error) {
						const message =
							error instanceof SignableDocumentNormalizeError
								? error.message
								: `${file.name} could not be prepared for signing`;
						toast.error(message);
					}
				}

				if (newFiles.length > 0) {
					onChange([...(documents || []), ...newFiles]);
				}
			} finally {
				setPreparingFiles(false);
				setUnsupportedFiles(rejected);
				setOversizedFiles(oversized);
			}
		},
		[documents, onChange, isMonthlyQuotaExhausted, promptPlanUpgrade],
	);

	const handleFileInputChange = (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		void handleFileSelect(event.target.files);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleUploadClick = () => {
		if (isMonthlyQuotaExhausted) {
			promptPlanUpgrade("documents.sent.monthly");
			return;
		}
		fileInputRef.current?.click();
	};

	const handleDragOver = (event: React.DragEvent) => {
		event.preventDefault();
		setIsDragOver(true);
	};

	const handleDragLeave = (event: React.DragEvent) => {
		event.preventDefault();
		setIsDragOver(false);
	};

	const handleDrop = (event: React.DragEvent) => {
		event.preventDefault();
		setIsDragOver(false);
		if (isMonthlyQuotaExhausted) {
			promptPlanUpgrade("documents.sent.monthly");
			return;
		}
		void handleFileSelect(event.dataTransfer.files);
	};

	const removeFile = (fileId: string) => {
		const updatedDocs = documents?.filter((file) => file.id !== fileId) || [];
		onChange(updatedDocs);
	};

	const handleViewModeChange = (newViewMode: "list" | "grid") => {
		if (newViewMode !== viewMode) {
			setIsViewSwitching(true);
			setViewMode(newViewMode);
			setTimeout(() => {
				setIsViewSwitching(false);
			}, 300);
		}
	};

	return (
		<motion.section
			className="space-y-4"
			initial={{ opacity: 0, y: 30 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				type: "spring",
				stiffness: 200,
				damping: 25,
				delay: 0.2,
			}}
		>
			<Collapsible open={isDocumentsOpen} onOpenChange={setIsDocumentsOpen}>
				<CollapsibleTrigger
					render={
						<Button
							type="button"
							className="group/add-recipients -my-2 flex w-full text-primary h-12 cursor-pointer items-center justify-between rounded-md border-0 bg-transparent p-2 text-left transition-colors hover:bg-accent/50"
						/>
					}
				>
					<h4 className="flex items-center gap-3">
						<PaperPlaneTiltIcon
							className={cn(
								"size-5 text-muted-foreground group-hover/add-docs:rotate-45 transition-transform duration-200",
								isDocumentsOpen && "rotate-45",
							)}
						/>
						Add files
					</h4>
					<CaretDownIcon
						className={cn(
							"size-4 text-muted-foreground transition-transform duration-200",
							isDocumentsOpen && "rotate-180",
						)}
						weight="bold"
					/>
				</CollapsibleTrigger>

				<CollapsibleContent className="mt-6">
					<input
						ref={fileInputRef}
						type="file"
						multiple
						onChange={handleFileInputChange}
						className="hidden"
						accept={ACCEPTED_FILE_EXTENSIONS.join(",")}
					/>

					<motion.div
						className={cn(
							"border-2 border-primary/20 rounded-lg p-16 text-center transition-colors bg-muted/5",
							isMonthlyQuotaExhausted &&
								"border-border/60 bg-muted/10 opacity-90",
							isDragOver && !isMonthlyQuotaExhausted
								? "border-primary bg-primary/5"
								: !isMonthlyQuotaExhausted &&
										"hover:border-muted-foreground/50",
						)}
						transition={{ duration: 0.2 }}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
					>
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								type: "spring",
								stiffness: 230,
								damping: 25,
								delay: 0.1,
							}}
							className="space-y-6"
						>
							<motion.div
								className="flex justify-center"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{
									type: "spring",
									stiffness: 230,
									damping: 25,
									delay: 0.2,
								}}
							>
								<motion.div
									className="p-6 rounded-full bg-muted"
									transition={{
										type: "spring",
										stiffness: 230,
										damping: 25,
										duration: 0.3,
									}}
								>
									<UploadIcon className="h-12 w-12 text-primary" />
								</motion.div>
							</motion.div>
							<motion.div
								className="space-y-4"
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{
									type: "spring",
									stiffness: 230,
									damping: 25,
									delay: 0.3,
								}}
							>
								<p className="text-muted-foreground">
									Drop PDFs or images here, or click Upload
								</p>
								<p className="text-xs text-muted-foreground">
									Files are prepared as PDF for signing.
								</p>
								<Button
									type="button"
									variant="primary"
									size="lg"
									className="gap-2 px-6 py-3"
									onClick={handleUploadClick}
									disabled={preparingFiles}
								>
									{preparingFiles ? (
										<>
											<InlineLoader className="size-4" />
											Preparing…
										</>
									) : (
										"Upload"
									)}
								</Button>
							</motion.div>
						</motion.div>
					</motion.div>

					{unsupportedFiles.length > 0 && (
						<p className="mt-2 text-sm text-destructive font-medium">
							Unsupported files: {unsupportedFiles.join(", ")}
						</p>
					)}

					{oversizedFiles.length > 0 && (
						<p className="mt-2 text-sm text-destructive font-medium">
							Files too large (max 10MB): {oversizedFiles.join(", ")}
						</p>
					)}

					{error && showError && (
						<motion.p
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							className="mt-2 text-sm text-destructive font-medium"
						>
							{error}
						</motion.p>
					)}

					{documents && documents.length > 0 && (
						<motion.div
							className="mt-4 space-y-4"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								type: "spring",
								stiffness: 230,
								damping: 25,
								delay: 0.1,
							}}
						>
							<div className="flex items-center justify-between">
								<h5 className="text-sm font-medium text-muted-foreground">
									Files ({documents.length})
								</h5>
								<ListGridViewToggle
									value={viewMode}
									onValueChange={handleViewModeChange}
								/>
							</div>

							{viewMode === "list" ? (
								<div className="space-y-2">
									{documents.map((file) => (
										<FileCard
											key={file.id}
											file={file}
											onRemove={removeFile}
											variant="list"
											delayPreview={isViewSwitching}
										/>
									))}
								</div>
							) : (
								<div className="max-h-96 overflow-auto">
									<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-1">
										{documents.map((file) => (
											<FileCard
												key={file.id}
												file={file}
												onRemove={removeFile}
												variant="grid"
												delayPreview={isViewSwitching}
											/>
										))}
									</div>
								</div>
							)}
						</motion.div>
					)}
				</CollapsibleContent>
			</Collapsible>
		</motion.section>
	);
}
