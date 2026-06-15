import type { UserSignatureRole } from "@filosign/shared";
import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils/utils";

export const signaturePreviewShellClass = "signature-preview-shell";

const roleSizeClass: Record<UserSignatureRole, string> = {
	signature: "h-16 w-56",
	initial: "h-14 w-28",
};

export function SignaturePreviewShell(props: {
	signatureRole: UserSignatureRole;
	className?: string;
	children: ReactNode;
}) {
	return (
		<div
			className={cn(
				signaturePreviewShellClass,
				roleSizeClass[props.signatureRole],
				props.className,
			)}
		>
			{props.children}
		</div>
	);
}
