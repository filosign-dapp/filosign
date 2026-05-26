import { normalizePlacementRecipientEmail } from "@filosign/shared";
import type {
	CreateForm,
	Recipient,
	SignatureField,
	StoredDocument,
	UploadedFile,
} from "@/src/lib/domains/files/envelope-form-types";
import { createClientId } from "@/src/lib/utils/id";
import type { EnvelopeForm } from "@/src/routes/dashboard/envelope/create/-lib/types";

export const EMPTY_ENVELOPE_FORM: EnvelopeForm = {
	recipients: [],
	emailMessage: "",
	emailSubject: "",
	documents: [],
	settlementDrafts: [],
};

/** Compose UI when IndexedDB blobs are missing but metadata exists in `createForm`. */
export function createFormToEnvelopeFormWithoutDocuments(
	draft: CreateForm,
): EnvelopeForm {
	return {
		recipients: draft.recipients,
		emailMessage: draft.emailMessage,
		emailSubject: draft.emailSubject ?? "",
		documents: [],
		settlementDrafts: draft.settlementDrafts ?? [],
	};
}

const DB_NAME = "filosign-envelope-drafts";
const STORE = "blobs";

type BlobRow = {
	key: string;
	blob: Blob;
	name: string;
	size: number;
	type: string;
};

