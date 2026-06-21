import type { Address } from "viem";
import {
	rpcCatalogGetInputSchema,
	rpcCatalogListInputSchema,
	rpcCatalogPrepareInstallInputSchema,
} from "@/api/orpc/schemas/catalog-input";
import {
	assertCatalogTemplateInstallable,
	catalogGet,
	catalogList,
	prepareInstallFromSystem,
} from "@/lib/domains/catalog";
import type { ActiveOrgContext } from "@/lib/domains/orgs";
import { assertOrgTemplatesAccess } from "@/lib/domains/orgs/templates";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

export async function catalogListHandler(
	activeOrg: ActiveOrgContext | undefined,
	body: unknown,
) {
	const parsed = rpcCatalogListInputSchema.safeParse(body ?? {});
	if (!parsed.success) throwZodBadRequest(parsed.error);

	return catalogList({
		category: parsed.data.category,
		organizationId: activeOrg?.organizationId,
	});
}

export async function catalogGetHandler(
	activeOrg: ActiveOrgContext | undefined,
	body: unknown,
) {
	const parsed = rpcCatalogGetInputSchema.safeParse(body);
	if (!parsed.success) throwZodBadRequest(parsed.error);

	return catalogGet({
		systemTemplateId: parsed.data.systemTemplateId,
		organizationId: activeOrg?.organizationId,
	});
}

/** Server prepares catalog snapshot + presigned PDFs; client creates org template via saveOrgTemplateCreate. */
export async function orgsTemplatesPrepareInstallFromSystem(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	await assertOrgTemplatesAccess(wallet, activeOrg, "templates:write");
	const parsed = rpcCatalogPrepareInstallInputSchema.safeParse(body);
	if (!parsed.success) throwZodBadRequest(parsed.error);

	await assertCatalogTemplateInstallable({
		organizationId: activeOrg.organizationId,
		systemTemplateId: parsed.data.systemTemplateId,
	});

	return prepareInstallFromSystem(parsed.data.systemTemplateId);
}
