import type { FilosignRpcQueryUtils } from "@filosign/react";
import type { EntitlementsSnapshot } from "@filosign/react/billing";
import type { SendFileArgs } from "@filosign/react/files";
import { canUseAdvancedSettlements } from "@filosign/react/files";
import type { OrgListItem } from "@filosign/react/orgs";
import type { ProfileByAddress } from "@filosign/react/users";
import {
	normalizePlacementRecipientEmail,
	validateRegisterRoutingForSend,
} from "@filosign/shared";
import type { Address } from "viem";
import type { AttachmentPacketComposeDraft } from "@/src/lib/domains/files/attachment-packet-compose";
import { toAttachmentPacketDraftsForSend } from "@/src/lib/domains/files/attachment-packet-compose";
import { buildPlacementManifestForEnvelope } from "@/src/lib/domains/files/build-placement-manifest";
import { buildRegisterRoutingFromForm } from "@/src/lib/domains/files/build-register-routing-from-form";
import type {
	CreateForm,
	SignatureField,
} from "@/src/lib/domains/files/envelope-form-types";
import type { PlacementFieldRect } from "@/src/lib/domains/files/field-box";
import { countStoredSignablePdfPages } from "@/src/lib/domains/files/normalize-signable-document";
import type { SettlementAttachmentDraft } from "@/src/lib/domains/settlements";
import { createSettlementProfileLookup } from "@/src/lib/domains/settlements";
import { showAppErrorToast } from "@/src/lib/errors/present-app-error";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import { buildSettlementRulesForSend } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/build-settlement-rules";
import { signerEmailsForPlacementManifest } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placement-assignees";
import { resolveSettlementDraftsForSend } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/resolve-settlement-drafts";
import {
	buildSignersAndViewersForDocument,
	loadDocumentFileBytes,
	recipientResolvedSignerAddress,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send-envelope";
import { collectColdRecipients } from "./validate";

function collectViewerEmails(args: {
	recipients: Recipient[];
	coldInvites?: { email: string; isSigner: boolean }[];
}): string[] {
	const emails = new Set<string>();
	for (const r of args.recipients) {
		if (r.role !== "viewer") continue;
		const raw = r.email?.trim();
		if (raw) emails.add(normalizePlacementRecipientEmail(raw));
	}
	for (const c of args.coldInvites ?? []) {
		if (!c.isSigner)
			emails.add(normalizePlacementRecipientEmail(c.email.trim()));
	}
	return [...emails];
}

type DocPayload = {
	id: string;
	name: string;
	mimeType: string;
	bytes: Uint8Array;
	pageCount: number;
};

function pageCountFromFields(
	signatureFields: SignatureField[],
	docId: string,
): number {
	const pages = signatureFields
		.filter((f) => f.documentId === docId)
		.map((f) => f.page);
	if (pages.length === 0) return 1;
	return Math.max(1, ...pages);
}

async function resolveDocumentPageCount(args: {
	doc: CreateForm["documents"][number];
	bytes: Uint8Array;
	signatureFields: SignatureField[];
}): Promise<number> {
	if (args.doc.pageCount && args.doc.pageCount > 0) {
		return args.doc.pageCount;
	}
	try {
		return await countStoredSignablePdfPages(args.bytes);
	} catch {
		return pageCountFromFields(args.signatureFields, args.doc.id);
	}
}

export async function loadDocumentPayloads(
	createForm: CreateForm,
	signatureFields: SignatureField[],
): Promise<DocPayload[]> {
	return Promise.all(
		createForm.documents.map(async (doc) => {
			const bytes = await loadDocumentFileBytes(createForm.draftId, doc);
			const pageCount = await resolveDocumentPageCount({
				doc,
				bytes,
				signatureFields,
			});
			return {
				id: doc.id,
				name: doc.name,
				mimeType: doc.type,
				bytes,
				pageCount,
			};
		}),
	);
}

export async function resolveSettlementDrafts(args: {
	createForm: CreateForm;
	rpcQuery: FilosignRpcQueryUtils;
}): Promise<SettlementAttachmentDraft[] | null> {
	try {
		return await resolveSettlementDraftsForSend({
			drafts: args.createForm.settlementDrafts ?? [],
			recipients: args.createForm.recipients,
			lookupProfile: createSettlementProfileLookup(args.rpcQuery),
		});
	} catch (err) {
		console.error(err);
		return null;
	}
}

export async function buildEnvelopeSendPayload(args: {
	createForm: CreateForm;
	signatureFields: SignatureField[];
	entitlements: EntitlementsSnapshot | undefined;
	attachmentComposeDrafts: AttachmentPacketComposeDraft[];
	recipientProfilesMapWithRecipient: Map<
		Address,
		{ recipient: Recipient; profile: ProfileByAddress }
	>;
	placementDocHeight: number;
	docWidth: number;
	fieldBoxCss: PlacementFieldRect;
	activeOrg: OrgListItem | null | undefined;
	rpcQuery: FilosignRpcQueryUtils;
	docPayloads: DocPayload[];
	resolvedSettlementDrafts: SettlementAttachmentDraft[];
}) {
	const {
		createForm,
		signatureFields,
		entitlements,
		attachmentComposeDrafts,
		recipientProfilesMapWithRecipient,
		placementDocHeight,
		docWidth,
		fieldBoxCss,
		activeOrg,
		docPayloads,
		resolvedSettlementDrafts,
	} = args;

	const signerRecipients = createForm.recipients.filter(
		(r) => r.role === "signer",
	);
	const coldRecipients = collectColdRecipients(createForm.recipients);

	const { signers, viewers } = buildSignersAndViewersForDocument({
		recipients: createForm.recipients,
		recipientMap: recipientProfilesMapWithRecipient,
	});

	const coldInvitePayload =
		coldRecipients.length > 0
			? coldRecipients.map((r) => ({
					email: r.email.trim(),
					isSigner: r.role === "signer",
				}))
			: undefined;

	const viewerEmails = collectViewerEmails({
		recipients: createForm.recipients ?? [],
		coldInvites: coldInvitePayload,
	});

	const placementManifest = await buildPlacementManifestForEnvelope({
		documents: docPayloads,
		signerEmailsInOrder: signerEmailsForPlacementManifest({
			signerRecipients,
			signatureFields,
		}),
		signatureFields,
		docLayouts: new Map(
			createForm.documents.map((doc) => [
				doc.id,
				{
					docWidth,
					docHeight: placementDocHeight,
					fieldBox: fieldBoxCss,
				},
			]),
		),
	});

	const warmRecipientsByEmail = (createForm.recipients ?? [])
		.map((recipient) => {
			const addr = recipientResolvedSignerAddress(recipient);
			if (!addr) return null;
			const profile = recipientProfilesMapWithRecipient.get(addr)?.profile;
			if (!profile?.encryptionPublicKey || !recipient.email?.trim()) {
				return null;
			}
			return {
				email: recipient.email.trim(),
				address: addr,
				encryptionPublicKey: profile.encryptionPublicKey,
			};
		})
		.filter((x): x is NonNullable<typeof x> => x !== null);

	const settlementRules = buildSettlementRulesForSend({
		drafts: resolvedSettlementDrafts,
		recipients: createForm.recipients,
		canUseAdvancedSettlements: canUseAdvancedSettlements(entitlements),
	});

	const routing = buildRegisterRoutingFromForm({
		recipients: createForm.recipients,
		routing: createForm.registerRouting,
	});

	const routingValidationError = validateRegisterRoutingForSend({
		placementManifest,
		...(routing ? { routing } : {}),
	});

	const attachmentPacketDrafts =
		attachmentComposeDrafts.length > 0
			? toAttachmentPacketDraftsForSend(
					attachmentComposeDrafts,
					createForm.recipients,
				)
			: [];

	return {
		coldRecipients,
		coldInvitePayload,
		sendInput: {
			signers,
			viewers,
			documents: docPayloads.map(({ pageCount: _pageCount, ...doc }) => doc),
			metadata: {
				name:
					docPayloads.length === 1
						? (docPayloads[0]?.name ?? "Document")
						: `${docPayloads[0]?.name ?? "Envelope"} (+${docPayloads.length - 1} more)`,
			},
			placementManifest,
			warmRecipientsByEmail,
			viewerEmails,
			...(coldInvitePayload ? { coldInvites: coldInvitePayload } : {}),
			...(settlementRules.length > 0 ? { settlementRules } : {}),
			...(routing ? { routing } : {}),
			...(attachmentPacketDrafts.length > 0 ? { attachmentPacketDrafts } : {}),
			...(activeOrg
				? {
						organizationId: activeOrg.id,
						orgEncryptionPublicKey: activeOrg.encryptionPublicKey,
					}
				: {}),
		} satisfies SendFileArgs,
		routingValidationError,
	};
}

export function reportRoutingValidationError(error: string): void {
	showAppErrorToast(error);
}
