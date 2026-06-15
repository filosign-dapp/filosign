import { orderSignersByRoutingEmails } from "@filosign/shared";
import { UserIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { Skeleton } from "@/src/lib/components/ui/skeleton";
import {
	SignerListRow,
	signerListRowKey,
} from "@/src/routes/dashboard/document/sign/-components/sidebar/signer-list-row";
import { SignSidebarSignersProgress } from "@/src/routes/dashboard/document/sign/-components/sidebar/signers-progress";
import type { EnvelopeProgressLike } from "@/src/routes/dashboard/document/sign/-lib/utils/envelope-progress-display";

type SignerRow =
	| string
	| {
			wallet: string;
			name: string | null;
			email: string | null;
			invitePending?: boolean;
	  };

type PendingSignerReplacement = {
	oldCommitment: `0x${string}`;
	newCommitment: `0x${string}`;
	oldEmail?: string | null;
	newEmail?: string | null;
};

function normalizeSignerRow(signer: SignerRow): {
	wallet: string;
	name: string | null;
	email: string | null;
	invitePending: boolean;
} {
	if (typeof signer === "string") {
		return { wallet: signer, name: null, email: null, invitePending: false };
	}
	return {
		wallet: signer.wallet,
		name: signer.name,
		email: signer.email,
		invitePending: signer.invitePending === true,
	};
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
	pendingSignerReplacement,
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
	pendingSignerReplacement?: PendingSignerReplacement | null;
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
				{orderedSigners.map((signer) => (
					<SignerListRow
						key={signerListRowKey(signer)}
						signer={signer}
						signature={signatures?.find(
							(s) => s.signer.toLowerCase() === signer.wallet.toLowerCase(),
						)}
						signerAddress={signerAddress}
						formatAddress={formatAddress}
						isSequential={isSequential}
						envelopeProgress={envelopeProgress}
						nextSignerEmail={nextSignerEmail}
						pendingSignerReplacement={pendingSignerReplacement}
					/>
				))}
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
