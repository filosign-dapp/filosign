import { GridFourIcon, ListIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import { cn } from "@/src/lib/utils";

export type ListGridViewMode = "list" | "grid";

type ListGridViewToggleProps = {
	value: ListGridViewMode;
	onValueChange: (value: ListGridViewMode) => void;
	className?: string;
};

export function ListGridViewToggle({
	value,
	onValueChange,
	className,
}: ListGridViewToggleProps) {
	return (
		<div
			role="group"
			aria-label="View layout"
			className={cn(
				"flex items-center gap-2 rounded-lg bg-muted p-1",
				className,
			)}
		>
			<Button
				type="button"
				variant={value === "list" ? "default" : "ghost"}
				size="sm"
				onClick={() => onValueChange("list")}
				className="h-7 w-7 p-0"
				aria-label="List view"
				aria-pressed={value === "list"}
			>
				<ListIcon className="h-4 w-4" />
			</Button>
			<Button
				type="button"
				variant={value === "grid" ? "default" : "ghost"}
				size="sm"
				onClick={() => onValueChange("grid")}
				className="h-7 w-7 p-0"
				aria-label="Grid view"
				aria-pressed={value === "grid"}
			>
				<GridFourIcon className="h-4 w-4" />
			</Button>
		</div>
	);
}
