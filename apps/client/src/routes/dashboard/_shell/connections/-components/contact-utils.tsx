import { CopySimpleIcon } from "@phosphor-icons/react";

import { Button } from "@/src/lib/components/ui/button";
import { cn } from "@/src/lib/utils/index";
import { copyToClipboard } from "@/src/lib/utils/utils";

export function shortWallet(address: string | undefined | null) {
	if (!address || address.length < 12) return address ?? "—";
	return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

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

export function initialsFromName(name: string | null, fallback: string) {
	const src = name?.trim() || fallback;
	const parts = src
		.replace(/0x/gi, "")
		.split(/[\s._-]+/)
		.filter(Boolean);
	const a = parts[0]?.[0];
	const b = parts[1]?.[0];
	if (a !== undefined && b !== undefined)
		return `${a}${b}`.toUpperCase().slice(0, 2);
	return src.slice(0, 2).toUpperCase();
}
