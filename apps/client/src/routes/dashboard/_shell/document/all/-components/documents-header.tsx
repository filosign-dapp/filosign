import { MotionReveal, Pressable } from "@filosign/motion";
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { ListGridViewToggle } from "@/src/lib/components/app/view/list-grid-view-toggle";
import { Button } from "@/src/lib/components/ui/button";
import { Input } from "@/src/lib/components/ui/input";
import { useStartNewEnvelope } from "@/src/lib/domains/drafts";
import { useDocuments } from "@/src/routes/dashboard/_shell/document/all/-lib/context/context";

export function DocumentsHeader() {
	const { viewMode, handleViewModeChange, searchInput, setSearchInput } =
		useDocuments();
	const startNewEnvelope = useStartNewEnvelope();

	return (
		<MotionReveal
			className="flex items-center justify-between px-8 pt-4 pb-2"
			preset="smooth"
			delay={0.2}
			onlyOnce
			id="documents-header"
		>
			<div className="flex items-center gap-4">
				<h2 className="text-lg font-medium text-foreground">All Documents</h2>
				<div className="relative hidden sm:block">
					<MagnifyingGlassIcon
						className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden
					/>
					<Input
						type="search"
						placeholder="Search by title…"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						className="w-56 pl-8"
						maxLength={100}
						aria-label="Search documents by title"
					/>
				</div>
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
