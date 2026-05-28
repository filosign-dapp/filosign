export function draftStoragePrefix(args: {
	draftId: string;
	organizationId: string | null;
}): string {
	const scope = args.organizationId ?? "personal";
	return `drafts/${scope}/${args.draftId}`;
}

export function draftSnapshotKey(args: {
	draftId: string;
	organizationId: string | null;
}): string {
	return `${draftStoragePrefix(args)}/snapshot.bin`;
}

export function draftDocumentKey(args: {
	draftId: string;
	organizationId: string | null;
	docId: string;
}): string {
	return `${draftStoragePrefix(args)}/${args.docId}.bin`;
}
