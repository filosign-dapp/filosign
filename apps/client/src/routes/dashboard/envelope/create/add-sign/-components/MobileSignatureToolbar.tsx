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
import { cn } from "@/src/lib/utils/utils";
import type { SignatureField } from "../mock";

type SignatureFieldType = SignatureField["type"];

interface MobileSignatureToolbarProps {
	onAddField: (fieldType: SignatureFieldType) => void;
	isPlacingField?: boolean;
	pendingFieldType?: SignatureFieldType | null;
}

// Local field type configuration with icons for mobile toolbar
const fieldTypes = [
	{
		type: "signature" as const,
		icon: SignatureIcon,
	},
	{
		type: "initial" as const,
		icon: TextAaIcon,
	},
	{
		type: "date" as const,
		icon: CalendarIcon,
	},
	{
		type: "name" as const,
		icon: UserIcon,
	},
	{
		type: "email" as const,
		icon: EnvelopeIcon,
	},
	{
		type: "text" as const,
		icon: TextBIcon,
	},
	{
		type: "checkbox" as const,
		icon: CheckSquareIcon,
	},
];

export default function MobileSignatureToolbar({
	onAddField,
	isPlacingField,
	pendingFieldType,
}: MobileSignatureToolbarProps) {
	return (
		<motion.div
			className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 lg:hidden w-full max-w-md px-4"
			initial={{ opacity: 0, y: 100 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				type: "spring",
				stiffness: 230,
				damping: 25,
				mass: 1.0,
			}}
		>
			<div className="glass bg-background/95 border border-border rounded-large p-4 shadow-lg backdrop-blur-sm">
				<div className="flex items-center justify-center gap-1">
					{fieldTypes.map((field, index) => {
						const IconComponent = field.icon;
						return (
							<motion.div
								key={field.type}
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{
									type: "spring",
									stiffness: 230,
									damping: 25,
									delay: index * 0.05,
								}}
								className="flex-1"
							>
								<button
									type="button"
									className={cn(
										"w-full aspect-square p-2 transition-all duration-200 active:scale-95 active:bg-secondary/50 rounded-main touch-manipulation",
										"hover:scale-105 hover:bg-secondary/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2",
										isPlacingField &&
											pendingFieldType === field.type &&
											"bg-secondary border border-primary/20 scale-105",
									)}
									onClick={() => onAddField(field.type)}
									aria-label={`Add ${field.type} field`}
								>
									<IconComponent
										className="size-6 text-secondary-foreground"
										weight="fill"
									/>
								</button>
							</motion.div>
						);
					})}
				</div>
			</div>
		</motion.div>
	);
}
