import {
	hashNormalizedSignerEmail,
	normalizePlacementRecipientEmail,
} from "@filosign/shared";
import {
	ArrowSquareOutIcon,
	CheckIcon,
	ClockIcon,
} from "@phosphor-icons/react";
import { defaultChain } from "@/src/constants";
import { cn } from "@/src/lib/utils";
import type { EnvelopeProgressLike } from "@/src/routes/dashboard/document/sign/-lib/utils/envelope-progress-display";

type OrderedSigner = {
	wallet: string;
	name: string | null;
	email: string | null;
	invitePending: boolean;
	turnIndex?: number | null;
};

type PendingSignerReplacement = {
	oldCommitment: `0x${string}`;
	newCommitment: `0x${string}`;
	oldEmail?: string | null;
	newEmail?: string | null;
};

function normalizedEmail(email: string | null): string | null {
	if (!email) return null;
	return normalizePlacementRecipientEmail(email).toLowerCase();
}

function matchesReplacementCommitment(
	pending: PendingSignerReplacement,
	role: "old" | "new",
	signerEmailNorm: string | null,
	signerCommitment: `0x${string}` | null,
): boolean {
	const targetEmail = role === "old" ? pending.oldEmail : pending.newEmail;
	const targetCommitment =
		role === "old" ? pending.oldCommitment : pending.newCommitment;

	if (targetEmail && signerEmailNorm === normalizedEmail(targetEmail)) {
		return true;
	}
	return signerCommitment != null && signerCommitment === targetCommitment;
}

function signerStatusLabel(args: {
	hasSigned: boolean;
	isReplacementOld: boolean;
	isReplacementNew: boolean;
	invitePending: boolean;
	isUpNext: boolean;
	isSequential: boolean;
}): string {
	if (args.hasSigned) return "Signed";
	if (args.isReplacementOld) return "Change pending (current)";
	if (args.isReplacementNew) return "Change pending (new)";
	if (args.invitePending) return "Invite pending";
	if (args.isUpNext) return "Up next";
	if (args.isSequential) return "Waiting";
	return "Pending";
}

export function SignerListRow(props: {
	signer: OrderedSigner;
	signature?: { onchainTxHash?: string | null };
	signerAddress?: string | null;
	formatAddress: (address: string) => string;
	isSequential: boolean;
	envelopeProgress?: EnvelopeProgressLike | null;
	nextSignerEmail: string | null;
	pendingSignerReplacement?: PendingSignerReplacement | null;
}) {
	const {
		signer,
		signature,
		signerAddress,
		formatAddress,
		isSequential,
		envelopeProgress,
		nextSignerEmail,
		pendingSignerReplacement,
	} = props;

	const signerWallet = signer.wallet;
	const hasSigned = Boolean(signature);
	const isYou = signerAddress?.toLowerCase() === signerWallet.toLowerCase();
	const signerEmail = signer.email;
	const displayName =
		signer.invitePending && signerEmail
			? signerEmail
			: signer.name || formatAddress(signerWallet);
	const signerEmailNorm = normalizedEmail(signerEmail);
	const signerCommitment = signerEmailNorm
		? hashNormalizedSignerEmail(signerEmailNorm)
		: null;
	const isReplacementOld =
		pendingSignerReplacement != null &&
		matchesReplacementCommitment(
			pendingSignerReplacement,
			"old",
			signerEmailNorm,
			signerCommitment,
		);
	const isReplacementNew =
		pendingSignerReplacement != null &&
		matchesReplacementCommitment(
			pendingSignerReplacement,
			"new",
			signerEmailNorm,
			signerCommitment,
		);
	const nextSignerEmailNorm = normalizedEmail(nextSignerEmail);
	const isUpNext =
		isSequential &&
		!hasSigned &&
		!envelopeProgress?.completedAt &&
		signerEmailNorm != null &&
		signerEmailNorm === nextSignerEmailNorm;
	const statusLabel = signerStatusLabel({
		hasSigned,
		isReplacementOld,
		isReplacementNew,
		invitePending: signer.invitePending,
		isUpNext,
		isSequential,
	});

	return (
		<div
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
						<span className="ml-1 text-xs text-muted-foreground">(You)</span>
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
							: isReplacementOld || isReplacementNew
								? "font-medium text-amber-700 dark:text-amber-300"
								: isUpNext
									? "font-medium text-primary"
									: "text-muted-foreground",
					)}
				>
					{statusLabel}
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
}

export function signerListRowKey(signer: OrderedSigner): string {
	if (signer.invitePending && signer.email) {
		return `pending:${signer.email}`;
	}
	return signer.wallet;
}
