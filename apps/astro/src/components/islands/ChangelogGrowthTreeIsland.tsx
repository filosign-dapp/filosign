import { SPRING_TOKENS } from "@filosign/motion";
import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import type { ChangelogEntry } from "../../content/changelog";
import {
	buildChangelogTree,
	changelogDensityByMonth,
	linkPath,
} from "../../lib/changelog-tree";
import { cn } from "../../lib/cn";

type ChangelogTreeNodeKind = "root" | "trunk" | "branch" | "leaf";

interface ChangelogGrowthTreeIslandProps {
	entries: ChangelogEntry[];
	onNodeClick?: (entryId: string) => void;
	className?: string;
}

function nodeFill(kind: ChangelogTreeNodeKind): string {
	switch (kind) {
		case "root":
			return "var(--color-primary)";
		case "branch":
			return "var(--color-emerald-400, #34d399)";
		default:
			return "var(--color-muted-foreground)";
	}
}

function GrowthTreeSvg({
	entries,
	onNodeClick,
}: {
	entries: ChangelogEntry[];
	onNodeClick?: (entryId: string) => void;
}) {
	const reduceMotion = useReducedMotion();
	const graph = useMemo(() => buildChangelogTree(entries), [entries]);

	return (
		<svg
			viewBox={graph.viewBox}
			className="h-full w-full"
			role="img"
			aria-label="How Filosign grew from first sign-in through proof, teams, payouts, and recent releases"
		>
			{graph.links.map((link, index) => {
				const from = graph.nodes.find((node) => node.id === link.from);
				const to = graph.nodes.find((node) => node.id === link.to);
				if (!from || !to) return null;
				const d = linkPath(from, to);

				return (
					<motion.path
						key={`${link.from}-${link.to}`}
						d={d}
						fill="none"
						stroke="currentColor"
						strokeWidth={1.25}
						className="text-border"
						initial={
							reduceMotion
								? { pathLength: 1, opacity: 0.7 }
								: { pathLength: 0, opacity: 0 }
						}
						animate={{ pathLength: 1, opacity: 0.7 }}
						transition={{
							...SPRING_TOKENS.soft,
							delay: reduceMotion ? 0 : 0.15 + index * 0.06,
						}}
					/>
				);
			})}

			{graph.nodes.map((node, index) => (
				<g key={node.id}>
					<motion.circle
						cx={node.x}
						cy={node.y}
						r={node.r}
						fill={nodeFill(node.kind)}
						className={cn(
							node.entryId && onNodeClick && "cursor-pointer",
							node.kind === "leaf" && "opacity-80",
						)}
						initial={
							reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }
						}
						animate={{ opacity: node.kind === "leaf" ? 0.85 : 1, scale: 1 }}
						transition={{
							...SPRING_TOKENS.snappy,
							delay: reduceMotion ? 0 : 0.35 + index * 0.05,
						}}
						onClick={() => {
							if (node.entryId && onNodeClick) {
								onNodeClick(node.entryId);
							}
						}}
					/>
					{(node.kind === "root" || node.kind === "branch") && (
						<text
							x={node.x}
							y={node.y + (node.kind === "root" ? 22 : -14)}
							textAnchor="middle"
							className="fill-muted-foreground font-manrope text-[10px] font-medium"
						>
							{node.label}
						</text>
					)}
				</g>
			))}
		</svg>
	);
}

function DensityBar({ entries }: { entries: ChangelogEntry[] }) {
	const months = useMemo(() => changelogDensityByMonth(entries), [entries]);
	const max = Math.max(...months.map((month) => month.count), 1);

	return (
		<div
			className="flex h-16 items-end gap-1 px-2"
			role="img"
			aria-label="More product updates shipped each month through 2026"
		>
			{months.map((month) => (
				<div
					key={month.key}
					className="flex flex-1 flex-col items-center gap-1"
				>
					<div
						className="w-full rounded-full bg-primary/70 transition-all"
						style={{
							height: `${Math.max(12, (month.count / max) * 100)}%`,
							minHeight: "0.5rem",
						}}
						title={`${month.key}: ${month.count}`}
					/>
					<span className="sr-only">
						{month.key}: {month.count} updates
					</span>
				</div>
			))}
		</div>
	);
}

export default function ChangelogGrowthTreeIsland({
	entries,
	onNodeClick,
	className,
}: ChangelogGrowthTreeIslandProps) {
	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-3xl border border-border/60 bg-muted/10 p-4 md:p-6",
				className,
			)}
		>
			<div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
			<div className="hidden md:block md:h-[min(360px,40dvh)]">
				<GrowthTreeSvg entries={entries} onNodeClick={onNodeClick} />
			</div>
			<div className="md:hidden">
				<p className="mb-3 text-center font-manrope text-xs font-medium text-muted-foreground">
					A little more each month
				</p>
				<DensityBar entries={entries} />
			</div>
		</div>
	);
}
