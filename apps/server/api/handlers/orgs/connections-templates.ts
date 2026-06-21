import type { Address } from "viem";
import type { ActiveOrgContext } from "@/lib/domains/orgs";
import {
	assertOrgTemplatesAccess,
	assertOrgTemplatesPermissions,
	cloneOrgTemplateToEnvelope,
	createOrgTemplate,
	deleteOrgTemplate,
	getOrgTemplate,
	listOrgTemplates,
	prepareOrgTemplateCreate,
	prepareOrgTemplateUpdate,
	renameOrgTemplate,
	updateOrgTemplate,
	zOrgsTemplateCreateBody,
	zOrgsTemplatePrepareCreateBody,
	zOrgsTemplatePrepareUpdateBody,
	zOrgsTemplateRenameBody,
	zOrgsTemplateUpdateBody,
} from "@/lib/domains/orgs/templates";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

export {
	zOrgsTemplateCreateBody,
	zOrgsTemplatePrepareCreateBody,
	zOrgsTemplatePrepareUpdateBody,
	zOrgsTemplateRenameBody,
	zOrgsTemplateUpdateBody,
} from "@/lib/domains/orgs/templates";

export async function orgsTemplatesPrepareCreate(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	await assertOrgTemplatesAccess(wallet, activeOrg, "templates:write");
	const parsed = zOrgsTemplatePrepareCreateBody.safeParse(body);
	if (!parsed.success) throwZodBadRequest(parsed.error);

	return prepareOrgTemplateCreate({
		organizationId: activeOrg.organizationId,
		templateId: parsed.data.templateId,
		docIds: parsed.data.docIds,
	});
}

export async function orgsTemplatesCreate(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	await assertOrgTemplatesAccess(wallet, activeOrg, "templates:write");
	const parsed = zOrgsTemplateCreateBody.safeParse(body);
	if (!parsed.success) throwZodBadRequest(parsed.error);

	return createOrgTemplate({
		wallet,
		organizationId: activeOrg.organizationId,
		templateId: parsed.data.templateId,
		name: parsed.data.name,
		headDekWrappedOmk: parsed.data.headDekWrappedOmk,
		headOmkKemCiphertext: parsed.data.headOmkKemCiphertext,
		snapshot: parsed.data.snapshot,
		documents: parsed.data.documents,
	});
}

export async function orgsTemplatesList(
	wallet: Address,
	activeOrg: ActiveOrgContext,
) {
	await assertOrgTemplatesAccess(wallet, activeOrg, "templates:read");
	return listOrgTemplates(activeOrg.organizationId);
}

export async function orgsTemplatesGet(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	templateId: string,
) {
	await assertOrgTemplatesAccess(wallet, activeOrg, "templates:read");
	return getOrgTemplate({
		organizationId: activeOrg.organizationId,
		templateId,
	});
}

export async function orgsTemplatesPrepareUpdate(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	await assertOrgTemplatesAccess(wallet, activeOrg, "templates:write");
	const parsed = zOrgsTemplatePrepareUpdateBody.safeParse(body);
	if (!parsed.success) throwZodBadRequest(parsed.error);

	return prepareOrgTemplateUpdate({
		organizationId: activeOrg.organizationId,
		templateId: parsed.data.templateId,
		documents: parsed.data.documents,
	});
}

export async function orgsTemplatesUpdate(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	await assertOrgTemplatesAccess(wallet, activeOrg, "templates:write");
	const parsed = zOrgsTemplateUpdateBody.safeParse(body);
	if (!parsed.success) throwZodBadRequest(parsed.error);

	return updateOrgTemplate({
		wallet,
		organizationId: activeOrg.organizationId,
		templateId: parsed.data.templateId,
		name: parsed.data.name,
		headDekWrappedOmk: parsed.data.headDekWrappedOmk,
		headOmkKemCiphertext: parsed.data.headOmkKemCiphertext,
		snapshot: parsed.data.snapshot,
		documents: parsed.data.documents,
	});
}

export async function orgsTemplatesRename(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	body: unknown,
) {
	await assertOrgTemplatesAccess(wallet, activeOrg, "templates:write");
	const parsed = zOrgsTemplateRenameBody.safeParse(body);
	if (!parsed.success) throwZodBadRequest(parsed.error);

	return renameOrgTemplate({
		wallet,
		organizationId: activeOrg.organizationId,
		templateId: parsed.data.templateId,
		name: parsed.data.name,
	});
}

export async function orgsTemplatesCloneToEnvelope(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	templateId: string,
) {
	await assertOrgTemplatesPermissions(wallet, activeOrg, [
		"templates:use",
		"documents:send",
	]);
	return cloneOrgTemplateToEnvelope({
		organizationId: activeOrg.organizationId,
		templateId,
	});
}

export async function orgsTemplatesDelete(
	wallet: Address,
	activeOrg: ActiveOrgContext,
	templateId: string,
) {
	await assertOrgTemplatesAccess(wallet, activeOrg, "templates:write");
	return deleteOrgTemplate({
		wallet,
		organizationId: activeOrg.organizationId,
		templateId,
	});
}
