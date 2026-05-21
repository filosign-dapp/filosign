import { useActiveOrgId, useOrganizationGet } from "@filosign/react/orgs";
import type { PaymentReleaseType } from "@filosign/shared";
import { useCallback } from "react";
import { getAddress } from "viem";
import { SUPPORTED_TOKENS } from "@/src/constants";
import { Button } from "@/src/lib/components/ui/button";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/src/lib/components/ui/select";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import type { PaymentAttachmentDraft } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types/payment-attachment";
import { recipientResolvedSignerAddress } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send-envelope";

type Props = {
	recipients: Recipient[];
	drafts: PaymentAttachmentDraft[];
	onChange: (drafts: PaymentAttachmentDraft[]) => void;
};

function newId() {
	return crypto.randomUUID();
}

export function PaymentAttachmentPanel({
	recipients,
	drafts,
	onChange,
}: Props) {
	const activeOrgId = useActiveOrgId();
	const orgQuery = useOrganizationGet(activeOrgId ?? undefined);
	const org = orgQuery.data?.organization;
	const orgWallet = org?.orgWalletAddress
		? getAddress(org.orgWalletAddress)
		: null;
	const orgName = org?.name;

	const participantOptions = recipients
		.map((r) => {
			const addr = recipientResolvedSignerAddress(r);
			if (!addr) return null;
			return {
				wallet: getAddress(addr),
				label: r.email?.trim() || addr,
				source: r.role === "viewer" ? ("viewer" as const) : ("signer" as const),
			};
		})
		.filter((x): x is NonNullable<typeof x> => x !== null);

	const addParticipantPayment = useCallback(
		(wallet: `0x${string}`, label: string, source: "signer" | "viewer") => {
			onChange([
				...drafts,
				{
					id: newId(),
					recipientWallet: wallet,
					recipientSource: source,
					recipientLabel: label,
					amountUsdc: "",
					releaseType: "all_signed",
				},
			]);
		},
		[drafts, onChange],
	);

	const addOrgWalletPayment = useCallback(() => {
		if (!orgWallet || !orgName) return;
		onChange([
			...drafts,
			{
				id: newId(),
				recipientWallet: orgWallet,
				recipientSource: "org_wallet",
				recipientLabel: `${orgName} payout wallet`,
				amountUsdc: "",
				releaseType: "all_signed",
			},
		]);
	}, [drafts, onChange, orgName, orgWallet]);

	const updateDraft = useCallback(
		(id: string, patch: Partial<PaymentAttachmentDraft>) => {
			onChange(drafts.map((d) => (d.id === id ? { ...d, ...patch } : d)));
		},
		[drafts, onChange],
	);

	const removeDraft = useCallback(
		(id: string) => {
			onChange(drafts.filter((d) => d.id !== id));
		},
		[drafts, onChange],
	);

	const orgWalletAlreadyAdded =
		orgWallet &&
		drafts.some(
			(d) =>
				d.recipientSource === "org_wallet" &&
				d.recipientWallet.toLowerCase() === orgWallet.toLowerCase(),
		);

	return (
		<div className="p-4 space-y-4 border-t">
			<div>
				<p className="font-medium text-sm">Attach USDC payment</p>
				<p className="text-xs text-muted-foreground mt-1">
					Optional payout when signing completes. Filosign enforces recipient
					rules only when you send through Filosign; on-chain rules are
					controlled by your wallet. Recipients must be on this envelope or your
					organization&apos;s linked payout wallet. Funds move from your wallet
					when conditions are met — not held by Filosign.
				</p>
			</div>

			{participantOptions.length > 0 && (
				<div className="space-y-2">
					<p className="text-xs font-medium text-muted-foreground">
						Envelope recipients
					</p>
					{participantOptions.map((p) => (
						<Button
							key={p.wallet}
							type="button"
							variant="outline"
							size="sm"
							className="w-full justify-start"
							onClick={() => addParticipantPayment(p.wallet, p.label, p.source)}
						>
							Pay {p.label}
						</Button>
					))}
				</div>
			)}

			{orgWallet && !orgWalletAlreadyAdded ? (
				<div className="space-y-2">
					<p className="text-xs font-medium text-muted-foreground">
						Organization
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="w-full justify-start"
						onClick={addOrgWalletPayment}
					>
						Pay {orgName} team wallet
					</Button>
				</div>
			) : null}

			{activeOrgId && !orgWallet ? (
				<p className="text-xs text-muted-foreground">
					Link an organization payout wallet in org settings to pay a team Safe.
				</p>
			) : null}

			{drafts.map((d) => (
				<div key={d.id} className="space-y-2 rounded-md border p-3">
					<div className="flex justify-between items-start gap-2">
						<p className="text-sm font-medium truncate">{d.recipientLabel}</p>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="shrink-0 h-7 px-2"
							onClick={() => removeDraft(d.id)}
						>
							Remove
						</Button>
					</div>
					{d.recipientSource === "org_wallet" ? (
						<p className="text-xs text-muted-foreground">
							Organization payout wallet
						</p>
					) : null}
					<div className="space-y-2">
						<Label>Amount (USDC)</Label>
						<Input
							inputMode="decimal"
							value={d.amountUsdc}
							onChange={(e) =>
								updateDraft(d.id, { amountUsdc: e.target.value })
							}
						/>
					</div>
					<div className="space-y-2">
						<Label>Release when</Label>
						<Select
							value={d.releaseType}
							onValueChange={(v) =>
								updateDraft(d.id, {
									releaseType: v as PaymentReleaseType,
								})
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all_signed">All signers signed</SelectItem>
								<SelectItem value="specific_signer">
									Specific signer signed
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			))}

			{drafts.length > 0 && (
				<p className="text-xs text-muted-foreground">
					Token: {SUPPORTED_TOKENS[0].symbol} on this network. You will approve
					each amount from your wallet when sending.
				</p>
			)}
		</div>
	);
}
