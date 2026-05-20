import { SignatureIcon, TextAaIcon, TrashIcon } from "@phosphor-icons/react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { compressPng } from "@/src/lib/utils/compress-image";

const ACCEPTED_FILE_TYPES = [
	"image/gif",
	"image/jpeg",
	"image/png",
	"image/bmp",
];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

interface SignatureUploadProps {
	signatureData: string | null;
	initialsData: string | null;
	onSignatureUpload: (dataUrl: string) => void;
	onInitialsUpload: (dataUrl: string) => void;
	onSignatureClear: () => void;
	onInitialsClear: () => void;
	onCreateSignature: () => void;
	disabled?: boolean;
}

interface UploadAreaProps {
	icon: React.ReactNode;
	uploadedFile: string | null;
	onFileUpload: (dataUrl: string) => void;
	onFileClear: () => void;
}

function UploadArea({
	icon,
	uploadedFile,
	onFileUpload,
	onFileClear,
}: UploadAreaProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [error, setError] = useState<string | null>(null);

	const handleFileSelect = useCallback(
		async (file: File | null) => {
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

			try {
				// Compress the image before converting to data URL
				const compressedFile = await compressPng(file);

				const reader = new FileReader();
				reader.onload = () => {
					onFileUpload(reader.result as string);
				};
				reader.readAsDataURL(compressedFile);
			} catch (compressionError) {
				console.error("Image compression failed:", compressionError);
				// Fallback to original file if compression fails
				const reader = new FileReader();
				reader.onload = () => {
					onFileUpload(reader.result as string);
				};
				reader.readAsDataURL(file);
			}
		},
		[onFileUpload],
	);

	const handleFileInputChange = (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		handleFileSelect(event.target.files?.[0] || null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

	return (
		<div className="space-y-3">
			<input
				ref={fileInputRef}
				type="file"
				onChange={handleFileInputChange}
				className="hidden"
				accept={ACCEPTED_FILE_TYPES.join(",")}
			/>
			<button
				type="button"
				className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center min-h-[16rem] flex flex-col items-center justify-center bg-card w-full"
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
							<button
								type="button"
								className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 cursor-pointer"
								onClick={handleUploadClick}
							>
								Change
							</button>
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
		</div>
	);
}

export default function SignatureUpload({
	signatureData,
	initialsData,
	onSignatureUpload,
	onInitialsUpload,
	onSignatureClear,
	onInitialsClear,
	onCreateSignature,
	disabled = false,
}: SignatureUploadProps) {
	return (
		<div className="space-y-4">
			<h4 className="text-muted-foreground">Upload Signature</h4>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<UploadArea
					icon={<SignatureIcon className="size-16 text-muted-foreground" />}
					uploadedFile={signatureData}
					onFileUpload={onSignatureUpload}
					onFileClear={onSignatureClear}
				/>
				<UploadArea
					icon={<TextAaIcon className="size-16 text-muted-foreground" />}
					uploadedFile={initialsData}
					onFileUpload={onInitialsUpload}
					onFileClear={onInitialsClear}
				/>
			</div>
			<p className="text-sm text-muted-foreground">
				Accepted File Formats: GIF, JPG, PNG, BMP. Max file size 2MB.
			</p>
			<div className="flex gap-4 justify-end mx-auto w-full max-w-6xl">
				<Button variant="ghost" size="lg">
					<p className="hidden sm:block">Cancel</p>
				</Button>
				<Button
					variant="primary"
					size="lg"
					onClick={onCreateSignature}
					disabled={disabled}
				>
					Save
				</Button>
			</div>
		</div>
	);
}
