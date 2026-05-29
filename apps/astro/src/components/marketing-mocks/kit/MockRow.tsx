import type { ReactNode } from "react";
import { cn } from "../../../lib/cn";

type MockRowRadius = "lg" | "xl";

type MockRowProps = {
	children: ReactNode;
	className?: string;
	radius?: MockRowRadius;
};

const radiusClasses: Record<MockRowRadius, string> = {
	lg: "rounded-lg",
	xl: "rounded-xl",
};

export default function MockRow({
	children,
	className,
	radius = "lg",
}: MockRowProps) {
	return (
		<div
			className={cn(
				"flex items-center bg-secondary/25",
				radiusClasses[radius],
				className,
			)}
		>
			{children}
		</div>
	);
}
