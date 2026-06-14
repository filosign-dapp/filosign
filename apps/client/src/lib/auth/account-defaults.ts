export const DEFAULT_ACCOUNT_FIRST_NAME = "Filosign User";

export function defaultWorkspaceName(): string {
	return `${DEFAULT_ACCOUNT_FIRST_NAME}'s Workspace`;
}

export function personalizedWorkspaceName(firstName: string): string {
	const trimmed = firstName.trim();
	return trimmed ? `${trimmed}'s Workspace` : defaultWorkspaceName();
}

export function isPersonalizationComplete(
	profile: { firstName?: string | null } | undefined,
): boolean {
	const first = profile?.firstName?.trim();
	return Boolean(first && !isReservedAccountFirstName(first));
}

export function isReservedAccountFirstName(firstName: string): boolean {
	return firstName.trim() === DEFAULT_ACCOUNT_FIRST_NAME;
}
