import {
	CalendarIcon,
	CheckSquareIcon,
	EnvelopeIcon,
	SignatureIcon,
	TextAaIcon,
	TextBIcon,
	UserIcon,
} from "@phosphor-icons/react";
import type { SignatureField } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";

export const signatureFieldPalette = [
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
] satisfies ReadonlyArray<{
	type: SignatureField["type"];
	label: string;
	icon: typeof SignatureIcon;
	description: string;
}>;
