import { throwAppError } from "@filosign/errors/server";
import {
	type CatalogSource,
	catalogVersionLabelFromMeta,
	zSystemTemplateMeta,
} from "@filosign/shared";
import { eq } from "drizzle-orm";
import {
	getPublishedSystemTemplate,
	getPublishedSystemTemplateForInstall,
	getPublishedSystemTemplateWithDocuments,
	listPublishedSystemTemplates,
} from "@/lib/domains/platform/system-templates";
import db from "@/lib/platform/db";
import {
	readInstalledCatalogFingerprint,
	resolveAlreadyInstalledInWorkspace,
	resolveNewerVersionAvailable,
} from "./utils/version-hints";

const { organizationTemplates } = db.schema;

type InstalledCatalogFingerprint = Awaited<
	ReturnType<typeof loadOrgInstalledCatalogFingerprints>
>[number];

type PublishedCatalogTemplate = Awaited<
	ReturnType<typeof listPublishedSystemTemplates>
>[number];

async function loadOrgInstalledCatalogFingerprints(organizationId: string) {
	const rows = await db
		.select({ snapshotJson: organizationTemplates.snapshotJson })
		.from(organizationTemplates)
		.where(eq(organizationTemplates.organizationId, organizationId));

	const installed = [];
	for (const row of rows) {
		const parsed = readInstalledCatalogFingerprint(row.snapshotJson);
		if (parsed) installed.push(parsed);
	}
	return installed;
}

function wireCatalogTemplateSummary(
	template: PublishedCatalogTemplate,
	installed: InstalledCatalogFingerprint[],
) {
	return {
		id: template.id,
		name: template.name,
		meta: template.meta,
		catalogVersionLabel: template.catalogVersionLabel,
		contentFingerprint: template.contentFingerprint,
		roleCount: template.roleCount,
		fieldCount: template.fieldCount,
		docCount: template.docCount,
		publishedAt: template.publishedAt,
		newerVersionAvailable: resolveNewerVersionAvailable({
			systemTemplateId: template.id,
			contentFingerprint: template.contentFingerprint,
			installed,
		}),
		alreadyInstalledInWorkspace: resolveAlreadyInstalledInWorkspace({
			systemTemplateId: template.id,
			contentFingerprint: template.contentFingerprint,
			installed,
		}),
	};
}

export async function catalogList(args?: {
	category?: string;
	organizationId?: string;
}) {
	const templates = await listPublishedSystemTemplates({
		category: args?.category,
	});
	const installed = args?.organizationId
		? await loadOrgInstalledCatalogFingerprints(args.organizationId)
		: [];

	return {
		templates: templates.map((template) =>
			wireCatalogTemplateSummary(template, installed),
		),
	};
}

export async function catalogGet(args: {
	systemTemplateId: string;
	organizationId?: string;
}) {
	const { template, documents } = await getPublishedSystemTemplateWithDocuments(
		args.systemTemplateId,
	);
	const installed = args?.organizationId
		? await loadOrgInstalledCatalogFingerprints(args.organizationId)
		: [];

	return {
		template: {
			...wireCatalogTemplateSummary(
				{
					...template,
					docCount: documents.length,
				},
				installed,
			),
			snapshotJson: template.snapshotJson,
			documents,
		},
	};
}

export async function assertCatalogTemplateInstallable(args: {
	organizationId: string;
	systemTemplateId: string;
}) {
	const template = await getPublishedSystemTemplate(args.systemTemplateId);
	const installed = await loadOrgInstalledCatalogFingerprints(
		args.organizationId,
	);
	if (
		resolveAlreadyInstalledInWorkspace({
			systemTemplateId: args.systemTemplateId,
			contentFingerprint: template.contentFingerprint,
			installed,
		})
	) {
		throwAppError("WORKSPACE.CATALOG_VERSION_ALREADY_INSTALLED");
	}
}

export async function assertCatalogSourceOnOrgTemplateCreate(args: {
	organizationId: string;
	catalogSource: CatalogSource;
}) {
	const published = await getPublishedSystemTemplate(
		args.catalogSource.systemTemplateId,
	);

	if (
		published.contentFingerprint !== args.catalogSource.systemContentFingerprint
	) {
		throwAppError("WORKSPACE.CATALOG_INSTALL_STALE");
	}

	const installed = await loadOrgInstalledCatalogFingerprints(
		args.organizationId,
	);
	if (
		resolveAlreadyInstalledInWorkspace({
			systemTemplateId: args.catalogSource.systemTemplateId,
			contentFingerprint: args.catalogSource.systemContentFingerprint,
			installed,
		})
	) {
		throwAppError("WORKSPACE.CATALOG_VERSION_ALREADY_INSTALLED");
	}
}

export async function prepareInstallFromSystem(systemTemplateId: string) {
	const payload = await getPublishedSystemTemplateForInstall(systemTemplateId);
	const meta = zSystemTemplateMeta.parse(payload.template.meta);

	return {
		systemTemplateId,
		name: payload.template.name,
		catalogVersionLabel: catalogVersionLabelFromMeta(meta),
		systemContentFingerprint: payload.contentFingerprint,
		snapshotJson: payload.snapshotJson,
		documents: payload.documents,
	};
}
