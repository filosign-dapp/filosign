import {
	INITIAL_RECT_ASPECT_RATIO,
	SIGNATURE_RECT_ASPECT_RATIO,
	type UserSignatureRole,
} from "@filosign/shared";
import { useCallback, useMemo, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";

async function cropImageDataUrl(args: {
	src: string;
	cropAreaPixels: Area;
}): Promise<string> {
	const image = await new Promise<HTMLImageElement>((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error("Failed to load image"));
		img.src = args.src;
	});

	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.round(args.cropAreaPixels.width));
	canvas.height = Math.max(1, Math.round(args.cropAreaPixels.height));
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Failed to prepare image crop canvas");

	ctx.drawImage(
		image,
		args.cropAreaPixels.x,
		args.cropAreaPixels.y,
		args.cropAreaPixels.width,
		args.cropAreaPixels.height,
		0,
		0,
		canvas.width,
		canvas.height,
	);

	return canvas.toDataURL("image/png", 1);
}

type SignatureUploadCropDialogProps = {
	isOpen: boolean;
	imageDataUrl: string | null;
	role: UserSignatureRole;
	onClose: () => void;
	onCropComplete: (croppedDataUrl: string) => void;
};

export function SignatureUploadCropDialog({
	isOpen,
	imageDataUrl,
	role,
	onClose,
	onCropComplete,
}: SignatureUploadCropDialogProps) {
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [cropAreaPixels, setCropAreaPixels] = useState<Area | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	const aspect = useMemo(
		() =>
			role === "initial"
				? INITIAL_RECT_ASPECT_RATIO
				: SIGNATURE_RECT_ASPECT_RATIO,
		[role],
	);

	const handleSave = useCallback(async () => {
		if (!imageDataUrl || !cropAreaPixels || isSaving) return;
		setIsSaving(true);
		try {
			const cropped = await cropImageDataUrl({
				src: imageDataUrl,
				cropAreaPixels,
			});
			onCropComplete(cropped);
		} finally {
			setIsSaving(false);
		}
	}, [cropAreaPixels, imageDataUrl, isSaving, onCropComplete]);

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-4xl">
				<DialogHeader>
					<DialogTitle>
						Crop {role === "initial" ? "initials" : "signature"}
					</DialogTitle>
				</DialogHeader>
				<div className="relative h-[360px] w-full overflow-hidden rounded-md border border-border/60 bg-black/80">
					{imageDataUrl ? (
						<Cropper
							image={imageDataUrl}
							crop={crop}
							zoom={zoom}
							aspect={aspect}
							showGrid
							onCropChange={setCrop}
							onZoomChange={setZoom}
							onCropComplete={(_, areaPixels) => setCropAreaPixels(areaPixels)}
						/>
					) : null}
				</div>
				<div className="space-y-2">
					<label
						htmlFor="signature-crop-zoom"
						className="text-xs text-muted-foreground"
					>
						Zoom
					</label>
					<input
						id="signature-crop-zoom"
						type="range"
						min={1}
						max={3}
						step={0.05}
						value={zoom}
						onChange={(e) => setZoom(Number(e.target.value))}
						className="w-full"
					/>
				</div>
				<DialogFooter className="gap-2">
					<Button variant="outline" onClick={onClose} disabled={isSaving}>
						Cancel
					</Button>
					<Button
						variant="primary"
						onClick={() => void handleSave()}
						disabled={isSaving}
					>
						{isSaving ? "Saving…" : "Apply crop"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
