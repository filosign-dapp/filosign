import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import Logo from "@/src/lib/components/app/chrome/logo";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import { PlacementHistoryButtons } from "@/src/routes/dashboard/envelope/create/add-sign/-components/header/placement-history";
import { PlacedFieldsSheet } from "@/src/routes/dashboard/envelope/create/add-sign/-components/placed-fields-sheet";
import { TemplateEditorActions } from "./actions";

type Props = {
	mode: "create" | "edit";
	templateId: string;
	templateName: string;
};

export function TemplateEditorHeader({
	mode,
	templateId,
	templateName,
}: Props) {
	return (
		<header className="glass z-50 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/50 px-4 md:px-8">
			<div className="flex min-w-0 items-center gap-3 md:gap-4">
				<Logo className="px-0" textClassName="text-foreground" iconOnly />
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<h3 className="truncate text-base font-semibold text-foreground">
							{templateName.trim() || "Untitled template"}
						</h3>
						<Badge variant="secondary" className="shrink-0 capitalize">
							{mode === "create" ? "Creating" : "Editing"}
						</Badge>
					</div>
					<p className="truncate text-xs text-muted-foreground">
						Assign roles, add documents, and place fields for your team
						blueprint.
					</p>
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-2 md:gap-3">
				<div className="lg:hidden">
					<PlacedFieldsSheet variant="toolbar" />
				</div>
				<div className="hidden sm:block">
					<PlacementHistoryButtons />
				</div>
				<Button
					type="button"
					variant="outline"
					size="lg"
					className="gap-1.5"
					render={
						<Link
							to="/dashboard/templates"
							className="inline-flex items-center gap-1.5"
						/>
					}
				>
					<ArrowLeftIcon className="size-3.5" weight="bold" />
					<span className="hidden sm:inline">Templates</span>
				</Button>
				<TemplateEditorActions
					mode={mode}
					templateId={templateId}
					templateName={templateName}
				/>
			</div>
		</header>
	);
}