function docKey(draftId: string, docId: string) {
	return `${draftId}:${docId}`;
}

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () => {
			req.result.createObjectStore(STORE, { keyPath: "key" });
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

function txDone(tx: IDBTransaction) {
	return new Promise<void>((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

function dataUrlToFile(
	dataUrl: string,
	name: string,
	fallbackType: string,
): File {
	const comma = dataUrl.indexOf(",");
	if (comma === -1) throw new Error("Invalid document data URL");
	const header = dataUrl.slice(0, comma);
	const base64 = dataUrl.slice(comma + 1);
	const mimeMatch = header.match(/data:([^;]+)/);
	const type = mimeMatch?.[1] ?? fallbackType;
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new File([bytes], name, { type });
}

/** One-off import path (e.g. org templates with inline data URLs). */
export function uploadedFromDataUrl(
	dataUrl: string,
	meta: { id: string; name: string; type: string },
): UploadedFile {
	const file = dataUrlToFile(dataUrl, meta.name, meta.type);
	return {
		id: meta.id,
		file,
		name: meta.name,
		size: file.size,
		type: meta.type,
	};
}

export function recipientFingerprint(recipients: Recipient[]): string {
	return recipients
		.map(
			(r) =>
				`${r.role}:${normalizePlacementRecipientEmail(r.email?.trim() ?? "")}:${(r.walletAddress ?? "").toLowerCase()}`,
		)
		.sort()
		.join("|");
}

export function pruneSignatureFields(
	fields: SignatureField[],
	recipients: Recipient[],
): SignatureField[] {
	const signerEmails = new Set(
		recipients
			.filter((r) => r.role === "signer")
			.map((r) => normalizePlacementRecipientEmail(r.email?.trim() ?? ""))
			.filter(Boolean),
	);
	return fields.filter((f) =>
		signerEmails.has(normalizePlacementRecipientEmail(f.assignedSignerEmail)),
	);
}

export async function saveDraftDocuments(
	draftId: string,
	documents: UploadedFile[],
): Promise<void> {
	const db = await openDb();
	const tx = db.transaction(STORE, "readwrite");
	const store = tx.objectStore(STORE);
	const prefix = `${draftId}:`;
	const keep = new Set(documents.map((d) => docKey(draftId, d.id)));

	const existing = await new Promise<string[]>((resolve, reject) => {
		const keys: string[] = [];
		const cursorReq = store.openCursor();
		cursorReq.onsuccess = () => {
			const cursor = cursorReq.result;
			if (!cursor) {
				resolve(keys);
				return;
			}
			const key = cursor.key as string;
			if (key.startsWith(prefix)) keys.push(key);
			cursor.continue();
		};
		cursorReq.onerror = () => reject(cursorReq.error);
	});

	for (const key of existing) {
		if (!keep.has(key)) store.delete(key);
	}

	for (const doc of documents) {
		store.put({
			key: docKey(draftId, doc.id),
			blob: doc.file,
			name: doc.name,
			size: doc.size,
			type: doc.type,
		} satisfies BlobRow);
	}

	await txDone(tx);
	db.close();
}

export async function loadDraftDocuments(
	draftId: string,
	meta: StoredDocument[],
): Promise<UploadedFile[]> {
	if (meta.length === 0) return [];
	const db = await openDb();
	const tx = db.transaction(STORE, "readonly");
	const store = tx.objectStore(STORE);
	const out: UploadedFile[] = [];

	for (const doc of meta) {
		const row = await new Promise<BlobRow | undefined>((resolve, reject) => {
			const req = store.get(docKey(draftId, doc.id));
			req.onsuccess = () => resolve(req.result as BlobRow | undefined);
			req.onerror = () => reject(req.error);
		});
		if (!row) continue;
		const file =
			row.blob instanceof File
				? row.blob
				: new File([row.blob], row.name, { type: row.type });
		out.push({
			id: doc.id,
			file,
			name: doc.name,
			size: doc.size,
			type: doc.type,
		});
	}

	await txDone(tx);
	db.close();
	return out;
}

export async function clearDraftDocuments(draftId: string): Promise<void> {
	const db = await openDb();
	const tx = db.transaction(STORE, "readwrite");
	const store = tx.objectStore(STORE);
	const prefix = `${draftId}:`;

	await new Promise<void>((resolve, reject) => {
		const cursorReq = store.openCursor();
		cursorReq.onsuccess = () => {
			const cursor = cursorReq.result;
			if (!cursor) {
				resolve();
				return;
			}
			const key = cursor.key as string;
			if (key.startsWith(prefix)) cursor.delete();
			cursor.continue();
		};
		cursorReq.onerror = () => reject(cursorReq.error);
	});

	await txDone(tx);
	db.close();
}

export async function loadDocumentBytes(
	draftId: string,
	doc: StoredDocument,
): Promise<Uint8Array> {
	const [uploaded] = await loadDraftDocuments(draftId, [doc]);
	if (!uploaded) {
		throw new Error("Draft document not found");
	}
	return new Uint8Array(await uploaded.file.arrayBuffer());
}

export async function buildCreateForm(
	value: EnvelopeForm,
	prev: CreateForm | null,
): Promise<CreateForm> {
	const draftId = prev?.draftId ?? createClientId();
	const recipientFingerprintValue = recipientFingerprint(value.recipients);
	const fingerprintChanged =
		prev != null && prev.recipientFingerprint !== recipientFingerprintValue;

	await saveDraftDocuments(draftId, value.documents);

	const documents: StoredDocument[] = value.documents.map((doc) => ({
		id: doc.id,
		name: doc.name,
		size: doc.size,
		type: doc.type,
	}));

	const signatureFields = fingerprintChanged
		? []
		: pruneSignatureFields(prev?.signatureFields ?? [], value.recipients);

	return {
		draftId,
		recipientFingerprint: recipientFingerprintValue,
		recipients: value.recipients,
		emailMessage: value.emailMessage,
		emailSubject: value.emailSubject ?? "",
		documents,
		settlementDrafts: value.settlementDrafts ?? [],
		signatureFields,
	};
}

export async function createFormToEnvelopeForm(
	draft: CreateForm,
): Promise<EnvelopeForm> {
	const documents = await loadDraftDocuments(draft.draftId, draft.documents);
	return {
		recipients: draft.recipients,
		emailMessage: draft.emailMessage,
		emailSubject: draft.emailSubject ?? "",
		documents,
		settlementDrafts: draft.settlementDrafts ?? [],
	};
}

export function normalizeCreateForm(draft: CreateForm): CreateForm {
	return {
		...draft,
		draftId: draft.draftId || createClientId(),
		recipientFingerprint:
			draft.recipientFingerprint || recipientFingerprint(draft.recipients),
		signatureFields: pruneSignatureFields(
			draft.signatureFields ?? [],
			draft.recipients,
		),
	};
}

export function hasDraftContent(draft: CreateForm | null | undefined): boolean {
	if (!draft) return false;
	return (
		draft.documents.length > 0 ||
		draft.recipients.length > 0 ||
		(draft.emailMessage?.trim().length ?? 0) > 0 ||
		(draft.settlementDrafts?.length ?? 0) > 0
	);
}
