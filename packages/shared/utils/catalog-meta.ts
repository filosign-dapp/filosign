export function parseTagsInput(raw: string): string[] {
	return raw
		.split(",")
		.map((tag) => tag.trim())
		.filter((tag) => tag.length > 0);
}

/** Remove trailing catalog-style version suffixes, e.g. "W-9 (v1.1) (v1.2)" → "W-9". */
export function stripCatalogVersionSuffixes(name: string): string {
	let baseName = name.trim();
	while (/\s\([^()]+\)$/.test(baseName)) {
		baseName = baseName.replace(/\s\([^()]+\)$/, "").trim();
	}
	return baseName;
}

/** Workspace org template name when installing from the Library catalog. */
export function resolveCatalogInstallName(args: {
	name: string;
	catalogVersionLabel: string;
	appendVersionLabel: boolean;
}): string {
	if (!args.appendVersionLabel) return args.name.trim();

	const baseName = stripCatalogVersionSuffixes(args.name);
	return `${baseName} (${args.catalogVersionLabel})`;
}
