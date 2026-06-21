import { MotionReveal } from "@filosign/motion";
import { useCatalogList } from "@filosign/react/catalog";
import type { AppRouterClient, InferClientOutputs } from "@filosign/react/orpc";
import { BooksIcon } from "@phosphor-icons/react";
import { AppEmptyState } from "@/src/lib/components/app/empty-state";
import { cn } from "@/src/lib/utils/index";
import {
	documentsPageBodyInset,
	documentsTableCard,
} from "@/src/routes/dashboard/_shell/document/all/-lib/documents-page-layout";
import { TemplatesContentSkeleton } from "./templates-content-skeleton";
import { TemplatesLibraryTable } from "./templates-library-table";

type CatalogRow =
	InferClientOutputs<AppRouterClient>["catalog"]["list"]["templates"][number];

type Props = {
	searchQuery: string;
};

function matchesSearch(template: CatalogRow, query: string): boolean {
	if (!query) return true;
	const haystack = [
		template.name,
		template.meta.category,
		template.catalogVersionLabel,
		...template.meta.tags,
	]
		.join(" ")
		.toLowerCase();
	return haystack.includes(query);
}

export function TemplatesLibraryContent({ searchQuery }: Props) {
	const { data, isLoading } = useCatalogList();

	const templates = (data?.templates ?? []).filter((template) =>
		matchesSearch(template, searchQuery.trim().toLowerCase()),
	);

	if (isLoading) {
		return (
			<MotionReveal
				className={cn("flex min-h-0 flex-1 flex-col", documentsPageBodyInset)}
				preset="smooth"
				delay={0.3}
			>
				<TemplatesContentSkeleton className={documentsTableCard} />
			</MotionReveal>
		);
	}

	if (templates.length === 0) {
		return (
			<MotionReveal
				className={cn("flex min-h-0 flex-1 flex-col", documentsPageBodyInset)}
				preset="smooth"
				delay={0.3}
			>
				<AppEmptyState
					preset="page"
					icon={BooksIcon}
					title="No library templates yet"
					description="Filosign catalog templates will appear here once platform admins publish them."
				/>
			</MotionReveal>
		);
	}

	return (
		<MotionReveal
			className={cn(
				"flex min-h-0 flex-1 flex-col overflow-y-auto",
				documentsPageBodyInset,
			)}
			preset="smooth"
			delay={0.3}
		>
			<div className={documentsTableCard}>
				<TemplatesLibraryTable templates={templates} />
			</div>
		</MotionReveal>
	);
}
