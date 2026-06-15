import { buildSignatureFontOptions } from "@filosign/shared";
import { SignatureTypedPreview } from "@/src/lib/domains/signatures/preview";
import { SignaturePreviewShell } from "@/src/lib/domains/signatures/preview-shell";
import { cn } from "@/src/lib/utils/utils";
import { useSignatureCreate } from "@/src/routes/dashboard/signature/create/-lib/context/context";
import { SignatureSaveFooter } from "./signature-save-footer";

const PLACEHOLDER_NAME = "Your name";
const PLACEHOLDER_INITIALS = "AB";

export function SignatureChoose() {
	const {
		onboarding,
		fullName,
		initials,
		hasSignableName,
		selectedSignatureId,
		handleSignatureSelection,
		isChooseDisabled,
	} = useSignatureCreate();

	const previewName = hasSignableName ? fullName : PLACEHOLDER_NAME;
	const previewInitials = hasSignableName ? initials : PLACEHOLDER_INITIALS;

	const signatureOptions = buildSignatureFontOptions({
		signatureText: previewName,
		initialsText: previewInitials,
	});

	return (
		<div className="space-y-4">
			<h4 className="text-muted-foreground">Choose Signature Style</h4>

			{onboarding ? (
				<div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
					{hasSignableName ? (
						<span>
							Signing as{" "}
							<span className="font-medium text-foreground">{fullName}</span>
						</span>
					) : (
						<span>Add your first name to choose a signature style.</span>
					)}
				</div>
			) : null}

			<div className="grid gap-3 rounded-large border-2 border-dashed p-4 sm:grid-cols-2">
				{signatureOptions.map((option) => (
					<button
						type="button"
						key={option.id}
						className={cn(
							"grid grid-cols-[auto_1fr_auto] grid-rows-[auto_auto_auto] items-center gap-x-4 gap-y-1 rounded-lg border p-4 text-left transition-all hover:bg-card",
							selectedSignatureId === option.id
								? "border-primary/30 bg-primary/5"
								: "",
							!hasSignableName && "opacity-80",
						)}
						onClick={() => handleSignatureSelection(option.id)}
					>
						<div
							className={cn(
								"row-span-3 flex size-4 shrink-0 items-center justify-center self-center rounded-full border-2",
								selectedSignatureId === option.id
									? "border-primary bg-primary"
									: "border-muted-foreground",
							)}
						>
							{selectedSignatureId === option.id ? (
								<div className="size-2 rounded-full bg-primary-foreground" />
							) : null}
						</div>

						<div className="col-span-2 text-xs text-muted-foreground">
							{option.label}
						</div>

						<div className="text-xs text-muted-foreground">Signed by:</div>
						<div className="text-xs text-muted-foreground text-right">
							Initials:
						</div>

						<SignaturePreviewShell
							signatureRole="signature"
							className="h-12 min-w-0 w-full max-w-full"
						>
							<SignatureTypedPreview
								fontId={option.id}
								text={option.signature}
								signatureRole="signature"
								muted={!hasSignableName}
								inPreviewShell
							/>
						</SignaturePreviewShell>

						<SignaturePreviewShell
							signatureRole="initial"
							className="h-12 w-20 shrink-0 justify-self-end"
						>
							<SignatureTypedPreview
								fontId={option.id}
								text={option.initials}
								signatureRole="initial"
								muted={!hasSignableName}
								inPreviewShell
							/>
						</SignaturePreviewShell>
					</button>
				))}
			</div>

			<SignatureSaveFooter saveDisabled={isChooseDisabled} />
		</div>
	);
}
