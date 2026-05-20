import {
	CalendarIcon,
	CheckSquareIcon,
	EnvelopeIcon,
	SignatureIcon,
	TextAaIcon,
	TextBIcon,
	UserIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Button } from "@/src/lib/components/ui/button";
import { cn } from "@/src/lib/utils/utils";
import type { SignatureField } from "../mock";

type SignatureFieldType = SignatureField["type"];

interface SignatureFieldsSidebarProps {
	onAddField: (fieldType: SignatureFieldType) => void;
	isPlacingField?: boolean;
	pendingFieldType?: SignatureFieldType | null;
}

// Local field type configuration with icons
const fieldTypes = [
	{
		type: "signature" as const,
		label: "Signature",
		icon: SignatureIcon,
		description: "Digital signature field",
	},
	{
		type: "initial" as const,
		label: "Initial",
		icon: TextAaIcon,
		description: "Initial field",
	},
	{
		type: "date" as const,
		label: "Date Signed",
		icon: CalendarIcon,
		description: "Date field",
	},
	{
		type: "name" as const,
		label: "Name",
		icon: UserIcon,
		description: "Name field",
	},
	{
		type: "email" as const,
		label: "Email",
		icon: EnvelopeIcon,
		description: "Email field",
	},
	{
		type: "text" as const,
		label: "Text",
		icon: TextBIcon,
		description: "Text input field",
	},
	{
		type: "checkbox" as const,
		label: "Checkbox",
		icon: CheckSquareIcon,
		description: "Checkbox field",
	},
];

export default function SignatureFieldsSidebar({
	onAddField,
	isPlacingField,
	pendingFieldType,
}: SignatureFieldsSidebarProps) {
	return (
		<div className="p-4 space-y-4">
			<div>
				<p className="font-medium text-muted-foreground mb-2">
					Standard Fields
				</p>
				<p className="text-xs text-muted-foreground mb-4">
					Select a field, then click the document. A dialog will ask which
					signer to assign and whether the field is required.
				</p>
			</div>

			<div className="space-y-2">
				{fieldTypes.map((field, index) => {
					const IconComponent = field.icon;
					return (
						<motion.div
							key={field.type}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{
								duration: 0.15,
								delay: index * 0.02,
							}}
						>
							<Button
								variant="ghost"
								className={cn(
									"w-full justify-start h-auto p-3 hover:bg-muted/50 transition-colors duration-100",
									isPlacingField &&
										pendingFieldType === field.type &&
										"bg-accent border",
								)}
								onClick={() => onAddField(field.type)}
							>
								<div className="flex items-center gap-3 w-full">
									<div className="p-2 rounded-md bg-muted/30">
										<IconComponent
											className="size-6 text-primary"
											weight="regular"
										/>
									</div>
									<div className="flex-1 text-left">
										<div className="text-sm font-medium">{field.label}</div>
										<div className="text-xs text-muted-foreground">
											{field.description}
										</div>
									</div>
								</div>
							</Button>
						</motion.div>
					);
				})}
			</div>

			<div className="pt-4 border-t border-border">
				<div className="text-xs text-muted-foreground space-y-2">
					{isPlacingField && (
						<div className="mt-3 p-2 bg-primary/5 border border-primary/20 rounded text-primary text-xs">
							<strong>Placing:</strong>{" "}
							{fieldTypes.find((f) => f.type === pendingFieldType)?.label}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
