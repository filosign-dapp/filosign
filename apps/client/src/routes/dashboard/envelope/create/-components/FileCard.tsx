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
import { cn } from "@/src/lib/utils/utils";

type UploadedFile = {
	id: string;
	file: File;
	name: string;
	size: number;
	type: string;
};

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
	if (fileType.includes("image")) return "text-green-500";
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
	const FileIconComponent = getFileIcon(file.type);
	const iconColor = getFileTypeColor(file.type);

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

	const isImage = file.type.includes("image");
	const shouldShowPreview = isImage && !imageError && showPreview;

	// Grid variant
	if (variant === "grid") {
		return (
			<motion.div
				className="relative group bg-background border border-border rounded-lg p-2 w-full"
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
				{/* Remove button */}
				<Button
					type="button"
					variant="outline"
					size="icon"
					onClick={() => onRemove(file.id)}
					className="absolute top-4 right-4 size-6 p-0"
				>
					<XIcon className="h-3 w-3" />
				</Button>

				{/* Preview/Icon */}
				<div className="aspect-square mb-3 bg-muted/20 rounded-lg flex items-center justify-center overflow-hidden">
					{shouldShowPreview ? (
						<img
							src={URL.createObjectURL(file.file)}
							alt={file.name}
							className="w-full h-full object-cover"
							onError={() => setImageError(true)}
						/>
					) : (
						<div className="flex items-center justify-center w-full h-full">
							{isLoading && isImage ? (
								<Skeleton className="w-full h-full rounded-lg" />
							) : (
								<FileIconComponent className={cn("h-12 w-12", iconColor)} />
							)}
						</div>
					)}
				</div>

				{/* File info */}
				<div className="space-y-1">
					<p className="text-sm font-medium truncate" title={file.name}>
						{file.name}
					</p>
					<p className="text-xs text-muted-foreground">
						{formatFileSize(file.size)}
					</p>
				</div>
			</motion.div>
		);
	}

	// List variant
	return (
		<motion.div
			className="flex items-center justify-between p-2 bg-background border border-border rounded-lg"
			initial={{ opacity: 0, x: -20 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: 20 }}
			transition={{
				type: "spring",
				stiffness: 230,
				damping: 25,
				duration: 0.3,
			}}
		>
			<div className="flex items-center gap-3">
				{shouldShowPreview ? (
					<img
						src={URL.createObjectURL(file.file)}
						alt={file.name}
						className="size-10 object-cover rounded"
						onError={() => setImageError(true)}
					/>
				) : (
					<div className="flex items-center justify-center">
						{isLoading && isImage ? (
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
		</motion.div>
	);
}
