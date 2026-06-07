import { cn } from "@/src/lib/utils";
import {
	buildEnvelopeProgressContextLines,
	type EnvelopeProgressLike,
	envelopeProgressPercent,
	envelopeProgressTotals,
} from "@/src/routes/dashboard/document/sign/-lib/utils/envelope-progress-display";

function SignersProgressBar({
	signedCount,
	totalSigners,
	percent,
}: {
	signedCount: number;
	totalSigners: number;
	percent: number;
}) {
	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between text-[11px] text-muted-foreground">
				<span>
					{signedCount} of {totalSigners} signers
				</span>
				<span className="tabular-nums text-muted-foreground/80">
					{percent}%
				</span>
			</div>
			<div
				className="h-1.5 overflow-hidden rounded-full bg-muted"
				role="progressbar"
				aria-valuenow={signedCount}
				aria-valuemin={0}
				aria-valuemax={totalSigners}
				aria-label={`${signedCount} of ${totalSigners} signers have signed`}
			>
				<div
					className="h-full bg-secondary transition-all duration-300"
					style={{ width: `${percent}%` }}
				/>
			</div>
		</div>
	);
}

export function SignSidebarSignersProgress({
	progress,
	canSignByRouting,
}: {
	progress: EnvelopeProgressLike | null | undefined;
	canSignByRouting?: boolean;
}) {
	if (!progress) return null;

	const lines = buildEnvelopeProgressContextLines(progress, canSignByRouting);
	const { signedCount, totalSigners } = envelopeProgressTotals(progress);
	const percent = envelopeProgressPercent(signedCount, totalSigners);

	if (lines.length === 0 && totalSigners === 0) return null;

	return (
		<div
			className={cn(
				"space-y-2 text-xs text-muted-foreground",
				(lines.length > 0 || totalSigners > 0) &&
					"mb-3 border-b border-border/60 pb-3",
			)}
		>
			{lines.map((line) => (
				<p key={line}>{line}</p>
			))}
			{totalSigners > 0 ? (
				<SignersProgressBar
					signedCount={signedCount}
					totalSigners={totalSigners}
					percent={percent}
				/>
			) : null}
		</div>
	);
}
