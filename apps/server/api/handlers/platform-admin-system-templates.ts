import type { Address } from "viem";
import {
	archiveSystemTemplate,
	createSystemTemplate,
	deleteSystemTemplate,
	getSystemTemplate,
	listSystemTemplates,
	prepareSystemTemplateCreate,
	prepareSystemTemplateUpdate,
	publishSystemTemplate,
	updateSystemTemplate,
	zSystemTemplateCreateBody,
	zSystemTemplatePrepareCreateBody,
	zSystemTemplatePrepareUpdateBody,
	zSystemTemplateUpdateBody,
} from "@/lib/domains/platform/system-templates";
import { assertPlatformAdmin } from "@/lib/platform/admin";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

export async function platformAdminSystemTemplatesList(wallet: Address) {
	return listSystemTemplates({ wallet });
}

export async function platformAdminSystemTemplatesGet(
	wallet: Address,
	systemTemplateId: string,
) {
	return getSystemTemplate({ wallet, systemTemplateId });
}

export async function platformAdminSystemTemplatesPrepareCreate(
	wallet: Address,
	body: unknown,
) {
	const parsed = zSystemTemplatePrepareCreateBody.safeParse(body);
	if (!parsed.success) throwZodBadRequest(parsed.error);

	await assertPlatformAdmin(wallet);
	return prepareSystemTemplateCreate(parsed.data);
}

export async function platformAdminSystemTemplatesCreate(
	wallet: Address,
	body: unknown,
) {
	const parsed = zSystemTemplateCreateBody.safeParse(body);
	if (!parsed.success) throwZodBadRequest(parsed.error);

	return createSystemTemplate({
		wallet,
		...parsed.data,
	});
}

export async function platformAdminSystemTemplatesPrepareUpdate(
	wallet: Address,
	body: unknown,
) {
	const parsed = zSystemTemplatePrepareUpdateBody.safeParse(body);
	if (!parsed.success) throwZodBadRequest(parsed.error);

	return prepareSystemTemplateUpdate({
		wallet,
		systemTemplateId: parsed.data.systemTemplateId,
		documents: parsed.data.documents,
	});
}

export async function platformAdminSystemTemplatesUpdate(
	wallet: Address,
	body: unknown,
) {
	const parsed = zSystemTemplateUpdateBody.safeParse(body);
	if (!parsed.success) throwZodBadRequest(parsed.error);

	return updateSystemTemplate({
		wallet,
		...parsed.data,
	});
}

export async function platformAdminSystemTemplatesPublish(
	wallet: Address,
	systemTemplateId: string,
) {
	return publishSystemTemplate({ wallet, systemTemplateId });
}

export async function platformAdminSystemTemplatesArchive(
	wallet: Address,
	systemTemplateId: string,
) {
	return archiveSystemTemplate({ wallet, systemTemplateId });
}

export async function platformAdminSystemTemplatesDelete(
	wallet: Address,
	systemTemplateId: string,
) {
	return deleteSystemTemplate({ wallet, systemTemplateId });
}
