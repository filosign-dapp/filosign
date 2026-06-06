import {
	ArrowSquareOutIcon,
	CheckIcon,
	ClockIcon,
	UserIcon,
} from "@phosphor-icons/react";
import { defaultChain } from "@/src/constants";
import { Skeleton } from "@/src/lib/components/ui/skeleton";
import { cn } from "@/src/lib/utils";

type SignerRow =
	| string
	| {
			wallet: string;
			name: string | null;
			email: string | null;
	  };

export function SignSidebarSignersList({
	signers,
	signatures,
	viewers,
	signerAddress,
	formatAddress,
	loading,
}: {
	signers: SignerRow[];
	signatures:
		| Array<{ signer: string; onchainTxHash?: string | null }>
		| undefined;
	viewers: SignerRow[] | undefined;
	signerAddress: string | null | undefined;
	formatAddress: (address: string) => string;
	loading?: boolean;
}) {
	return (
		<div className="space-y-4">
			<div className="space-y-2">
				{loading
					? Array.from({ length: 2 }).map((_, i) => (
							<Skeleton key={i} className="h-14 w-full rounded-lg" />
						))
					: null}
				{signers.map((signer) => {
					const signerWallet =
						typeof signer === "string" ? signer : signer.wallet;
					const signature = signatures?.find(
						(s) => s.signer.toLowerCase() === signerWallet.toLowerCase(),
					);
					const hasSigned = Boolean(signature);
					const isYou =
						signerAddress?.toLowerCase() === signerWallet.toLowerCase();
					const signerName = typeof signer === "string" ? null : signer.name;
					const signerEmail = typeof signer === "string" ? null : signer.email;
					const displayName = signerName || formatAddress(signerWallet);

					return (
						<div
							key={signerWallet}
							className={cn(
								"flex items-center gap-3 rounded-lg border p-3",
								hasSigned
									? "border-primary/20 bg-primary/5"
									: "border-border bg-muted/20",
							)}
						>
							<div
								className={cn(
									"flex size-8 shrink-0 items-center justify-center rounded-full",
									hasSigned ? "bg-primary text-primary-foreground" : "bg-muted",
								)}
							>
								{hasSigned ? (
									<CheckIcon className="size-4" weight="bold" />
								) : (
									<ClockIcon className="size-4 text-muted-foreground" />
								)}
							</div>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium">
									{displayName}
									{isYou ? (
										<span className="ml-1 text-xs text-muted-foreground">
											(You)
										</span>
									) : null}
								</p>
								{signerEmail ? (
									<p className="truncate text-xs text-muted-foreground">
										{signerEmail}
									</p>
								) : null}
								<p
									className={cn(
										"text-xs",
										hasSigned ? "text-primary" : "text-muted-foreground",
									)}
								>
									{hasSigned ? "Signed" : "Pending"}
								</p>
							</div>
							{signature?.onchainTxHash ? (
								<a
									href={`${defaultChain.blockExplorers?.default?.url}/tx/${signature.onchainTxHash}`}
									target="_blank"
									rel="noopener noreferrer"
									className="text-muted-foreground hover:text-foreground"
									title="View on explorer"
								>
									<ArrowSquareOutIcon className="size-4" />
								</a>
							) : null}
						</div>
					);
				})}
			</div>

			{viewers && viewers.length > 0 ? (
				<div className="space-y-2 border-t border-border/60 pt-3">
					<p className="text-xs font-medium text-muted-foreground">
						Viewers ({viewers.length})
					</p>
					{viewers.map((viewer) => {
						const viewerWallet =
							typeof viewer === "string" ? viewer : viewer.wallet;
						const viewerName = typeof viewer === "string" ? null : viewer.name;
						const viewerEmail =
							typeof viewer === "string" ? null : viewer.email;
						const displayName = viewerName || formatAddress(viewerWallet);

						return (
							<div
								key={viewerWallet}
								className="flex items-center gap-3 rounded-lg bg-muted/20 p-2"
							>
								<div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
									<UserIcon className="size-3 text-muted-foreground" />
								</div>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm text-muted-foreground">
										{displayName}
										{signerAddress?.toLowerCase() ===
											viewerWallet.toLowerCase() && (
											<span className="ml-1 text-xs">(You)</span>
										)}
									</p>
									{viewerEmail ? (
										<p className="truncate text-xs text-muted-foreground/70">
											{viewerEmail}
										</p>
									) : null}
								</div>
							</div>
						);
					})}
				</div>
			) : null}
		</div>
	);
}
