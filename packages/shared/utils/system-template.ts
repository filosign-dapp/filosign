import { jsonStringify } from "@filosign/crypto-utils";
import { sha256, stringToBytes } from "viem";
import { z } from "zod";
import { sortKeysDeep } from "./placement";
import type {
	CatalogSource,
	TemplateField,
	TemplatePlaintextSha256,
	TemplateSnapshot,
} from "./template";
import { zCatalogSource, zTemplateSnapshot } from "./template";

export const systemTemplateStatuses = [
	"draft",
	"published",
	"archived",
] as const;
export type SystemTemplateStatus = (typeof systemTemplateStatuses)[number];

export const systemTemplateSuitabilityTiers = [
	"tax_withholding",
	"contract",
	"securities_sensitive",
] as const;
export type SystemTemplateSuitabilityTier =
	(typeof systemTemplateSuitabilityTiers)[number];

export const zSystemTemplateMeta = z.object({
	category: z.string().min(1).max(64),
	tags: z.array(z.string().min(1).max(64)).default([]),
	suitabilityTier: z.enum(systemTemplateSuitabilityTiers).optional(),
	documentVersion: z.string().min(1).max(64),
	sortOrder: z.number().int().default(0),
	description: z.string().max(2000).optional(),
	sourceUrl: z.url().optional(),
	license: z.string().max(256).optional(),
});

export type SystemTemplateMeta = z.infer<typeof zSystemTemplateMeta>;

export { type CatalogSource, zCatalogSource } from "./template";

function compareFieldFingerprintOrder(
	a: TemplateField,
	b: TemplateField,
): number {
	return (
		a.documentId.localeCompare(b.documentId) ||
		a.pageIndex - b.pageIndex ||
		a.rect.x - b.rect.x ||
		a.rect.y - b.rect.y ||
		a.rect.width - b.rect.width ||
		a.rect.height - b.rect.height ||
		a.type.localeCompare(b.type) ||
		a.roleId.localeCompare(b.roleId) ||
		a.id.localeCompare(b.id)
	);
}

/** Structural snapshot only; strips org provenance and normalizes array order. */
export function canonicalSystemTemplateSnapshotForFingerprint(
	snapshot: TemplateSnapshot,
): string {
	const parsed = zTemplateSnapshot.parse(snapshot);
	const { catalogSource: _catalogSource, ...rest } =
		parsed as TemplateSnapshot & {
			catalogSource?: unknown;
		};
	const normalized = {
		...rest,
		roles: [...rest.roles].sort(
			(a, b) => a.order - b.order || a.roleId.localeCompare(b.roleId),
		),
		fields: [...rest.fields].sort(compareFieldFingerprintOrder),
	};
	return jsonStringify(sortKeysDeep(normalized) as typeof normalized);
}

export function computeSystemTemplateContentFingerprint(args: {
	snapshot: TemplateSnapshot;
	documents: Array<{
		docId: string;
		plaintextSha256: TemplatePlaintextSha256;
	}>;
}): `0x${string}` {
	const sortedDocs = [...args.documents].sort((a, b) =>
		a.docId.localeCompare(b.docId),
	);
	const snapshotPart = canonicalSystemTemplateSnapshotForFingerprint(
		args.snapshot,
	);
	const docPart = sortedDocs.map((doc) => doc.plaintextSha256).join("|");
	return sha256(stringToBytes(`${snapshotPart}|${docPart}`));
}

export function catalogVersionLabelFromMeta(meta: SystemTemplateMeta): string {
	return meta.documentVersion.trim();
}

export function buildCatalogSourceForInstall(args: {
	systemTemplateId: string;
	systemContentFingerprint: string;
	catalogVersionLabel: string;
	installedAtIso?: string;
}): CatalogSource {
	return zCatalogSource.parse({
		systemTemplateId: args.systemTemplateId,
		installedAtIso: args.installedAtIso ?? new Date().toISOString(),
		systemContentFingerprint: args.systemContentFingerprint,
		catalogVersionLabel: args.catalogVersionLabel,
	});
}

export function systemTemplateDocumentStorageKey(args: {
	systemTemplateId: string;
	docId: string;
}): string {
	return `system/templates/${args.systemTemplateId}/${args.docId}.pdf`;
}
