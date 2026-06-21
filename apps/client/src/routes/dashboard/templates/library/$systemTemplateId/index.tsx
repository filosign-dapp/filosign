import { createFileRoute } from "@tanstack/react-router";
import { CatalogTemplatePreviewPage } from "@/src/lib/domains/templates/catalog";

function CatalogTemplatePreviewRoutePage() {
	const { systemTemplateId } = Route.useParams();
	return <CatalogTemplatePreviewPage systemTemplateId={systemTemplateId} />;
}

export const Route = createFileRoute(
	"/dashboard/templates/library/$systemTemplateId/",
)({
	component: CatalogTemplatePreviewRoutePage,
});
