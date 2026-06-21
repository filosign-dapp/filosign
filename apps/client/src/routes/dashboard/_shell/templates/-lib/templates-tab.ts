export const TEMPLATES_TABS = ["yours", "library"] as const;
export type TemplatesTab = (typeof TEMPLATES_TABS)[number];

export function parseTemplatesTab(val: string): TemplatesTab | null {
	return (TEMPLATES_TABS as readonly string[]).includes(val)
		? (val as TemplatesTab)
		: null;
}
