export function interpolateTemplate(
	template: string,
	params: Record<string, string | number | boolean | bigint> | undefined,
): string {
	if (!params) return template;
	return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
		const value = params[key];
		return value === undefined ? `{{${key}}}` : String(value);
	});
}
