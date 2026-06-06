/** Whether monthly send quota should apply for this upload/register. */
export function shouldEnforceSendQuota(
	isPractice: boolean | undefined,
): boolean {
	return !isPractice;
}
