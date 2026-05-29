import type { ReactNode } from "react";
import { cn } from "../../../lib/cn";

type MockBadgeTone = "primary" | "muted";

type MockBadgeProps = {
	children: ReactNode;
	className?: string;
	tone?: MockBadgeTone;
};

const toneClasses: Record<MockBadgeTone, string> = {
	primary: "bg-secondary text-primary",
	muted: "bg-muted text-muted-foreground",
};

export default function MockBadge({
	children,
	className,
	tone = "primary",
}: MockBadgeProps) {
	return (
		<span
			className={cn(
				"shrink-0 rounded-full px-2.5 py-1 font-manrope text-[10px] font-medium",
				toneClasses[tone],
				className,
			)}
		>
			{children}
		</span>
	);
}
