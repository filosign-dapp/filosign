import type { ChangelogEntry } from "../content/changelog";

export type ChangelogTreeNode = {
	id: string;
	label: string;
	x: number;
	y: number;
	r: number;
	kind: "root" | "trunk" | "branch" | "leaf";
	entryId?: string;
};

export type ChangelogTreeLink = {
	from: string;
	to: string;
};

export type ChangelogTreeGraph = {
	nodes: ChangelogTreeNode[];
	links: ChangelogTreeLink[];
	viewBox: string;
};

const W = 400;
const H = 360;
const CX = W / 2;
const ROOT_Y = H - 28;

/** Radial growth tree from changelog highlights (root → trunk → branches → canopy). */
export function buildChangelogTree(
	entries: ChangelogEntry[],
): ChangelogTreeGraph {
	const byId = new Map(entries.map((entry) => [entry.id, entry]));
	const pick = (id: string) => byId.get(id);

	const root = pick("1");
	const trunk = ["2", "3"].map(pick).filter(Boolean) as ChangelogEntry[];
	const branches = ["11", "13", "14"]
		.map(pick)
		.filter(Boolean) as ChangelogEntry[];
	const canopy = entries.filter(
		(entry) => entry.era === "acceleration" && entry.treeHighlight,
	);

	const nodes: ChangelogTreeNode[] = [];
	const links: ChangelogTreeLink[] = [];

	if (root) {
		nodes.push({
			id: "root",
			label: "Sign in",
			x: CX,
			y: ROOT_Y,
			r: 7,
			kind: "root",
			entryId: root.id,
		});
	}

	let prevId = "root";
	trunk.forEach((entry, index) => {
		const id = `trunk-${entry.id}`;
		const y = ROOT_Y - 52 - index * 44;
		nodes.push({
			id,
			label: index === 0 ? "Private" : "Send",
			x: CX,
			y,
			r: 5,
			kind: "trunk",
			entryId: entry.id,
		});
		links.push({ from: prevId, to: id });
		prevId = id;
	});

	const branchY = ROOT_Y - 52 - trunk.length * 44 - 36;
	const branchSpread = 110;
	branches.forEach((entry, index) => {
		const id = `branch-${entry.id}`;
		const offset = (index - (branches.length - 1) / 2) * branchSpread;
		nodes.push({
			id,
			label: entry.category,
			x: CX + offset,
			y: branchY,
			r: 5.5,
			kind: "branch",
			entryId: entry.id,
		});
		links.push({ from: prevId, to: id });
	});

	const canopyY = branchY - 72;
	const canopySpread = 150;
	const canopyEntries =
		canopy.length > 0
			? canopy
			: entries.filter((entry) => entry.era === "acceleration").slice(0, 5);

	canopyEntries.forEach((entry, index) => {
		const id = `leaf-${entry.id}`;
		const count = canopyEntries.length;
		const offset =
			count === 1 ? 0 : ((index / (count - 1)) * 2 - 1) * (canopySpread / 2);
		const jitter = (index % 2 === 0 ? -1 : 1) * 8;
		nodes.push({
			id,
			label: entry.title.split(" ").slice(0, 2).join(" "),
			x: CX + offset,
			y: canopyY + jitter,
			r: 4,
			kind: "leaf",
			entryId: entry.id,
		});
		const parentBranch =
			nodes.find(
				(node) => node.kind === "branch" && node.label === entry.category,
			)?.id ?? prevId;
		links.push({ from: parentBranch, to: id });
	});

	return {
		nodes,
		links,
		viewBox: `0 0 ${W} ${H}`,
	};
}

/** Monthly entry counts for mobile density bar (oldest → newest). */
export function changelogDensityByMonth(
	entries: ChangelogEntry[],
): ReadonlyArray<{ key: string; count: number }> {
	const counts = new Map<string, number>();
	for (const entry of [...entries].reverse()) {
		const parts = entry.date.replace(",", "").split(" ");
		const key = `${parts[0]} ${parts[2]}`;
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return [...counts.entries()].map(([key, count]) => ({ key, count }));
}

export function linkPath(
	from: ChangelogTreeNode,
	to: ChangelogTreeNode,
): string {
	const midY = (from.y + to.y) / 2;
	return `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
}
