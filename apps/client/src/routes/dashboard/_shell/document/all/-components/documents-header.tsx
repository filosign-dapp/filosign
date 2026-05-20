import { GridFourIcon, ListIcon, PlusIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Button } from "@/src/lib/components/ui/button";
import { useDocuments } from "@/src/routes/dashboard/_shell/document/all/-lib/context/context";

export function DocumentsHeader() {
	const { viewMode, handleViewModeChange } = useDocuments();

	return (
		<motion.div
			className="flex items-center justify-between px-8 py-4"
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2, delay: 0.2 }}
		>
			<div className="flex items-center gap-4">
				<h2 className="text-lg font-medium text-foreground">All Documents</h2>
			</div>

			<div className="flex items-center gap-4">
				<div className="flex items-center gap-2 bg-muted rounded-lg p-1">
					<Button
						type="button"
						variant={viewMode === "list" ? "default" : "ghost"}
						size="sm"
						onClick={() => handleViewModeChange("list")}
						className="h-7 w-7 p-0"
					>
						<ListIcon className="h-4 w-4" />
					</Button>
					<Button
						type="button"
						variant={viewMode === "grid" ? "default" : "ghost"}
						size="sm"
						onClick={() => handleViewModeChange("grid")}
						className="h-7 w-7 p-0"
					>
						<GridFourIcon className="h-4 w-4" />
					</Button>
				</div>

				<Link to="/dashboard/envelope/create">
					<Button variant="primary" size="sm" className="gap-2 group">
						<PlusIcon className="size-4" weight="bold" />
						<p className="hidden sm:inline">New Document</p>
					</Button>
				</Link>
			</div>
		</motion.div>
	);
}
