import { ArrowSquareOutIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { Badge } from "@/src/lib/components/ui/badge";
import {
	useSignMeta,
	useSignSigning,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";

export function SignHeaderSignedStatus() {
	const { alreadySigned } = useSignSigning();
	const { signedTxExplorerUrl, explorerLabel } = useSignMeta();

	if (!alreadySigned) return null;

	return (
		<>
			<Badge
				variant="secondary"
				className="gap-1.5 border-border bg-secondary/90 text-secondary-foreground shadow-none"
			>
				<CheckCircleIcon className="size-3.5 text-chart-2" weight="fill" />
				Signed
			</Badge>
			{signedTxExplorerUrl ? (
				<a
					href={signedTxExplorerUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1 text-xs font-medium text-ring hover:text-ring/90 hover:underline"
				>
					{explorerLabel}
					<ArrowSquareOutIcon className="size-3.5" />
				</a>
			) : (
				<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
					On-chain proof recorded
				</span>
			)}
		</>
	);
}
