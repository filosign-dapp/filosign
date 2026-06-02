import { desc, eq } from "drizzle-orm";
import {
	CACHE_TTL,
	cacheAside,
	cacheKeys,
	defaultDeserialize,
	defaultSerialize,
} from "@/lib/platform/cache";
import db from "@/lib/platform/db";

const { organizationTemplates } = db.schema;

export type OrgTemplateListRow = {
	id: string;
	name: string;
	createdAt: Date;
	createdByWallet: string;
};

type StoredTemplateRow = Omit<OrgTemplateListRow, "createdAt"> & {
	createdAt: string;
};

function serializeTemplates(rows: OrgTemplateListRow[]): string {
	const stored: StoredTemplateRow[] = rows.map((row) => ({
		...row,
		createdAt: row.createdAt.toISOString(),
	}));
	return defaultSerialize(stored);
}

function deserializeTemplates(raw: string): OrgTemplateListRow[] {
	const stored = defaultDeserialize<StoredTemplateRow[]>(raw);
	return stored.map((row) => ({
		...row,
		createdAt: new Date(row.createdAt),
	}));
}

export async function fetchOrgTemplatesList(
	organizationId: string,
): Promise<OrgTemplateListRow[]> {
	return db
		.select({
			id: organizationTemplates.id,
			name: organizationTemplates.name,
			createdAt: organizationTemplates.createdAt,
			createdByWallet: organizationTemplates.createdByWallet,
		})
		.from(organizationTemplates)
		.where(eq(organizationTemplates.organizationId, organizationId))
		.orderBy(desc(organizationTemplates.createdAt));
}

export async function listOrgTemplatesCached(
	organizationId: string,
): Promise<OrgTemplateListRow[]> {
	return cacheAside({
		key: cacheKeys.orgTemplates(organizationId),
		ttlSec: CACHE_TTL.orgTemplates,
		fetch: () => fetchOrgTemplatesList(organizationId),
		serialize: serializeTemplates,
		deserialize: deserializeTemplates,
	});
}
