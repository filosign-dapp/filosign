import { buildSignatureFontOptions } from "@filosign/shared";
import { SignatureTypedPreview } from "@/src/lib/domains/signatures/preview";
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
						<span>Add your first name to sign with a typed signature.</span>
					)}
				</div>
			) : null}

			<div className="grid gap-3 rounded-large border-2 border-dashed p-4 sm:grid-cols-2">
				{signatureOptions.map((option) => (
					<button
						type="button"
						key={option.id}
						className={cn(
							"flex items-center gap-4 rounded-lg border p-4 text-left transition-all hover:bg-card",
							selectedSignatureId === option.id
								? "border-primary/30 bg-primary/5"
								: "",
							!hasSignableName && "opacity-80",
						)}
						onClick={() => handleSignatureSelection(option.id)}
					>
						<div className="shrink-0">
							<div
								className={cn(
									"flex size-4 items-center justify-center rounded-full border-2",
									selectedSignatureId === option.id
										? "border-primary bg-primary"
										: "border-muted-foreground",
								)}
							>
								{selectedSignatureId === option.id ? (
									<div className="size-2 rounded-full bg-primary-foreground" />
								) : null}
							</div>
						</div>

						<div className="min-w-0 flex-1">
							<div className="space-y-1">
								<div className="text-xs text-muted-foreground">
									{option.label}
								</div>
								<div className="text-xs text-muted-foreground">Signed by:</div>
								<SignatureTypedPreview
									fontId={option.id}
									text={option.signature}
									signatureRole="signature"
									muted={!hasSignableName}
								/>
							</div>
						</div>

						<div className="shrink-0 text-right">
							<div className="space-y-1">
								<div className="text-xs text-muted-foreground">DS</div>
								<SignatureTypedPreview
									fontId={option.id}
									text={option.initials}
									signatureRole="initial"
									muted={!hasSignableName}
									className="text-right"
								/>
							</div>
						</div>
					</button>
				))}
			</div>

			<SignatureSaveFooter saveDisabled={isChooseDisabled} />
		</div>
	);
}
