import { MotionReveal, Pressable } from "@filosign/motion";
import { PlusIcon } from "@phosphor-icons/react";
import { ListGridViewToggle } from "@/src/lib/components/app/view/list-grid-view-toggle";
import { Button } from "@/src/lib/components/ui/button";
import { useStartNewEnvelope } from "@/src/lib/domains/drafts";
import { useDocuments } from "@/src/routes/dashboard/_shell/document/all/-lib/context/context";

export function DocumentsHeader() {
	const { viewMode, handleViewModeChange } = useDocuments();
	const startNewEnvelope = useStartNewEnvelope();

	return (
		<MotionReveal
			className="flex items-center justify-between px-8 py-4"
			preset="smooth"
			delay={0.2}
			onlyOnce
			id="documents-header"
		>
			<div className="flex items-center gap-4">
				<h2 className="text-lg font-medium text-foreground">All Documents</h2>
			</div>

			<div className="flex items-center gap-4">
				<ListGridViewToggle
					value={viewMode}
					onValueChange={handleViewModeChange}
				/>

				<Pressable preset="snappy">
					<Button
						type="button"
						variant="primary"
						size="sm"
						className="gap-2 group"
						onClick={startNewEnvelope}
					>
						<PlusIcon className="size-4" weight="bold" />
						<p className="hidden sm:inline">New Document</p>
					</Button>
				</Pressable>
			</div>
		</MotionReveal>
	);
}
