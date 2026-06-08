import type { DraftSnapshot } from "@filosign/shared";
import {
	digestDraftSnapshot,
	normalizePlacementRecipientEmail,
} from "@filosign/shared";
import { buildPlacementManifestForDocument } from "@/src/lib/domains/files/build-placement-manifest";
import type {
	CreateForm,
	EnvelopeForm,
	SignatureField,
} from "@/src/lib/domains/files/envelope-form-types";
import { defaultPlacementFieldRect } from "@/src/lib/domains/files/field-box";

const PERSIST_STORAGE_KEY = "filosign-client";

export type DraftSyncMode = "local" | "server";

export function draftSyncModeFromSearch(
	serverDraftId: string | undefined,
): DraftSyncMode {
	return serverDraftId?.trim() ? "server" : "local";
}

/** True when add-sign URL has `serverDraftId` (server is authoritative). */
export function isServerDraftSyncFromUrl(): boolean {
	if (typeof window === "undefined") return false;
	const params = new URLSearchParams(window.location.search);
	return Boolean(params.get("serverDraftId")?.trim());
}

export function shouldPersistCreateFormToDisk(): boolean {
	return !isServerDraftSyncFromUrl();
}

/** Remove stale `createForm` from localStorage so refresh cannot resurrect local state. */
export function clearPersistedCreateFormFromDisk(): void {
	if (typeof window === "undefined") return;
	try {
		const raw = localStorage.getItem(PERSIST_STORAGE_KEY);
		if (!raw) return;
		const parsed = JSON.parse(raw) as {
			state?: { createForm?: unknown; activeOrgId?: unknown };
		};
		if (parsed.state?.createForm == null) return;
		parsed.state.createForm = null;
		localStorage.setItem(PERSIST_STORAGE_KEY, JSON.stringify(parsed));
	} catch {
		// ignore corrupt storage
	}
}

/** Rebuild placement manifest the same way draft save does (for digest parity). */
export function placementManifestFromCreateForm(
	form: CreateForm,
): DraftSnapshot["placementManifest"] | null {
	const doc = form.documents[0];
	if (!doc) return null;
	return buildPlacementManifestForDocument({
		docId: doc.id,
		signerEmailsInOrder: form.recipients
			.filter((r) => r.role === "signer")
			.map((r) => normalizePlacementRecipientEmail(r.email.trim())),
		signatureFields: form.signatureFields ?? [],
		docWidth: 612,
		docHeight: 792,
		fieldBox: defaultPlacementFieldRect("signature", false),
		strict: false,
	});
}

export function resolveCreateFormSnapshotDigest(
	form: CreateForm,
	fallbackPlacementManifest?: DraftSnapshot["placementManifest"],
): string {
	const placementManifest =
		placementManifestFromCreateForm(form) ?? fallbackPlacementManifest;
	if (!placementManifest) return "";
	return digestCreateFormSnapshot(form, placementManifest);
}

export function buildDraftSnapshotFromForm(args: {
	recipients: EnvelopeForm["recipients"];
	emailSubject: string;
	emailMessage: string;
	documents: { id: string; name: string; size: number; type: string }[];
	settlementDrafts: CreateForm["settlementDrafts"];
	signatureFields: SignatureField[];
	placementManifest: DraftSnapshot["placementManifest"];
}): DraftSnapshot {
	return {
		recipients: args.recipients,
		emailSubject: args.emailSubject,
		emailMessage: args.emailMessage,
		documents: args.documents,
		settlementDrafts: args.settlementDrafts ?? [],
		signatureFields: args.signatureFields,
		placementManifest: args.placementManifest,
	};
}

export function digestCreateFormSnapshot(
	form: CreateForm,
	placementManifest: DraftSnapshot["placementManifest"],
): string {
	const snapshot = buildDraftSnapshotFromForm({
		recipients: form.recipients,
		emailSubject: form.emailSubject,
		emailMessage: form.emailMessage,
		documents: form.documents.map((d) => ({
			id: d.id,
			name: d.name,
			size: d.size,
			type: d.type,
		})),
		settlementDrafts: form.settlementDrafts ?? [],
		signatureFields: form.signatureFields ?? [],
		placementManifest,
	});
	return digestDraftSnapshot(snapshot);
}

export function isCreateFormDirty(
	currentDigest: string,
	baselineDigest: string,
): boolean {
	if (!currentDigest || !baselineDigest) return false;
	return currentDigest !== baselineDigest;
}
