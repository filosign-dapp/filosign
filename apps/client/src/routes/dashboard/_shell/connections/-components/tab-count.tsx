export function TabCount({ count }: { count: number }) {
	if (count <= 0) return null;
	return <span className="tabular-nums text-muted-foreground">({count})</span>;
}
