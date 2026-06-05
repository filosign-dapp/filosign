import type { ReactNode } from "react";
import { cn } from "../../../lib/cn";

type MockRecipientChipProps = {
	children: ReactNode;
	className?: string;
};

/** Compact chip for recipient emails in product mocks. */
export default function MockRecipientChip({
	children,
	className,
}: MockRecipientChipProps) {
	return (
		<span
			className={cn(
				"rounded-md bg-muted px-2 py-1 font-manrope text-[10px] text-muted-foreground",
				className,
			)}
		>
			{children}
		</span>
	);
}
