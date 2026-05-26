import type { FileInfo } from "@filosign/react/files";
import { DotsThreeVerticalIcon, FilePdfIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Button } from "@/src/lib/components/ui/button";
import { cn } from "@/src/lib/utils/utils";

interface RealFile {
	pieceCid: string;
	displayName?: string | null;
	mimeType?: string | null;
	ciphertextByteLength?: number | null;
	metadata?: {
		fileName?: string;
		fileSize?: number;
		fileType?: string;
		message?: string;
		originalId?: string;
		dataUrl?: string;
	};
	type?: "sent" | "received" | "org";
	createdAt?: Date;
	kemCiphertext?: string;
	encryptedEncryptionKey?: string;
	status?: string;
	[key: string]: unknown;
}

interface FileCardProps {
	file: RealFile;
	/** Batched from parent — avoids per-card useFileInfo N+1. */
	fileInfo?: FileInfo;
	onClick?: (file: RealFile) => void;
	variant?: "list" | "grid";
}

const FileIconComponent = FilePdfIcon;
const iconColor = "text-red-500";

export default function FileCard({
	file,
	onClick,
	variant = "grid",
}: FileCardProps) {
	const fileName =
		file.displayName?.trim() || file.metadata?.fileName || "Unknown File";
	const fileSize = file.ciphertextByteLength ?? file.metadata?.fileSize ?? 0;
	const fileType =
		file.mimeType?.trim() ||
		file.metadata?.fileType ||
		"application/octet-stream";

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
	};

	const formatDate = (date: Date) => {
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	const handleClick = () => {
		onClick?.(file);
	};

	const isImage = fileType.includes("image");
	const createdAt = file.createdAt ? new Date(file.createdAt) : new Date();

	if (variant === "grid") {
		return (
			<motion.div
				className="group bg-background border rounded-lg p-2 hover:bg-accent/50 transition-colors cursor-pointer"
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.2 }}
				onClick={handleClick}
			>
				<div className="aspect-[4/3] bg-muted rounded-md flex items-center justify-center mb-2 overflow-hidden">
					{isImage ? (
						<div className="text-muted-foreground text-xs text-center px-2">
							Preview after unlock
						</div>
					) : (
						<FileIconComponent className={cn("size-10", iconColor)} />
					)}
				</div>
				<div className="space-y-1">
					<p className="text-sm font-medium truncate" title={fileName}>
						{fileName}
					</p>
					<p className="text-xs text-muted-foreground">
						{formatFileSize(fileSize)} · {formatDate(createdAt)}
					</p>
				</div>
			</motion.div>
		);
	}

	return (
		<motion.div
			className="group flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
			initial={{ opacity: 0, x: -10 }}
			animate={{ opacity: 1, x: 0 }}
			onClick={handleClick}
		>
			<div className="size-10 shrink-0 flex items-center justify-center">
				<FileIconComponent className={cn("size-8", iconColor)} />
			</div>
			<div className="flex-1 min-w-0">
				<p className="font-medium truncate">{fileName}</p>
				<p className="text-sm text-muted-foreground">
					{formatFileSize(fileSize)} · {formatDate(createdAt)}
				</p>
			</div>
			<Button
				variant="ghost"
				size="icon"
				className="opacity-0 group-hover:opacity-100"
				onClick={(e) => e.stopPropagation()}
			>
				<DotsThreeVerticalIcon className="size-4" />
			</Button>
		</motion.div>
	);
}
