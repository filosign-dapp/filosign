import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import Logo from "@/src/lib/components/app/chrome/logo";
import { Badge } from "@/src/lib/components/ui/badge";
import {
	deriveTemplateDisplayName,
	truncateTemplateHeaderTitle,
} from "@/src/lib/domains/templates/utils/display-name";
import { PlacementHistoryButtons } from "@/src/routes/dashboard/envelope/create/add-sign/-components/header/placement-history";
import { PlacedFieldsSheet } from "@/src/routes/dashboard/envelope/create/add-sign/-components/placed-fields-sheet";
import { CatalogPreviewActions } from "./preview-actions";

type Props = {
	templateName: string;
	catalogVersionLabel: string;
	category: string;
	newerVersionAvailable: boolean;
	alreadyInstalledInWorkspace: boolean;
	canManage: boolean;
	onAddToWorkspace: () => void;
	addPending: boolean;
};

export function CatalogPreviewHeader({
	templateName,
	catalogVersionLabel,
	category,
	newerVersionAvailable,
	alreadyInstalledInWorkspace,
	canManage,
	onAddToWorkspace,
	addPending,
}: Props) {
	const displayName = deriveTemplateDisplayName(
		templateName,
		"Library template",
	);
	const headerTitle = truncateTemplateHeaderTitle(displayName);

	return (
		<header className="glass z-50 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/50 px-4 md:px-8">
			<div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
				<Logo
					className="shrink-0 px-0"
					textClassName="text-foreground"
					iconOnly
				/>
				<div className="min-w-0">
					<div className="flex min-w-0 items-center gap-2">
						<h1
							className="truncate text-base font-semibold text-foreground"
							title={displayName}
						>
							{headerTitle}
						</h1>
						<span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
							· Library preview
						</span>
					</div>
					<div className="mt-0.5 flex flex-wrap items-center gap-2">
						<Link
							to="/dashboard/templates"
							search={{ tab: "library" }}
							className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
						>
							<ArrowLeftIcon className="size-3.5" />
							Back to Library
						</Link>
						<Badge variant="secondary" className="capitalize">
							{category}
						</Badge>
						<Badge variant="outline">{catalogVersionLabel}</Badge>
						{newerVersionAvailable ? (
							<Badge variant="secondary">Newer version</Badge>
						) : null}
						{alreadyInstalledInWorkspace ? (
							<Badge variant="outline">In workspace</Badge>
						) : null}
					</div>
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-2">
				<PlacementHistoryButtons />
				<PlacedFieldsSheet variant="toolbar" />
				<CatalogPreviewActions
					canManage={canManage}
					alreadyInstalledInWorkspace={alreadyInstalledInWorkspace}
					onAddToWorkspace={onAddToWorkspace}
					addPending={addPending}
				/>
			</div>
		</header>
	);
}
