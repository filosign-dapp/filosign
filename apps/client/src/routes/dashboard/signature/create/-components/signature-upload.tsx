import type { UserSignatureRole } from "@filosign/shared";
import { SignatureIcon, TextAaIcon, TrashIcon } from "@phosphor-icons/react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { compressPng } from "@/src/lib/utils/compress-image";
import { useSignatureCreate } from "@/src/routes/dashboard/signature/create/-lib/context/context";
import { SignatureRoleSaveButton } from "./signature-role-save-button";
import { SignatureUploadCropDialog } from "./signature-upload-crop-dialog";

const ACCEPTED_FILE_TYPES = [
	"image/gif",
	"image/jpeg",
	"image/png",
	"image/bmp",
];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

interface UploadAreaProps {
	icon: React.ReactNode;
	signatureRole: UserSignatureRole;
	uploadedFile: string | null;
	onFileUpload: (dataUrl: string) => void;
	onFileClear: () => void;
	label: string;
}

function UploadArea({
	icon,
	signatureRole,
	uploadedFile,
	onFileUpload,
	onFileClear,
	label,
}: UploadAreaProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [error, setError] = useState<string | null>(null);
	const [pendingCropImage, setPendingCropImage] = useState<string | null>(null);
	const [cropDialogOpen, setCropDialogOpen] = useState(false);

	const handleFileSelect = useCallback(async (file: File | null) => {
		if (!file) return;

		setError(null);

		if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
			setError("Unsupported file format.");
			return;
		}

		if (file.size > MAX_FILE_SIZE) {
			setError("File is too large (max 2MB).");
			return;
		}

		const readAsDataUrl = (input: File) =>
			new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(String(reader.result ?? ""));
				reader.onerror = () =>
					reject(new Error("Failed to read selected file"));
				reader.readAsDataURL(input);
			});

		try {
			const compressedFile = await compressPng(file);
			const dataUrl = await readAsDataUrl(compressedFile);
			setPendingCropImage(dataUrl);
			setCropDialogOpen(true);
		} catch {
			const dataUrl = await readAsDataUrl(file);
			setPendingCropImage(dataUrl);
			setCropDialogOpen(true);
		}
	}, []);

	const handleFileInputChange = (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		void handleFileSelect(event.target.files?.[0] ?? null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

	return (
		<div className="space-y-3">
			<p className="text-xs text-muted-foreground">{label}</p>
			<input
				ref={fileInputRef}
				type="file"
				onChange={handleFileInputChange}
				className="hidden"
				accept={ACCEPTED_FILE_TYPES.join(",")}
			/>
			<button
				type="button"
				className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center min-h-64 flex flex-col items-center justify-center bg-card w-full"
				onClick={handleUploadClick}
			>
				{uploadedFile ? (
					<div className="space-y-3">
						<img
							src={uploadedFile}
							alt="Uploaded preview"
							className="object-contain max-w-full max-h-32"
						/>
						<div className="flex gap-2 justify-center">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleUploadClick}
							>
								Change
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={onFileClear}
								className="text-destructive hover:text-destructive"
							>
								<TrashIcon className="size-4" />
							</Button>
						</div>
					</div>
				) : (
					<div className="flex flex-col justify-center items-center p-4 space-y-3 bg-card rounded-large">
						{icon}
						<p className="text-sm text-muted-foreground">
							Click to upload file
						</p>
					</div>
				)}
			</button>
			{error && <p className="text-sm text-center text-destructive">{error}</p>}
			<SignatureRoleSaveButton
				signatureRole={signatureRole}
				disabled={!uploadedFile}
			/>
			<SignatureUploadCropDialog
				isOpen={cropDialogOpen}
				imageDataUrl={pendingCropImage}
				role={signatureRole}
				onClose={() => {
					setCropDialogOpen(false);
					setPendingCropImage(null);
				}}
				onCropComplete={(croppedDataUrl) => {
					onFileUpload(croppedDataUrl);
					setCropDialogOpen(false);
					setPendingCropImage(null);
				}}
			/>
		</div>
	);
}

export function SignatureUpload() {
	const {
		signatureData,
		initialsData,
		handleSignatureUpload,
		handleInitialsUpload,
		handleClearSignature,
		handleClearInitials,
	} = useSignatureCreate();

	return (
		<div className="space-y-4">
			<h4 className="text-muted-foreground">Upload Signature</h4>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<UploadArea
					icon={<SignatureIcon className="size-16 text-muted-foreground" />}
					signatureRole="signature"
					uploadedFile={signatureData}
					onFileUpload={handleSignatureUpload}
					onFileClear={handleClearSignature}
					label="Signature"
				/>
				<UploadArea
					icon={<TextAaIcon className="size-16 text-muted-foreground" />}
					signatureRole="initial"
					uploadedFile={initialsData}
					onFileUpload={handleInitialsUpload}
					onFileClear={handleClearInitials}
					label="Initials (optional)"
				/>
			</div>
			<p className="text-sm text-muted-foreground">
				Accepted File Formats: GIF, JPG, PNG, BMP. Max file size 2MB.
			</p>
		</div>
	);
}
