export function formatAdminDateTime(iso: string | null | undefined): string {
	if (!iso) return "–";
	return new Date(iso).toLocaleString(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	});
}
