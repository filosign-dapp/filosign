import {
	normalizePlacementRecipientEmail,
	orderSignersByRoutingEmails,
} from "@filosign/shared";
import {
	ArrowSquareOutIcon,
	CheckIcon,
	ClockIcon,
	UserIcon,
} from "@phosphor-icons/react";
import { useMemo } from "react";
import { defaultChain } from "@/src/constants";
import { Skeleton } from "@/src/lib/components/ui/skeleton";
import { cn } from "@/src/lib/utils";
import { SignSidebarSignersProgress } from "@/src/routes/dashboard/document/sign/-components/sidebar/signers-progress";
import type { EnvelopeProgressLike } from "@/src/routes/dashboard/document/sign/-lib/utils/envelope-progress-display";

type SignerRow =
	| string
	| {
			wallet: string;
			name: string | null;
			email: string | null;
	  };

function normalizeSignerRow(signer: SignerRow): {
	wallet: string;
	name: string | null;
	email: string | null;
} {
	if (typeof signer === "string") {
		return { wallet: signer, name: null, email: null };
	}
	return signer;
}

export function SignSidebarSignersList({
	signers,
	signatures,
	viewers,
	signerAddress,
	formatAddress,
	loading,
	envelopeProgress,
	canSignByRouting,
}: {
	signers: SignerRow[];
	signatures:
		| Array<{ signer: string; onchainTxHash?: string | null }>
		| undefined;
	viewers: SignerRow[] | undefined;
	signerAddress: string | null | undefined;
	formatAddress: (address: string) => string;
	loading?: boolean;
	envelopeProgress?: EnvelopeProgressLike | null;
	canSignByRouting?: boolean;
}) {
	const isSequential = envelopeProgress?.routingMode === 1;
	const nextSignerEmail = envelopeProgress?.nextSignerEmail ?? null;

	const orderedSigners = useMemo(() => {
		const roster = signers.map(normalizeSignerRow);
		return orderSignersByRoutingEmails(roster, {
			routingMode: envelopeProgress?.routingMode ?? 0,
			routingOrderEmails: envelopeProgress?.routingOrderEmails,
		});
	}, [
		signers,
		envelopeProgress?.routingMode,
		envelopeProgress?.routingOrderEmails,
	]);

	const showProgress = signers.length > 0;

	return (
		<div className="space-y-4">
			{showProgress ? (
				<SignSidebarSignersProgress
					progress={envelopeProgress}
					canSignByRouting={canSignByRouting}
				/>
			) : null}
			{isSequential && orderedSigners.length > 0 ? (
				<p className="text-[11px] font-medium text-muted-foreground">
					Signing order
				</p>
			) : null}
			<div className="space-y-2">
				{loading
					? Array.from({ length: 2 }).map((_, i) => (
							<Skeleton key={i} className="h-14 w-full rounded-lg" />
						))
					: null}
				{orderedSigners.map((signer) => {
					const signerWallet = signer.wallet;
					const signature = signatures?.find(
						(s) => s.signer.toLowerCase() === signerWallet.toLowerCase(),
					);
					const hasSigned = Boolean(signature);
					const isYou =
						signerAddress?.toLowerCase() === signerWallet.toLowerCase();
					const signerName = signer.name;
					const signerEmail = signer.email;
					const displayName = signerName || formatAddress(signerWallet);
					const signerEmailNorm = signerEmail
						? normalizePlacementRecipientEmail(signerEmail).toLowerCase()
						: null;
					const nextSignerEmailNorm = nextSignerEmail
						? normalizePlacementRecipientEmail(nextSignerEmail).toLowerCase()
						: null;
					const isUpNext =
						isSequential &&
						!hasSigned &&
						!envelopeProgress?.completedAt &&
						signerEmailNorm != null &&
						signerEmailNorm === nextSignerEmailNorm;

					return (
						<div
							key={signerWallet}
							className={cn(
								"flex items-center gap-3 rounded-lg border p-3",
								hasSigned
									? "border-primary/20 bg-primary/5"
									: isUpNext
										? "border-primary/30 bg-primary/5 ring-1 ring-primary/15"
										: "border-border bg-muted/20",
							)}
						>
							<div
								className={cn(
									"flex size-8 shrink-0 items-center justify-center rounded-full",
									hasSigned
										? "bg-primary text-primary-foreground"
										: isUpNext
											? "bg-primary/15 text-primary"
											: "bg-muted text-muted-foreground",
								)}
							>
								{hasSigned ? (
									<CheckIcon className="size-4" weight="bold" />
								) : signer.turnIndex != null ? (
									<span className="text-xs font-semibold tabular-nums">
										{signer.turnIndex}
									</span>
								) : (
									<ClockIcon className="size-4" />
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
										hasSigned
											? "text-primary"
											: isUpNext
												? "font-medium text-primary"
												: "text-muted-foreground",
									)}
								>
									{hasSigned
										? "Signed"
										: isUpNext
											? "Up next"
											: isSequential
												? "Waiting"
												: "Pending"}
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
