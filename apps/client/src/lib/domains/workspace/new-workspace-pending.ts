const STORAGE_KEY = "filosign.new_workspace_pending";
const PENDING_URL_PARAM = "pendingBillingId";

export function setNewWorkspacePending(pendingBillingId: string) {
	sessionStorage.setItem(STORAGE_KEY, pendingBillingId);
}

export function getNewWorkspacePending(): string | null {
	return sessionStorage.getItem(STORAGE_KEY);
}

export function clearNewWorkspacePending() {
	sessionStorage.removeItem(STORAGE_KEY);
}

export function newWorkspaceReturnUrl(
	origin: string,
	pathname: string,
	pendingBillingId?: string,
): string {
	const url = new URL(pathname, origin);
	url.searchParams.set("createWorkspace", "1");
	if (pendingBillingId?.trim()) {
		url.searchParams.set(PENDING_URL_PARAM, pendingBillingId.trim());
	}
	return url.toString();
}

export function readNewWorkspacePendingFromUrl(
	searchParams: URLSearchParams,
): string | null {
	const fromUrl = searchParams.get(PENDING_URL_PARAM)?.trim();
	if (fromUrl) return fromUrl;
	return getNewWorkspacePending();
}

export function stripNewWorkspaceReturnParams(searchParams: URLSearchParams) {
	searchParams.delete("createWorkspace");
	searchParams.delete(PENDING_URL_PARAM);
}
