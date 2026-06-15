import { useMemo, useState } from "react";

export type TemplateListItem = {
	id: string;
	name: string;
	updatedAt: string | Date;
	roleCount: number;
	fieldCount: number;
	docCount: number;
};

export function useTemplatesListController(templates: TemplateListItem[]) {
	const [searchInput, setSearchInput] = useState("");
	const normalizedQuery = searchInput.trim().toLowerCase();

	const filteredTemplates = useMemo(() => {
		if (!normalizedQuery) return templates;
		return templates.filter((template) =>
			template.name.toLowerCase().includes(normalizedQuery),
		);
	}, [templates, normalizedQuery]);

	return {
		searchInput,
		setSearchInput,
		filteredTemplates,
		hasSearchQuery: normalizedQuery.length > 0,
	};
}
