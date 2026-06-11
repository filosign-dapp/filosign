export function initialsFromName(name: string | null, fallback: string) {
	const src = name?.trim() || fallback;
	const parts = src
		.replace(/0x/gi, "")
		.split(/[\s._-]+/)
		.filter(Boolean);
	const a = parts[0]?.[0];
	const b = parts[1]?.[0];
	if (a !== undefined && b !== undefined) {
		return `${a}${b}`.toUpperCase().slice(0, 2);
	}
	return src.slice(0, 2).toUpperCase();
}
