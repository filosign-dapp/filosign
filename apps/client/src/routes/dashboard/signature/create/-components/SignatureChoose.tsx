import { useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { cn } from "@/src/lib/utils/utils";

interface SignatureOption {
	id: string;
	signature: string;
	initials: string;
	style: string;
}

interface SignatureChooseProps {
	firstName: string;
	lastName: string;
	initials: string;
	selectedSignatureId?: string;
	onSignatureSelection: (selectedSignatureId: string) => void;
	onCreateSignature: () => void;
	disabled?: boolean;
}

// Generate different signature styles using actual handwritten fonts
const generateSignatureStyles = (
	firstName: string,
	lastName: string,
	initials: string,
): SignatureOption[] => {
	const fullName = `${firstName} ${lastName}`.trim();
	const styles = [
		{
			id: "typed",
			style: "typed",
			signature: fullName,
			initials: initials,
		},
		{
			id: "caveat",
			style: "caveat",
			signature: fullName,
			initials: initials,
		},
		{
			id: "gloria-hallelujah",
			style: "gloria-hallelujah",
			signature: fullName,
			initials: initials,
		},
		{
			id: "homemade-apple",
			style: "homemade-apple",
			signature: fullName,
			initials: initials,
		},
		{
			id: "nothing-you-could-do",
			style: "nothing-you-could-do",
			signature: fullName,
			initials: initials,
		},
		{
			id: "reenie-beanie",
			style: "reenie-beanie",
			signature: fullName,
			initials: initials,
		},
		{
			id: "mr-dafoe",
			style: "mr-dafoe",
			signature: fullName,
			initials: initials,
		},
	];

	return styles;
};

export default function SignatureChoose({
	firstName,
	lastName,
	initials,
	selectedSignatureId,
	onSignatureSelection,
	onCreateSignature,
	disabled = false,
}: SignatureChooseProps) {
	const [selectedId, setSelectedId] = useState<string | null>(
		selectedSignatureId || null,
	);
	const signatureOptions = generateSignatureStyles(
		firstName,
		lastName,
		initials,
	);

	const handleSelect = (option: SignatureOption) => {
		setSelectedId(option.id);
		onSignatureSelection(option.id);
	};

	const getSignatureStyle = (style: string) => {
		const baseClasses = "text-foreground";

		switch (style) {
			case "typed":
				return `${baseClasses} font-mono text-sm`; // Typed is monospace
			case "caveat":
				return `${baseClasses} text-xl font-medium`; // Caveat is casual and modern
			case "gloria-hallelujah":
				return `${baseClasses} text-lg`; // Gloria Hallelujah is playful and casual
			case "homemade-apple":
				return `${baseClasses} text-xl`; // Homemade Apple is handwritten and personal
			case "nothing-you-could-do":
				return `${baseClasses} text-lg`; // Nothing You Could Do is casual and flowing
			case "reenie-beanie":
				return `${baseClasses} text-2xl`; // Reenie Beanie is bold and handwritten
			case "mr-dafoe":
				return `${baseClasses} text-2xl`; // Mr Dafoe is elegant and script-like
			default:
				return baseClasses;
		}
	};

	const getInitialsStyle = (style: string) => {
		const baseClasses = "text-foreground";

		switch (style) {
			case "typed":
				return `${baseClasses} font-mono text-xs`; // Typed initials
			case "caveat":
				return `${baseClasses} text-lg font-medium`; // Caveat initials
			case "gloria-hallelujah":
				return `${baseClasses} text-base`; // Gloria Hallelujah initials
			case "homemade-apple":
				return `${baseClasses} text-lg`; // Homemade Apple initials
			case "nothing-you-could-do":
				return `${baseClasses} text-base`; // Nothing You Could Do initials
			case "reenie-beanie":
				return `${baseClasses} text-xl`; // Reenie Beanie initials
			case "mr-dafoe":
				return `${baseClasses} text-xl`; // Mr Dafoe initials
			default:
				return baseClasses;
		}
	};

	return (
		<div className="">
			<h4 className="text-muted-foreground">Choose Signature Style</h4>

			<div className="grid gap-3 max-h-80 overflow-y-auto border-2 border-dashed p-4 rounded-large mt-4 hide-scrollbar">
				{signatureOptions.map((option) => (
					<button
						type="button"
						key={option.id}
						className={cn(
							"flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all hover:bg-card",
							selectedId === option.id ? "border-primary/30 bg-primary/5" : "",
						)}
						onClick={() => handleSelect(option)}
					>
						{/* Radio Button */}
						<div className="flex-shrink-0">
							<div
								className={cn(
									"w-4 h-4 rounded-full border-2 flex items-center justify-center",
									selectedId === option.id
										? "border-primary bg-primary"
										: "border-muted-foreground",
								)}
							>
								{selectedId === option.id && (
									<div className="w-2 h-2 rounded-full bg-primary-foreground" />
								)}
							</div>
						</div>

						{/* Signature Display */}
						<div className="flex-1 min-w-0">
							<div className="space-y-2">
								<div className="text-xs text-muted-foreground">Signed by:</div>
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

						{/* Initials Display */}
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

			<div className="flex justify-end mx-auto max-w-6xl w-full gap-4 mt-4">
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
