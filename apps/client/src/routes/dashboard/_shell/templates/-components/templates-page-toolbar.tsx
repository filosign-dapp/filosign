import { MotionReveal } from "@filosign/motion";
import { PlusIcon } from "@phosphor-icons/react";
import { PageSearchInput } from "@/src/lib/components/app/page-search-input";
import { Button } from "@/src/lib/components/ui/button";
import { DocsLink } from "@/src/lib/docs/docs-link";
import { DOCS_LINKS } from "@/src/lib/docs/links";
import { ProFeatureMark } from "@/src/lib/domains/entitlements/pro-feature-mark";
import { cn } from "@/src/lib/utils/index";
import {
	documentsPageInset,
	documentsPageToolbar,
} from "@/src/routes/dashboard/_shell/document/all/-lib/documents-page-layout";

type Props = {
	searchInput: string;
	onSearchChange: (value: string) => void;
	canManage: boolean;
	onNewTemplate: () => void;
};

export function TemplatesPageToolbar({
	searchInput,
	onSearchChange,
	canManage,
	onNewTemplate,
}: Props) {
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
			id="templates-page-toolbar"
		>
			<div className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="min-w-0 space-y-0.5">
					<h2 className="inline-flex items-center gap-2 text-lg font-medium text-foreground">
						Shared Templates
						<ProFeatureMark size="xs" />
					</h2>
					<p className="hidden text-xs text-muted-foreground sm:block">
						Reusable team blueprints with roles and field placement.{" "}
						<DocsLink href={DOCS_LINKS.templates()}>
							Read the templates guide
						</DocsLink>
					</p>
				</div>

				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 md:gap-4">
					<PageSearchInput
						value={searchInput}
						onChange={onSearchChange}
						placeholder="Search by name…"
						aria-label="Search templates by name"
					/>
					{canManage ? (
						<div className="flex shrink-0 items-center gap-3 md:gap-4">
							<Button
								type="button"
								variant="primary"
								size="sm"
								className="gap-2 group"
								onClick={onNewTemplate}
							>
								<PlusIcon className="size-4" weight="bold" />
								<span className="hidden sm:inline">New Template</span>
							</Button>
						</div>
					) : null}
				</div>
			</div>
		</MotionReveal>
	);
}
