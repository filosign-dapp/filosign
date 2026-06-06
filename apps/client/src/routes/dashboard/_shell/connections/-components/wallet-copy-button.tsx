import { CopySimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import { cn } from "@/src/lib/utils/index";
import { copyToClipboard } from "@/src/lib/utils/utils";

export function WalletCopyButton({
	address,
	className,
}: {
	address: string;
	className?: string;
}) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			className={cn(
				"h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground",
				className,
			)}
			aria-label="Copy wallet address"
			title="Copy address"
			onClick={() => copyToClipboard(address)}
		>
			<CopySimpleIcon className="size-3.5" />
		</Button>
	);
}
