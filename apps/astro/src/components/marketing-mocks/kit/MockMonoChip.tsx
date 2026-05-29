import type { ReactNode } from "react";
import { cn } from "../../../lib/cn";

type MockMonoChipProps = {
	children: ReactNode;
	className?: string;
};

export default function MockMonoChip({
	children,
	className,
}: MockMonoChipProps) {
	return (
		<span
			className={cn(
				"rounded-md bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground",
				className,
			)}
		>
			{children}
		</span>
	);
}
