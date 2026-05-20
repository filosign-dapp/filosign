import type { FileInfo } from "@filosign/react/files";
import { useViewFile } from "@filosign/react/files";
import {
	DotsThreeVerticalIcon,
	FilePdfIcon,
	SpinnerGapIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Image } from "@/src/lib/components/app/media/image";
import { Button } from "@/src/lib/components/ui/button";
import { filosignKeys } from "@/src/lib/query/query-keys";
import { cn } from "@/src/lib/utils/utils";

interface RealFile {
	pieceCid: string;
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

// All files are treated as PDFs for now
const FileIconComponent = FilePdfIcon;
const iconColor = "text-red-500";

export default function FileCard({
	file,
	fileInfo: fileInfoProp,
	onClick,
	variant = "grid",
}: FileCardProps) {
	const fileInfo = fileInfoProp;
	const kemCiphertext = file.kemCiphertext || fileInfo?.kemCiphertext;
	const encryptedEncryptionKey =
		file.encryptedEncryptionKey || fileInfo?.encryptedEncryptionKey;
	const status = file.status || fileInfo?.status;

	const orgDecryptEligible = Boolean(
		fileInfo?.organizationId &&
			fileInfo.orgKemCiphertext &&
			fileInfo.orgEncryptedEncryptionKey &&
			!(kemCiphertext && encryptedEncryptionKey),
	);

	const participantDecryptEligible = Boolean(
		kemCiphertext && encryptedEncryptionKey,
	);

	const { mutateAsync: viewFileMutate } = useViewFile();

	const { data: actualMetadata, isLoading } = useQuery({
		queryKey: filosignKeys.decryptedFileMetadata(
			file.pieceCid,
			orgDecryptEligible,
		),
		queryFn: async () => {
			if (!status) throw new Error("Missing status");

			let res: Awaited<ReturnType<typeof viewFileMutate>>;

			if (participantDecryptEligible) {
				if (!kemCiphertext || !encryptedEncryptionKey) {
					throw new Error("Missing keys");
				}
				res = await viewFileMutate({
					pieceCid: file.pieceCid,
					kemCiphertext,
					encryptedEncryptionKey,
					status: status as "s3" | "foc",
				});
			} else if (orgDecryptEligible) {
				const oid = fileInfo?.organizationId;
				const okc = fileInfo?.orgKemCiphertext;
				const ocek = fileInfo?.orgEncryptedEncryptionKey;
				if (!oid || !okc || !ocek) {
					throw new Error("Missing org decryption material");
				}
				res = await viewFileMutate({
					variant: "org",
					pieceCid: file.pieceCid,
					organizationId: oid,
					orgKemCiphertext: okc,
					orgEncryptedEncryptionKey: ocek,
					status: status as "s3" | "foc",
				});
			} else {
				throw new Error("Missing keys");
			}

			let dataUrl: string | undefined;
			if (res.metadata.mimeType?.includes("image")) {
				const blob = new Blob([res.fileBytes.buffer as ArrayBuffer], {
					type: res.metadata.mimeType,
				});
				dataUrl = URL.createObjectURL(blob);
			}

			return {
				fileName: res.metadata.name,
				fileType: res.metadata.mimeType || "application/octet-stream",
				fileSize: res.fileBytes.byteLength,
				dataUrl,
			};
		},
		enabled: !!status && (participantDecryptEligible || orgDecryptEligible),
		staleTime: Infinity,
		gcTime: 1000 * 60 * 60 * 24,
	});

	const fileName =
		actualMetadata?.fileName || file.metadata?.fileName || "Unknown File";
	const fileSize = actualMetadata?.fileSize || file.metadata?.fileSize || 0;
	const fileType =
		actualMetadata?.fileType ||
		file.metadata?.fileType ||
		"application/octet-stream";
	const previewDataUrl = actualMetadata?.dataUrl || file.metadata?.dataUrl;

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
	const shouldShowPreview = isImage && !!previewDataUrl;

	// Grid variant
	if (variant === "grid") {
		return (
			<motion.div
				className="group bg-background border rounded-lg p-2 hover:bg-accent/50 transition-colors cursor-pointer"
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{
					type: "spring",
					stiffness: 230,
					damping: 25,
					duration: 0.3,
				}}
				onClick={handleClick}
			>
				{/* Preview/Icon */}
				<div className="aspect-square mb-2 bg-card rounded-md flex items-center justify-center">
					{isLoading ? (
						<SpinnerGapIcon className="size-6 animate-spin text-muted-foreground/50" />
					) : shouldShowPreview ? (
						<Image
							src={previewDataUrl}
							alt={fileName}
							className="w-full h-full object-cover object-top rounded-md"
						/>
					) : (
						<FileIconComponent className={cn("size-8", iconColor)} />
					)}
				</div>

				{/* File info */}
				<div className="space-y-0.5 min-w-0">
					<p className="text-xs font-medium truncate" title={fileName}>
						{fileName}
					</p>
					<p className="text-[10px] text-muted-foreground truncate">
						{formatFileSize(fileSize)}
					</p>
				</div>
			</motion.div>
		);
	}

	// List variant
	return (
		<motion.div
			className="flex items-center justify-between p-3 bg-background border border-border rounded-lg hover:bg-muted/20 transition-colors cursor-pointer"
			initial={{ opacity: 0, x: -20 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{
				type: "spring",
				stiffness: 230,
				damping: 25,
				duration: 0.3,
			}}
			onClick={handleClick}
		>
			<div className="flex items-center justify-between w-full">
				<div className="flex items-center gap-3">
					{isLoading ? (
						<div className="p-2 bg-muted/20 rounded-lg flex items-center justify-center size-10">
							<SpinnerGapIcon className="size-5 animate-spin text-muted-foreground/50" />
						</div>
					) : shouldShowPreview ? (
						<Image
							src={previewDataUrl}
							alt={fileName}
							className="size-10 object-cover object-top rounded-lg"
							width={200}
							height={200}
						/>
					) : (
						<div className="p-2 bg-muted/20 rounded-lg">
							<FileIconComponent className={cn("size-6", iconColor)} />
						</div>
					)}
					<div className="min-w-0 flex-1">
						<p className="text-sm font-medium truncate" title={fileName}>
							{fileName}
						</p>
						<p className="text-xs text-muted-foreground truncate">
							{formatFileSize(fileSize)} •{" "}
							{file.createdAt ? formatDate(file.createdAt) : "Unknown date"}
						</p>
					</div>
				</div>

				<Button
					variant="ghost"
					size="icon"
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
					}}
				>
					<DotsThreeVerticalIcon className="size-5" />
				</Button>
			</div>
		</motion.div>
	);
}
