import type { FileInfo } from "@filosign/react/files";

export function EnvelopeOpsStatus(props: {
	fileInfo: FileInfo | null | undefined;
}) {
	const foc = props.fileInfo?.focStatus;
	const exportRow = props.fileInfo?.latestComplianceExport;

	if (!foc && !exportRow) {
		return null;
	}

	return (
		<div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
			{foc ? (
				<span className="rounded-md border border-border/60 bg-muted/20 px-2 py-1">
					Archive: {foc.lifecycle} · replicate {foc.replicateStatus}
					{foc.focVerifiedAt ? " · verified" : ""}
				</span>
			) : null}
			{exportRow ? (
				<span className="rounded-md border border-border/60 bg-muted/20 px-2 py-1">
					Last export: {exportRow.exportKind} ·{" "}
					{new Date(exportRow.createdAt).toLocaleString()}
				</span>
			) : null}
		</div>
	);
}
