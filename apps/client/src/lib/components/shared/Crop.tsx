import { useCallback, useEffect, useMemo, useState } from "react";
import Cropper from "react-easy-crop";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

type AspectRatio =
	| "square"
	| "portrait"
	| "landscape"
	| "banner"
	| "wide"
	| "custom";

type Props = {
	isOpen: boolean;
	onClose: () => void;
	image: File;
	onCrop: (croppedFile: File, aspectRatio: AspectRatio) => void;
	initialAspectRatio?: AspectRatio;
	allowedAspectRatios?: AspectRatio[];
};

// Maximum dimensions for web images
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

const aspectRatioOptions: Record<
	AspectRatio,
	{ value: number; label: string }
> = {
	square: { value: 1, label: "Square (1:1)" },
	portrait: { value: 3 / 4, label: "Portrait (3:4)" },
	landscape: { value: 4 / 3, label: "Landscape (4:3)" },
	banner: { value: 3, label: "Banner (3:1)" },
	wide: { value: 16 / 9, label: "Wide (16:9)" },
	custom: { value: 0, label: "Free" },
};

export default function Crop({
	isOpen,
	onClose,
	image,
	onCrop,
	initialAspectRatio = "square",
	allowedAspectRatios = [
		"square",
		"portrait",
		"landscape",
		"banner",
		"wide",
		"custom",
	],
}: Props) {
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [aspectRatio, setAspectRatio] =
		useState<AspectRatio>(initialAspectRatio);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
		x: number;
		y: number;
		width: number;
		height: number;
	} | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Memoize the image URL to prevent recreating it on every render
	const imageUrl = useMemo(() => URL.createObjectURL(image), [image]);

	// Cleanup the object URL when component unmounts or image changes
	useEffect(() => {
		return () => {
			URL.revokeObjectURL(imageUrl);
		};
	}, [imageUrl]);

	// Filter allowed aspect ratios
	const filteredAspectRatios = useMemo(() => {
		return allowedAspectRatios.filter((ratio) =>
			Object.keys(aspectRatioOptions).includes(ratio),
		);
	}, [allowedAspectRatios]);

	const onCropComplete = useCallback(
		(croppedAreaPixels: {
			x: number;
			y: number;
			width: number;
			height: number;
		}) => {
			setCroppedAreaPixels(croppedAreaPixels);
		},
		[],
	);

	const createImage = useCallback(
		(url: string): Promise<HTMLImageElement> =>
			new Promise((resolve, reject) => {
				const img = new Image();
				img.crossOrigin = "anonymous";
				img.addEventListener("load", () => resolve(img));
				img.addEventListener("error", () => {
					reject(new Error("Failed to load image"));
				});
				img.src = url;
			}),
		[],
	);

	const getCroppedImg = useCallback(
		async (
			imageSrc: string,
			pixelCrop: { x: number; y: number; width: number; height: number },
		) => {
			const img = await createImage(imageSrc);
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");

			if (!ctx) {
				throw new Error("No 2d context available");
			}

			// Calculate dimensions while maintaining aspect ratio
			let width = pixelCrop.width;
			let height = pixelCrop.height;

			// Scale down if dimensions exceed maximum
			if (width > MAX_WIDTH || height > MAX_HEIGHT) {
				const scale = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
				width = Math.round(width * scale);
				height = Math.round(height * scale);
			}

			// Set canvas size to match the crop size
			canvas.width = width;
			canvas.height = height;

			// Use imageSmoothingQuality for better performance
			ctx.imageSmoothingQuality = "medium";
			ctx.imageSmoothingEnabled = true;

			ctx.drawImage(
				img,
				pixelCrop.x,
				pixelCrop.y,
				pixelCrop.width,
				pixelCrop.height,
				0,
				0,
				width,
				height,
			);

			return new Promise<File>((resolve, reject) => {
				let quality = 0.8;
				const maxAttempts = 10;
				let attempts = 0;

				const compressImage = () => {
					attempts++;
					canvas.toBlob(
						(blob) => {
							if (!blob) {
								reject(new Error("Failed to create image blob"));
								return;
							}

							// If file is still too large and we haven't tried too many times, reduce quality
							if (
								blob.size > MAX_FILE_SIZE &&
								quality > 0.1 &&
								attempts < maxAttempts
							) {
								quality -= 0.1;
								compressImage();
							} else {
								const fileName = `${image.name.replace(/\.[^/.]+$/, "")}.jpg`;
								const file = new File([blob], fileName, {
									type: "image/jpeg",
									lastModified: Date.now(),
								});
								resolve(file);
							}
						},
						"image/jpeg",
						quality,
					);
				};

				compressImage();
			});
		},
		[createImage, image.name],
	);

	const handleCrop = useCallback(async () => {
		if (!croppedAreaPixels) {
			toast.error("Please select an area to crop");
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const croppedImage = await getCroppedImg(imageUrl, croppedAreaPixels);
			onCrop(croppedImage, aspectRatio);
			onClose();
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to crop image";
			setError(errorMessage);
			toast.error(errorMessage);
		} finally {
			setIsLoading(false);
		}
	}, [
		croppedAreaPixels,
		imageUrl,
		aspectRatio,
		onCrop,
		onClose,
		getCroppedImg,
	]);

	const handleImageLoad = () => {
		setIsLoading(false);
		setError(null);
	};

	const handleImageError = () => {
		setIsLoading(false);
		setError("Failed to load image. Please try a different file.");
		toast.error("Failed to load image");
	};

	const handleZoomChange = (value: number) => {
		setZoom(Math.max(1, Math.min(3, value)));
	};

	// Get current aspect ratio value
	const currentAspectRatioValue =
		aspectRatio === "custom"
			? undefined // Pass undefined to disable aspect ratio constraint
			: aspectRatioOptions[aspectRatio]?.value;

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-3xl">
				<DialogHeader className="pt-6">
					<DialogTitle>Crop Image</DialogTitle>
				</DialogHeader>

				{error ? (
					<div className="py-8 text-center">
						<p className="text-destructive mb-4">{error}</p>
						<Button variant="outline" onClick={onClose}>
							Close
						</Button>
					</div>
				) : (
					<>
						<div className="relative h-[500px] w-full bg-black">
							{isLoading && (
								<div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
									<div className="text-white text-sm">Loading image...</div>
								</div>
							)}
							<img
								src={imageUrl}
								alt=""
								className="hidden"
								onLoad={handleImageLoad}
								onError={handleImageError}
							/>
							<Cropper
								image={imageUrl}
								crop={crop}
								zoom={zoom}
								aspect={currentAspectRatioValue}
								onCropChange={setCrop}
								onZoomChange={handleZoomChange}
								onCropComplete={onCropComplete}
								objectFit="contain"
								showGrid={true}
							/>
						</div>

						{filteredAspectRatios.length > 1 && (
							<div className="flex flex-col gap-2 py-4">
								<label
									htmlFor="aspect-ratio-toggle"
									className="text-sm font-medium"
								>
									Aspect Ratio
								</label>
								<ToggleGroup
									value={aspectRatio ? [aspectRatio] : []}
									onValueChange={(values: readonly string[]) => {
										if (values && values.length > 0)
											setAspectRatio(values[0] as AspectRatio);
									}}
									className="justify-start flex-wrap"
								>
									{filteredAspectRatios.map((ratio) => (
										<ToggleGroupItem
											key={ratio}
											value={ratio}
											aria-label={aspectRatioOptions[ratio]?.label}
										>
											<span className="hidden sm:inline">
												{aspectRatioOptions[ratio]?.label}
											</span>
										</ToggleGroupItem>
									))}
								</ToggleGroup>
							</div>
						)}

						<div className="flex flex-col gap-2 py-2">
							<label htmlFor="zoom-input" className="text-sm font-medium">
								Zoom
							</label>
							<div className="flex items-center gap-2">
								<span className="text-xs text-muted-foreground">-</span>
								<input
									id="zoom-input"
									type="range"
									value={zoom}
									min={1}
									max={3}
									step={0.1}
									aria-label="Zoom level"
									onChange={(e) => handleZoomChange(Number(e.target.value))}
									className="w-full"
								/>
								<span className="text-xs text-muted-foreground">+</span>
							</div>
						</div>

						<DialogFooter className="px-6 pb-2">
							<Button variant="outline" onClick={onClose} disabled={isLoading}>
								Cancel
							</Button>
							<Button
								onClick={handleCrop}
								disabled={isLoading || !croppedAreaPixels}
							>
								{isLoading ? "Processing..." : "Crop & Save"}
							</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
