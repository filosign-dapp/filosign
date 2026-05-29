import type { ReactNode } from "react";
import { cn } from "../../../lib/cn";
import MockRow from "./MockRow";

type MockChecklistRowProps = {
	icon: ReactNode;
	children: ReactNode;
	className?: string;
};

export default function MockChecklistRow({
	icon,
	children,
	className,
}: MockChecklistRowProps) {
	return (
		<MockRow className={cn("gap-3 p-3", className)} radius="xl">
			{icon}
			<span className="font-manrope text-sm">{children}</span>
		</MockRow>
	);
}
