import {
	buildCatalogSourceForInstall,
	type TemplateSnapshot,
	zTemplatePlaintextSha256,
	zTemplateSnapshot,
} from "@filosign/shared";
import type { Hex } from "viem";
import type { AppRouterClient } from "../../orpc/app-router-types";
import {
	createSaveOrgTemplateDeps,
	type SaveOrgTemplateDeps,
	saveOrgTemplateCreate,
} from "../save-org-template/save-org-template";

export type InstallCatalogTemplateInput = {
	systemTemplateId: string;
	templateId: string;
	organizationId: string;
	orgEncryptionPublicKey: Hex;
	name: string;
};

export type InstallCatalogTemplateDeps = SaveOrgTemplateDeps & {
	prepareInstallFromSystem: AppRouterClient["orgs"]["templates"]["prepareInstallFromSystem"];
};

export function createInstallCatalogTemplateDeps(args: {
	rpc: AppRouterClient;
	wallet: Parameters<typeof createSaveOrgTemplateDeps>[0]["wallet"];
}): InstallCatalogTemplateDeps {
	return {
		...createSaveOrgTemplateDeps(args),
		prepareInstallFromSystem: (body) =>
			args.rpc.orgs.templates.prepareInstallFromSystem(body),
	};
}

async function fetchCatalogDocumentBytes(
	downloadUrl: string,
): Promise<Uint8Array> {
	const res = await fetch(downloadUrl);
	if (!res.ok) {
		throw new Error("Failed to download catalog template document");
	}
	return new Uint8Array(await res.arrayBuffer());
}

export async function installCatalogTemplate(
	deps: InstallCatalogTemplateDeps,
	input: InstallCatalogTemplateInput,
) {
	const payload = await deps.prepareInstallFromSystem({
		systemTemplateId: input.systemTemplateId,
	});

	const catalogSource = buildCatalogSourceForInstall({
		systemTemplateId: input.systemTemplateId,
		systemContentFingerprint: payload.systemContentFingerprint,
		catalogVersionLabel: payload.catalogVersionLabel,
	});

	const baseSnapshot = zTemplateSnapshot.parse(payload.snapshotJson);
	const snapshot: TemplateSnapshot = {
		...baseSnapshot,
		catalogSource,
	};

	const documents = payload.documents.map((doc) => ({
		docId: doc.docId,
		plaintextSha256: zTemplatePlaintextSha256.parse(doc.plaintextSha256),
		name: doc.name,
		size: doc.size,
		mimeType: doc.mimeType,
	}));

	const bytesByDocId = new Map<string, Uint8Array>();
	await Promise.all(
		payload.documents.map(async (doc) => {
			bytesByDocId.set(
				doc.docId,
				await fetchCatalogDocumentBytes(doc.downloadUrl),
			);
		}),
	);

	return saveOrgTemplateCreate(deps, {
		templateId: input.templateId,
		organizationId: input.organizationId,
		orgEncryptionPublicKey: input.orgEncryptionPublicKey,
		name: input.name.trim(),
		snapshot,
		documents,
		loadDocumentBytes: async (docId) => {
			const bytes = bytesByDocId.get(docId);
			if (!bytes) {
				throw new Error(`Missing catalog document bytes for ${docId}`);
			}
			return bytes;
		},
	});
}
