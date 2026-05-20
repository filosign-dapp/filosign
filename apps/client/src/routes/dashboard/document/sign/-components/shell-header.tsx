import { ArrowLeftIcon } from "@phosphor-icons/react";
import { CopyButton } from "@/src/lib/components/app/chrome/copy-button";
import { Button } from "@/src/lib/components/ui/button";

export function SignDocumentShellHeader({
	pieceCid,
	onBack,
}: {
	pieceCid: string;
	onBack: () => void;
}) {
	return (
		<div className="flex items-center justify-between px-3 py-2 md:px-6 md:py-3 gap-3">
			<Button
				variant="ghost"
				size="sm"
				onClick={onBack}
				className="text-muted-foreground hover:text-foreground hover:bg-accent/50 -ml-2 shrink-0"
			>
				<ArrowLeftIcon className="size-4 mr-1.5" />
				<span className="text-sm">Back</span>
			</Button>
			<h2 className="text-sm flex items-center gap-1 font-semibold truncate text-foreground min-w-0">
				<span className="truncate">{pieceCid}</span>
				<CopyButton text={pieceCid} />
			</h2>
		</div>
	);
}
