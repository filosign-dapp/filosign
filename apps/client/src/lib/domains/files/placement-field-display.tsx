import { isTemplateRolePlaceholderEmail } from "@filosign/shared";
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
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";
import { cn } from "@/src/lib/utils/utils";

type SignerLabelField = Pick<
	SignatureField,
	"assignedSignerName" | "assignedSignerEmail"
>;

export function signerDisplayName(field: SignerLabelField): string {
	const name = field.assignedSignerName.trim();
	if (name) return name;
	const email = field.assignedSignerEmail.trim();
	if (email && !isTemplateRolePlaceholderEmail(email)) return email;
	return "Signer";
}

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
	const name = signerDisplayName(field);
	const email = field.assignedSignerEmail.trim();
	if (!email || isTemplateRolePlaceholderEmail(email) || email === name) {
		return name;
	}
	return `${name}, ${email}`;
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
