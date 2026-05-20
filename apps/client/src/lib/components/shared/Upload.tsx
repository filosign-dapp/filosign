import { useEffect, useState } from "react";
import { toast } from "sonner";
import Crop from "./Crop";
import { Image } from "./Image";

interface IProps {
	setImage: (file: File) => void;
	maxFileSize?: number; // in bytes, default 5MB
	acceptedTypes?: string[]; // default ["image/jpeg", "image/png", "image/webp"]
}

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_ACCEPTED_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
];

export default function Upload({
	setImage,
	maxFileSize = DEFAULT_MAX_FILE_SIZE,
	acceptedTypes = DEFAULT_ACCEPTED_TYPES,
}: IProps) {
	const [file, setFile] = useState<File>();
	const [preview, setPreview] = useState<string | null>(null);
	const [showCropDialog, setShowCropDialog] = useState(false);
	const [tempFile, setTempFile] = useState<File | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		file && setImage(file);
	}, [file, setImage]);

	const validateFile = (selectedFile: File): string | null => {
		// Check file size
		if (selectedFile.size > maxFileSize) {
			const maxSizeMB = (maxFileSize / 1024 / 1024).toFixed(1);
			return `File too large. Maximum size is ${maxSizeMB}MB.`;
		}

		// Check file type
		if (!acceptedTypes.includes(selectedFile.type)) {
			const acceptedExtensions = acceptedTypes
				.map((type) => type.split("/")[1]?.toUpperCase())
				.filter(Boolean)
				.join(", ");
			return `Invalid file type. Accepted: ${acceptedExtensions}`;
		}

		return null;
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		setError(null);

		if (!selectedFile) return;

		const validationError = validateFile(selectedFile);
		if (validationError) {
			setError(validationError);
			toast.error(validationError);
			// Reset input
			e.target.value = "";
			return;
		}

		setTempFile(selectedFile);
		setShowCropDialog(true);
	};

	const handleCrop = (croppedFile: File) => {
		setFile(croppedFile);
		setPreview(URL.createObjectURL(croppedFile));
		setShowCropDialog(false);
		setTempFile(null);
		setError(null);
	};

	const handleCancel = () => {
		setShowCropDialog(false);
		setTempFile(null);
	};

	const acceptedTypesString = acceptedTypes.join(",");
	const acceptedExtensions = acceptedTypes
		.map((type) => type.split("/")[1])
		.filter(Boolean)
		.join(", ");

	return (
		<div className="p-4 rounded-xl bg-card w-full max-w-sm">
			<input
				type="file"
				onChange={handleFileSelect}
				className="hidden"
				id="fileInput"
				accept={acceptedTypesString}
			/>
			<label
				htmlFor="fileInput"
				className="block text-center py-2 border border-dashed border-primary/50 rounded-lg cursor-pointer hover:bg-background text-foreground/60 text-xs"
			>
				{file && <p>Click to change</p>}
				{file ? (
					<span className="block truncate px-2">{file.name}</span>
				) : (
					<span>Choose an image ({acceptedExtensions})</span>
				)}
			</label>

			{error && (
				<p className="text-xs text-destructive mt-2 text-center" role="alert">
					{error}
				</p>
			)}

			{preview && (
				<Image
					src={preview}
					alt="Preview"
					className="mt-2 mx-auto w-1/2 aspect-square object-contain rounded-lg"
				/>
			)}
			{tempFile && (
				<Crop
					isOpen={showCropDialog}
					onClose={handleCancel}
					image={tempFile}
					onCrop={handleCrop}
				/>
			)}
		</div>
	);
}
