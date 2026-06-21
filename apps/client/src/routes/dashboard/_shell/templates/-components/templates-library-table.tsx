import type { AppRouterClient, InferClientOutputs } from "@filosign/react/orpc";
import { useNavigate } from "@tanstack/react-router";
import { Badge } from "@/src/lib/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/src/lib/components/ui/table";
import {
	templateMetaSubtitle,
	templatesTableCellClass,
	templatesTableHeadClass,
	templatesTableRowClass,
} from "@/src/lib/domains/templates/utils/templates-table-styles";
import { cn } from "@/src/lib/utils/index";

type CatalogRow =
	InferClientOutputs<AppRouterClient>["catalog"]["list"]["templates"][number];

type Props = {
	templates: CatalogRow[];
};

const tableHeadClass = templatesTableHeadClass;
const tableCellClass = templatesTableCellClass;
const tableRowClass = templatesTableRowClass;

function templateMeta(template: CatalogRow) {
	return templateMetaSubtitle(template);
}

function visibleTags(tags: string[]) {
	if (tags.length <= 2) return { visible: tags, overflow: 0 };
	return { visible: tags.slice(0, 2), overflow: tags.length - 2 };
}

export function TemplatesLibraryTable({ templates }: Props) {
	const navigate = useNavigate();

	const openPreview = (systemTemplateId: string) => {
		void navigate({
			to: "/dashboard/templates/library/$systemTemplateId",
			params: { systemTemplateId },
		});
	};

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className={tableHeadClass}>Name</TableHead>
					<TableHead className={cn(tableHeadClass, "hidden md:table-cell")}>
						Category
					</TableHead>
					<TableHead className={cn(tableHeadClass, "hidden sm:table-cell")}>
						Version
					</TableHead>
					<TableHead className={cn(tableHeadClass, "hidden lg:table-cell")}>
						Tags
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{templates.map((template) => {
					const { visible, overflow } = visibleTags(template.meta.tags);
					return (
						<TableRow
							key={template.id}
							className={tableRowClass}
							onClick={() => openPreview(template.id)}
						>
							<TableCell className={cn(tableCellClass, "font-medium")}>
								<div className="space-y-1">
									<div>{template.name}</div>
									<p className="text-xs text-muted-foreground md:hidden">
										{templateMeta(template)}
										{template.meta.category
											? ` · ${template.meta.category}`
											: ""}
										{` · ${template.catalogVersionLabel}`}
									</p>
									<p className="hidden text-xs text-muted-foreground md:block lg:hidden">
										{templateMeta(template)}
									</p>
								</div>
							</TableCell>
							<TableCell
								className={cn(
									tableCellClass,
									"hidden capitalize md:table-cell",
								)}
							>
								{template.meta.category}
							</TableCell>
							<TableCell className={cn(tableCellClass, "hidden sm:table-cell")}>
								<div className="flex flex-wrap items-center gap-2">
									<span>{template.catalogVersionLabel}</span>
									{template.alreadyInstalledInWorkspace ? (
										<Badge variant="outline">In workspace</Badge>
									) : null}
								</div>
							</TableCell>
							<TableCell className={cn(tableCellClass, "hidden lg:table-cell")}>
								{template.meta.tags.length > 0 ? (
									<div className="flex flex-wrap gap-1.5">
										{visible.map((tag) => (
											<Badge key={tag} variant="secondary">
												{tag}
											</Badge>
										))}
										{overflow > 0 ? (
											<Badge variant="outline">+{overflow}</Badge>
										) : null}
									</div>
								) : (
									<span className="text-muted-foreground">—</span>
								)}
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}
