import { MotionReveal } from "@filosign/motion";
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { ListGridViewToggle } from "@/src/lib/components/app/view/list-grid-view-toggle";
import { Button } from "@/src/lib/components/ui/button";
import { Input } from "@/src/lib/components/ui/input";
import { TabsList, TabsTrigger } from "@/src/lib/components/ui/tabs";
import { useStartNewEnvelope } from "@/src/lib/domains/drafts";
import { cn } from "@/src/lib/utils/index";
import { useDocuments } from "@/src/routes/dashboard/_shell/document/all/-lib/context/context";
import {
	documentsPageInset,
	documentsPageToolbar,
} from "@/src/routes/dashboard/_shell/document/all/-lib/documents-page-layout";

export function DocumentsPageToolbar() {
	const { viewMode, handleViewModeChange, searchInput, setSearchInput } =
		useDocuments();
	const startNewEnvelope = useStartNewEnvelope();

	return (
		<MotionReveal
			className={cn(
				documentsPageToolbar,
				documentsPageInset,
				"sticky top-0 z-10 shrink-0 pt-4 pb-0",
			)}
			preset="smooth"
			delay={0.2}
			onlyOnce
			id="documents-page-toolbar"
		>
			<div className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
					<h2 className="text-lg font-medium text-foreground">All Documents</h2>
					<div className="relative w-full sm:max-w-xs">
						<MagnifyingGlassIcon
							className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
							aria-hidden
						/>
						<Input
							type="search"
							placeholder="Search by title…"
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							className="w-full pl-8"
							maxLength={100}
							aria-label="Search documents by title"
						/>
					</div>
				</div>

				<div className="flex shrink-0 items-center gap-3 sm:gap-4">
					<ListGridViewToggle
						value={viewMode}
						onValueChange={handleViewModeChange}
					/>
					<Button
						type="button"
						variant="primary"
						size="sm"
						className="gap-2 group"
						onClick={startNewEnvelope}
					>
						<PlusIcon className="size-4" weight="bold" />
						<span className="hidden sm:inline">New Document</span>
					</Button>
				</div>
			</div>

			<TabsList variant="line" className="h-10 w-full justify-start">
				<TabsTrigger value="all">All</TabsTrigger>
				<TabsTrigger value="sent">Sent</TabsTrigger>
				<TabsTrigger value="received">Received</TabsTrigger>
				<TabsTrigger value="drafts">Drafts</TabsTrigger>
			</TabsList>
		</MotionReveal>
	);
}
