import {
	CalendarIcon,
	CheckSquareIcon,
	EnvelopeIcon,
	FileIcon,
	SignatureIcon,
	TextAaIcon,
	TextBIcon,
	UserIcon,
} from "@phosphor-icons/react";
import { cn } from "@/src/lib/utils/utils";
import type { SignatureField } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";

export const signatureFieldTypeDisplay = {
	signature: { icon: SignatureIcon, label: "Signature" },
	initial: { icon: TextAaIcon, label: "Initial" },
	date: { icon: CalendarIcon, label: "Date Signed" },
	name: { icon: UserIcon, label: "Name" },
	email: { icon: EnvelopeIcon, label: "Email" },
	text: { icon: TextBIcon, label: "Text" },
	checkbox: { icon: CheckSquareIcon, label: "Checkbox" },
} as const;

export function fieldSignerAriaSnippet(field: SignatureField): string {
	const name = field.assignedSignerName.trim() || "Signer";
	const email = field.assignedSignerEmail.trim();
	return email ? `${name}, ${email}` : name;
}

export function SignatureFieldTypeIcon({
	type,
	isMobile,
}: {
	type: SignatureField["type"];
	isMobile: boolean;
}) {
	const config = signatureFieldTypeDisplay[type];
	const IconComponent = config?.icon ?? FileIcon;
	return (
		<IconComponent
			className={cn(isMobile ? "size-4" : "size-6")}
			weight="fill"
		/>
	);
}

export function signatureFieldTypeLabel(type: SignatureField["type"]) {
	return signatureFieldTypeDisplay[type]?.label ?? "Field";
}
