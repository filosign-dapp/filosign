import type { ReactNode } from "react";
import { cn } from "../../../lib/cn";
import {
	type MockPanelVariant,
	mockPanelShell,
	mockPanelVariants,
} from "../tokens";

type MockPanelProps = {
	children: ReactNode;
	className?: string;
	variant?: MockPanelVariant;
};

export default function MockPanel({
	children,
	className,
	variant = "compact",
}: MockPanelProps) {
	return (
		<div className={cn(mockPanelShell, mockPanelVariants[variant], className)}>
			{children}
		</div>
	);
}
