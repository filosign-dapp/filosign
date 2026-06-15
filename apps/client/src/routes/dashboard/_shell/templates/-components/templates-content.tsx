import { MotionReveal } from "@filosign/motion";
import {
	FileTextIcon,
	MagnifyingGlassIcon,
	PlusIcon,
} from "@phosphor-icons/react";
import { AppEmptyState } from "@/src/lib/components/app/empty-state";
import { Button } from "@/src/lib/components/ui/button";
import { cn } from "@/src/lib/utils/index";
import {
	documentsPageBodyInset,
	documentsTableCard,
} from "@/src/routes/dashboard/_shell/document/all/-lib/documents-page-layout";
import type { TemplateListItem } from "@/src/routes/dashboard/_shell/templates/-lib/hooks/use-templates-list-controller";
import { TemplatesTable } from "./templates-table";

type Props = {
	templates: TemplateListItem[];
	hasAnyTemplates: boolean;
	hasSearchQuery: boolean;
	canManage: boolean;
	canUse: boolean;
	actionsBusy: boolean;
	onClearSearch: () => void;
	onOpenTemplate: (templateId: string) => void;
	onUseTemplate: (templateId: string) => void;
	onEditTemplate: (templateId: string) => void;
	onDeleteTemplate: (templateId: string) => void;
	onCreateTemplate: () => void;
};

export function TemplatesContent({
	templates,
	hasAnyTemplates,
	hasSearchQuery: _hasSearchQuery,
	canManage,
	canUse,
	actionsBusy,
	onClearSearch,
	onOpenTemplate,
	onUseTemplate,
	onEditTemplate,
	onDeleteTemplate,
	onCreateTemplate,
}: Props) {
	return (
		<MotionReveal
			className={cn(
				"flex min-h-0 flex-1 flex-col overflow-y-auto",
				documentsPageBodyInset,
			)}
			preset="smooth"
			delay={0.3}
			onlyOnce
			id="templates-page-content"
		>
			{!hasAnyTemplates ? (
				<MotionReveal
					preset="smooth"
					delay={0.4}
					className="flex min-h-0 flex-1"
				>
					<AppEmptyState
						preset="page"
						icon={FileTextIcon}
						title="No templates yet"
						description="Upload PDFs, define roles, place fields once, and let the team reuse the blueprint for every new envelope."
					>
						{canManage ? (
							<Button
								type="button"
								variant="primary"
								className="gap-2"
								onClick={onCreateTemplate}
							>
								<PlusIcon className="size-4" weight="bold" />
								Create Template
							</Button>
						) : null}
					</AppEmptyState>
				</MotionReveal>
			) : templates.length === 0 ? (
				<AppEmptyState
					preset="page"
					variant="outline"
					icon={MagnifyingGlassIcon}
					title="No templates match your search"
					description="Try a different name or clear the search field."
				>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={onClearSearch}
					>
						Clear search
					</Button>
				</AppEmptyState>
			) : (
				<div className="space-y-4">
					<div className={documentsTableCard}>
						<TemplatesTable
							templates={templates}
							busy={actionsBusy}
							canUse={canUse}
							canManage={canManage}
							onOpen={onOpenTemplate}
							onUse={onUseTemplate}
							onEdit={onEditTemplate}
							onDelete={onDeleteTemplate}
						/>
					</div>
				</div>
			)}
		</MotionReveal>
	);
}
