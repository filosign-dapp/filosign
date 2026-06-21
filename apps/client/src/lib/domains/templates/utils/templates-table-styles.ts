export const templatesTableHeadClass =
	"h-9 px-4 text-xs font-normal text-muted-foreground first:pl-5 last:pr-5";

export const templatesTableCellClass = "px-4 py-3 first:pl-5 last:pr-5";

export const templatesTableRowClass =
	"cursor-pointer border-b border-border/40 last:border-0 hover:bg-muted/30";

export function templateMetaSubtitle(parts: {
	roleCount: number;
	fieldCount: number;
	docCount: number;
}): string {
	return `${parts.roleCount} roles · ${parts.fieldCount} fields · ${parts.docCount} docs`;
}
