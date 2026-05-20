import { Button } from "@/src/lib/components/ui/button";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { cn } from "@/src/lib/utils/utils";
import { useSignatureCreate } from "@/src/routes/dashboard/signature/create/-lib/context/context";

interface SignatureOption {
	id: string;
	signature: string;
	initials: string;
	style: string;
}

function generateSignatureStyles(
	firstName: string,
	lastName: string,
	initials: string,
): SignatureOption[] {
	const fullName = `${firstName} ${lastName}`.trim();
	const styles = [
		"typed",
		"caveat",
		"gloria-hallelujah",
		"homemade-apple",
		"nothing-you-could-do",
		"reenie-beanie",
		"mr-dafoe",
	] as const;

	return styles.map((style) => ({
		id: style,
		style,
		signature: fullName,
		initials,
	}));
}

function getSignatureStyle(style: string) {
	const baseClasses = "text-foreground";

	switch (style) {
		case "typed":
			return `${baseClasses} font-mono text-sm`;
		case "caveat":
			return `${baseClasses} text-xl font-medium`;
		case "gloria-hallelujah":
			return `${baseClasses} text-lg`;
		case "homemade-apple":
			return `${baseClasses} text-xl`;
		case "nothing-you-could-do":
			return `${baseClasses} text-lg`;
		case "reenie-beanie":
			return `${baseClasses} text-2xl`;
		case "mr-dafoe":
			return `${baseClasses} text-2xl`;
		default:
			return baseClasses;
	}
}

function getInitialsStyle(style: string) {
	const baseClasses = "text-foreground";

	switch (style) {
		case "typed":
			return `${baseClasses} font-mono text-xs`;
		case "caveat":
			return `${baseClasses} text-lg font-medium`;
		case "gloria-hallelujah":
			return `${baseClasses} text-base`;
		case "homemade-apple":
			return `${baseClasses} text-lg`;
		case "nothing-you-could-do":
			return `${baseClasses} text-base`;
		case "reenie-beanie":
			return `${baseClasses} text-xl`;
		case "mr-dafoe":
			return `${baseClasses} text-xl`;
		default:
			return baseClasses;
	}
}

export function SignatureChoose() {
	const {
		firstName,
		setFirstName,
		lastName,
		setLastName,
		initials,
		selectedSignatureId,
		handleSignatureSelection,
		handleCreateSignature,
		isChooseDisabled,
	} = useSignatureCreate();

	const signatureOptions = generateSignatureStyles(
		firstName,
		lastName,
		initials,
	);
	const hasNames = firstName.trim().length > 0 && lastName.trim().length > 0;

	return (
		<div className="space-y-4">
			<h4 className="text-muted-foreground">Choose Signature Style</h4>

			<div className="grid gap-3 sm:grid-cols-2">
				<div className="space-y-1.5">
					<Label htmlFor="signature-first-name" className="text-xs">
						First name
					</Label>
					<Input
						id="signature-first-name"
						value={firstName}
						onChange={(e) => setFirstName(e.target.value)}
						placeholder="First name"
						autoComplete="given-name"
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="signature-last-name" className="text-xs">
						Last name
					</Label>
					<Input
						id="signature-last-name"
						value={lastName}
						onChange={(e) => setLastName(e.target.value)}
						placeholder="Last name"
						autoComplete="family-name"
					/>
				</div>
			</div>

			{!hasNames ? (
				<p className="text-sm text-muted-foreground">
					Enter your first and last name to preview signature styles.
				</p>
			) : (
				<div className="grid gap-3 max-h-80 overflow-y-auto border-2 border-dashed p-4 rounded-large hide-scrollbar">
					{signatureOptions.map((option) => (
						<button
							type="button"
							key={option.id}
							className={cn(
								"flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all hover:bg-card",
								selectedSignatureId === option.id
									? "border-primary/30 bg-primary/5"
									: "",
							)}
							onClick={() => handleSignatureSelection(option.id)}
						>
							<div className="flex-shrink-0">
								<div
									className={cn(
										"w-4 h-4 rounded-full border-2 flex items-center justify-center",
										selectedSignatureId === option.id
											? "border-primary bg-primary"
											: "border-muted-foreground",
									)}
								>
									{selectedSignatureId === option.id ? (
										<div className="w-2 h-2 rounded-full bg-primary-foreground" />
									) : null}
								</div>
							</div>

							<div className="flex-1 min-w-0">
								<div className="space-y-2">
									<div className="text-xs text-muted-foreground">
										Signed by:
									</div>
									<div
										className={cn(
											getSignatureStyle(option.style),
											`font-${option.style}`,
										)}
									>
										{option.signature}
									</div>
								</div>
							</div>

							<div className="flex-shrink-0 text-right">
								<div className="space-y-2">
									<div className="text-xs text-muted-foreground">DS</div>
									<div
										className={cn(
											getInitialsStyle(option.style),
											`font-${option.style}`,
										)}
									>
										{option.initials}
									</div>
								</div>
							</div>
						</button>
					))}
				</div>
			)}

			<div className="flex justify-end mx-auto max-w-6xl w-full gap-4">
				<Button variant="ghost" size="lg">
					<p className="hidden sm:block">Cancel</p>
				</Button>
				<Button
					variant="primary"
					size="lg"
					onClick={handleCreateSignature}
					disabled={isChooseDisabled}
				>
					Save
				</Button>
			</div>
		</div>
	);
}
