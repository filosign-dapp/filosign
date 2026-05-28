import type { DraftSnapshot } from "@filosign/shared";
import type { Address, Hex } from "viem";
import { decryptDraftDocument, decryptDraftSnapshot } from "./draft-crypto";
import { getCachedDraftDek, setCachedDraftDek } from "./draft-dek-cache";
import { debugDraftLoad } from "./draft-load-debug";
import {
	type DraftHead,
	draftOrganizationId,
	resolveDraftDek,
} from "./resolve-draft-dek";

export type DecryptedDraft = {
	snapshot: DraftSnapshot;
	documents: { id: string; name: string; type: string; bytes: Uint8Array }[];
};

export type DecryptDraftHead = DraftHead & {
	draft: DraftHead["draft"] & { revision: number };
	headSnapshot?: DraftSnapshot | null;
	snapshot: { downloadUrl: string };
	documents: {
		docId: string;
		name: string;
		mimeType: string;
		downloadUrl: string;
	}[];
};

export type DecryptDraftDeps = {
	wallet: Address;
	fetchHead: (draftId: string) => Promise<DecryptDraftHead>;
	wrapForMine: (organizationId: string) => Promise<{
		wrappedOmk: Hex;
		wrapKemCiphertext: Hex;
	}>;
};

async function decryptOneDocument(args: {
	dek: Uint8Array;
	draftId: string;
	doc: DecryptDraftHead["documents"][number];
}): Promise<DecryptedDraft["documents"][number]> {
	const dl = await fetch(args.doc.downloadUrl);
	if (!dl.ok) throw new Error(`Failed to download ${args.doc.name}`);
	const bytes = await decryptDraftDocument({
		dek: args.dek,
		draftId: args.draftId,
		docId: args.doc.docId,
		ciphertext: new Uint8Array(await dl.arrayBuffer()),
	});
	return {
		id: args.doc.docId,
		name: args.doc.name,
		type: args.doc.mimeType,
		bytes,
	};
}

export async function decryptDraftWithHead(
	deps: DecryptDraftDeps,
	args: {
		draftId: string;
		head?: DecryptDraftHead;
	},
): Promise<DecryptedDraft> {
	const { draftId } = args;
	debugDraftLoad("start", { draftId, headProvided: Boolean(args.head) });

	const head = args.head ?? (await deps.fetchHead(draftId));
	debugDraftLoad("head.ok", {
		draftId,
		revision: head.draft.revision,
		headSnapshotFromDb: Boolean(head.headSnapshot),
		documentCount: head.documents.length,
	});

	const organizationId = draftOrganizationId(head);
	let dek = getCachedDraftDek(draftId, deps.wallet);
	if (!dek) {
		const myWrap = await deps.wrapForMine(organizationId);
		dek = await resolveDraftDek({
			draftId,
			head,
			wallet: deps.wallet,
			myOrgWrap: myWrap,
		});
		setCachedDraftDek(draftId, deps.wallet, dek);
	} else {
		debugDraftLoad("dek.cache_hit", { draftId });
	}

	let snapshot: DraftSnapshot;
	if (head.headSnapshot) {
		debugDraftLoad("snapshot.from_db");
		snapshot = head.headSnapshot;
	} else {
		debugDraftLoad("snapshot.from_s3");
		const snapRes = await fetch(head.snapshot.downloadUrl);
		if (!snapRes.ok) throw new Error("Failed to download draft snapshot");
		snapshot = await decryptDraftSnapshot({
			dek,
			draftId,
			ciphertext: new Uint8Array(await snapRes.arrayBuffer()),
		});
	}

	const documents = await Promise.all(
		head.documents.map((doc) => decryptOneDocument({ dek, draftId, doc })),
	);

	return { snapshot, documents };
}
