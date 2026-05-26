/** AEAD info for wrapping a draft DEK to the org KEM public key (OMK). */
export function draftDekWrapOmkInfo(draftId: string): string {
	return `filosign:draft-dek-wrap:omk:v1:${draftId}`;
}

/** AEAD info for wrapping a draft DEK to a user KEM public key (personal drafts). */
export function draftDekWrapUserInfo(draftId: string, wallet: string): string {
	return `filosign:draft-dek-wrap:user:v1:${draftId}:${wallet.toLowerCase()}`;
}

/** AEAD info for warm external review (KEM to recipient pubkey). */
export function draftDekWrapExternalInfo(
	draftId: string,
	inviteToken: string,
): string {
	return `filosign:draft-dek-wrap:external:v1:${draftId}:${inviteToken}`;
}

/** AEAD info for encrypted draft snapshot JSON. */
export function draftSnapshotInfo(draftId: string): string {
	return `filosign:draft-snapshot:v1:${draftId}`;
}

/** AEAD info for encrypted draft PDF bytes. */
export function draftDocumentInfo(draftId: string, docId: string): string {
	return `filosign:draft-document:v1:${draftId}:${docId}`;
}

/** AEAD info for encrypted draft comment bodies. */
export function draftCommentInfo(draftId: string, commentId: string): string {
	return `filosign:draft-comment:v1:${draftId}:${commentId}`;
}

/** Argon2 wrap info for cold external draft review links. */
export function draftReviewLinkInfo(
	draftId: string,
	inviteToken: string,
): string {
	return `filosign:draft-review-link:v1:${draftId}:${inviteToken}`;
}
