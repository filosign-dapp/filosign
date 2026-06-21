import { zCatalogSource, zTemplateSnapshot } from "@filosign/shared";

export type InstalledCatalogFingerprint = {
	systemTemplateId: string;
	systemContentFingerprint: string;
	catalogVersionLabel: string;
};

export function readInstalledCatalogFingerprint(
	snapshotJson: unknown,
): InstalledCatalogFingerprint | null {
	const parsed = zTemplateSnapshot.safeParse(snapshotJson);
	if (!parsed.success || !parsed.data.catalogSource) return null;
	const source = zCatalogSource.parse(parsed.data.catalogSource);
	return {
		systemTemplateId: source.systemTemplateId,
		systemContentFingerprint: source.systemContentFingerprint,
		catalogVersionLabel: source.catalogVersionLabel,
	};
}

export function resolveNewerVersionAvailable(args: {
	systemTemplateId: string;
	contentFingerprint: string;
	installed: InstalledCatalogFingerprint[];
}): boolean {
	const matching = args.installed.filter(
		(row) => row.systemTemplateId === args.systemTemplateId,
	);
	if (matching.length === 0) return false;
	return matching.some(
		(row) => row.systemContentFingerprint !== args.contentFingerprint,
	);
}

export function resolveAlreadyInstalledInWorkspace(args: {
	systemTemplateId: string;
	contentFingerprint: string;
	installed: InstalledCatalogFingerprint[];
}): boolean {
	return args.installed.some(
		(row) =>
			row.systemTemplateId === args.systemTemplateId &&
			row.systemContentFingerprint === args.contentFingerprint,
	);
}
