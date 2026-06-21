import { getPublishedSystemTemplate } from "@/lib/domains/platform/system-templates";
import { readInstalledCatalogFingerprint } from "./version-hints";

export type OrgTemplateCatalogUpdate = {
	newerVersionAvailable: boolean;
	installedCatalogVersionLabel: string;
	currentCatalogVersionLabel?: string;
	systemTemplateId: string;
};

export function readCatalogListFieldsFromSnapshot(snapshotJson: unknown): {
	catalogVersionLabel?: string;
	catalogSystemTemplateId?: string;
} {
	const source = readInstalledCatalogFingerprint(snapshotJson);
	if (!source) return {};
	return {
		catalogVersionLabel: source.catalogVersionLabel,
		catalogSystemTemplateId: source.systemTemplateId,
	};
}

export async function resolveCatalogUpdateForOrgTemplate(
	snapshotJson: unknown,
): Promise<OrgTemplateCatalogUpdate | null> {
	const source = readInstalledCatalogFingerprint(snapshotJson);
	if (!source) return null;

	try {
		const published = await getPublishedSystemTemplate(source.systemTemplateId);
		const newer =
			published.contentFingerprint !== source.systemContentFingerprint;
		return {
			newerVersionAvailable: newer,
			installedCatalogVersionLabel: source.catalogVersionLabel,
			currentCatalogVersionLabel: newer
				? published.catalogVersionLabel
				: undefined,
			systemTemplateId: source.systemTemplateId,
		};
	} catch {
		return {
			newerVersionAvailable: false,
			installedCatalogVersionLabel: source.catalogVersionLabel,
			systemTemplateId: source.systemTemplateId,
		};
	}
}
