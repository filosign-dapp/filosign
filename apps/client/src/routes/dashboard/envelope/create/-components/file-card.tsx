import {
	FileDocIcon,
	FileIcon,
	FileImageIcon,
	FilePdfIcon,
	FileTextIcon,
	XIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { Skeleton } from "@/src/lib/components/ui/skeleton";
import type { UploadedFile } from "@/src/lib/domains/files/envelope-form-types";
import { cn } from "@/src/lib/utils/utils";
import { useObjectUrl } from "@/src/routes/dashboard/envelope/create/-lib/hooks/use-object-url";

interface FileCardProps {
	file: UploadedFile;
	onRemove: (fileId: string) => void;
	variant?: "list" | "grid";
	delayPreview?: boolean;
}

const getFileIcon = (fileType: string) => {
	if (fileType.includes("pdf")) return FilePdfIcon;
	if (fileType.includes("doc") || fileType.includes("word")) return FileDocIcon;
	if (
		fileType.includes("image") ||
		fileType.includes("jpg") ||
		fileType.includes("jpeg") ||
		fileType.includes("png") ||
		fileType.includes("gif")
	)
		return FileImageIcon;
	if (fileType.includes("text") || fileType.includes("txt"))
		return FileTextIcon;
	return FileIcon;
};

const getFileTypeColor = (fileType: string) => {
	if (fileType.includes("pdf")) return "text-red-500";
	if (fileType.includes("doc") || fileType.includes("word"))
		return "text-blue-500";
	if (fileType.includes("image")) return "text-secondary";
	if (fileType.includes("text")) return "text-gray-500";
	return "text-primary";
};

export default function FileCard({
	file,
	onRemove,
	variant = "list",
	delayPreview = false,
}: FileCardProps) {
	const [imageError, setImageError] = useState(false);
	const [showPreview, setShowPreview] = useState(!delayPreview);
	const [isLoading, setIsLoading] = useState(delayPreview);
	const displayMimeType = file.sourceMimeType ?? file.type;
	const FileIconComponent = getFileIcon(displayMimeType);
	const iconColor = getFileTypeColor(displayMimeType);

	// Delay preview loading to avoid interfering with animations
	useEffect(() => {
		if (delayPreview) {
			setIsLoading(true);
			setShowPreview(false);
			const timer = setTimeout(() => {
				setIsLoading(false);
				setShowPreview(true);
			}, 300);

			return () => clearTimeout(timer);
		} else {
			setIsLoading(false);
			setShowPreview(true);
		}
	}, [delayPreview]);

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
	};

	const isImagePreviewable = file.type.includes("image");
	const previewUrl = useObjectUrl(isImagePreviewable ? file.file : null);
	const shouldShowPreview =
		isImagePreviewable && !imageError && showPreview && previewUrl != null;

	// Grid variant
	if (variant === "grid") {
		return (
			<motion.div
				className="group relative w-full overflow-hidden rounded-lg border border-border bg-background"
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				exit={{ opacity: 0, scale: 0.9 }}
				transition={{
					type: "spring",
					stiffness: 230,
					damping: 25,
					duration: 0.3,
				}}
			>
				<Button
					type="button"
					variant="outline"
					size="icon-sm"
					onClick={() => onRemove(file.id)}
					className="absolute top-1 right-1 z-10 size-6 bg-background/90 p-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
					aria-label={`Remove ${file.name}`}
				>
					<XIcon className="size-3" />
				</Button>

				<div className="relative flex h-32 w-full items-center justify-center overflow-hidden bg-muted/20 sm:h-48">
					{shouldShowPreview ? (
						<img
							src={previewUrl}
							alt={file.name}
							className="size-full object-cover"
							onError={() => setImageError(true)}
						/>
					) : isLoading && isImagePreviewable ? (
						<Skeleton className="size-full rounded-none" />
					) : (
						<FileIconComponent
							className={cn("size-12 sm:size-14", iconColor)}
						/>
					)}
				</div>

				<div className="space-y-2 border-t border-border/50 px-4 py-4">
					<p
						className="truncate text-sm font-medium leading-normal"
						title={file.name}
					>
						{file.name}
					</p>
					<p className="truncate text-xs leading-normal text-muted-foreground">
						{formatFileSize(file.size)}
					</p>
				</div>
			</motion.div>
		);
	}

	// List variant
	return (
		<div className="flex items-center justify-between p-2 bg-background border border-border rounded-lg">
			<div className="flex items-center gap-3">
				{shouldShowPreview ? (
					<img
						src={previewUrl}
						alt={file.name}
						className="size-10 object-cover rounded"
						onError={() => setImageError(true)}
					/>
				) : (
					<div className="flex items-center justify-center">
						{isLoading && isImagePreviewable ? (
							<Skeleton className="size-10 rounded" />
						) : (
							<FileIconComponent
								className={cn(
									"size-10",
									iconColor,
									"bg-muted/20 p-2 rounded-lg",
								)}
							/>
						)}
					</div>
				)}
				<div>
					<p className="text-sm font-medium">{file.name}</p>
					<p className="text-xs text-muted-foreground">
						{formatFileSize(file.size)}
					</p>
				</div>
			</div>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				onClick={() => onRemove(file.id)}
				className="size-6 p-0"
			>
				<XIcon className="size-4" />
			</Button>
		</div>
	);
}
