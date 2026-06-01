import {
	buildEnvelopeProgressLines,
	type EnvelopeProgressLike,
	envelopeProgressPercent,
	envelopeProgressTotals,
} from "@/src/routes/dashboard/document/sign/-lib/utils/envelope-progress-display";

type Props = {
	progress: EnvelopeProgressLike | null | undefined;
	canSignByRouting?: boolean;
};

export function SignEnvelopeProgressBanner({
	progress,
	canSignByRouting,
}: Props) {
	if (!progress) return null;

	const lines = buildEnvelopeProgressLines(progress, canSignByRouting);
	const { signedCount, totalSigners } = envelopeProgressTotals(progress);
	const percent = envelopeProgressPercent(signedCount, totalSigners);

	if (lines.length === 0 && totalSigners === 0) return null;

	return (
		<div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-2">
			<p className="font-medium text-foreground/80">Signing progress</p>
			{lines.map((line) => (
				<p key={line}>{line}</p>
			))}
			{totalSigners > 0 ? (
				<div className="space-y-1.5 pt-0.5">
					<div className="flex items-center justify-between text-[11px]">
						<span>
							{signedCount} of {totalSigners} signers
						</span>
						<span className="tabular-nums text-muted-foreground/80">
							{percent}%
						</span>
					</div>
					<div
						className="h-1.5 bg-muted rounded-full overflow-hidden"
						role="progressbar"
						aria-valuenow={signedCount}
						aria-valuemin={0}
						aria-valuemax={totalSigners}
						aria-label={`${signedCount} of ${totalSigners} signers have signed`}
					>
						<div
							className="h-full bg-chart-2 transition-all duration-500"
							style={{ width: `${percent}%` }}
						/>
					</div>
				</div>
			) : null}
		</div>
	);
}
