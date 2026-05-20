import { SignatureIcon, TextAaIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";

interface SignatureDrawProps {
	signatureData: string | null;
	initialsData: string | null;
	onSignatureDialogOpen: () => void;
	onInitialsDialogOpen: () => void;
	onSignatureClear: () => void;
	onInitialsClear: () => void;
	onCreateSignature: () => void;
	disabled?: boolean;
}

export default function SignatureDraw({
	signatureData,
	initialsData,
	onSignatureDialogOpen,
	onInitialsDialogOpen,
	onSignatureClear,
	onInitialsClear,
	onCreateSignature,
	disabled = false,
}: SignatureDrawProps) {
	return (
		<div className="space-y-4">
			<h4 className="text-muted-foreground">Draw Signature</h4>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{/* Signature drawing area */}
				<div className="space-y-3">
					<button
						type="button"
						className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center min-h-[16rem] flex flex-col items-center justify-center bg-card w-full"
						onClick={onSignatureDialogOpen}
					>
						{signatureData ? (
							<div className="space-y-3">
								<img
									src={signatureData}
									alt="Signature"
									className="object-contain max-w-full max-h-32"
								/>
								<div className="flex gap-2 justify-center">
									<Button variant="outline" size="sm">
										Edit Signature
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={onSignatureClear}
										className="text-destructive hover:text-destructive"
									>
										<TrashIcon className="size-4" />
									</Button>
								</div>
							</div>
						) : (
							<div className="flex flex-col justify-center items-center p-4 space-y-3">
								<SignatureIcon className="size-16 text-muted-foreground" />
								<p className="text-sm text-muted-foreground">
									Click to draw signature
								</p>
							</div>
						)}
					</button>
				</div>
				{/* Initials drawing area */}
				<div className="space-y-3">
					<button
						type="button"
						className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center min-h-[16rem] flex flex-col items-center justify-center w-full bg-card"
						onClick={onInitialsDialogOpen}
					>
						{initialsData ? (
							<div className="space-y-3">
								<img
									src={initialsData}
									alt="Initials"
									className="object-contain max-w-full max-h-32"
								/>
								<div className="flex gap-2 justify-center">
									<Button variant="outline" size="sm">
										Edit Initials
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={onInitialsClear}
										className="text-destructive hover:text-destructive"
									>
										<TrashIcon className="size-4" />
									</Button>
								</div>
							</div>
						) : (
							<div className="flex flex-col justify-center items-center p-4 space-y-3">
								<TextAaIcon className="size-16 text-muted-foreground" />
								<p className="text-sm text-muted-foreground">
									Click to draw initials
								</p>
							</div>
						)}
					</button>
				</div>
			</div>

			<p className="text-sm text-muted-foreground">WebP</p>

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
