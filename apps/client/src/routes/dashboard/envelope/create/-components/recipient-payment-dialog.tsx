import type { PaymentReleaseType } from "@filosign/shared";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { useEffect, useMemo, useState } from "react";
import { SUPPORTED_TOKENS } from "@/src/constants";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
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
import type { PaymentAttachmentDraft } from "@/src/routes/dashboard/envelope/create/-lib/types/payment-attachment";
import {
	buildDraftFromRecipient,
	recipientPaymentLabel,
} from "@/src/routes/dashboard/envelope/create/-lib/utils/payment-drafts";
import { isValidRecipientEmail } from "@/src/routes/dashboard/envelope/create/-lib/utils/recipient-email";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	recipient: Recipient;
	allRecipients: Recipient[];
	existingDraft: PaymentAttachmentDraft | undefined;
	onSave: (draft: PaymentAttachmentDraft) => void;
	onRemove: () => void;
};

export function RecipientPaymentDialog({
	open,
	onOpenChange,
	recipient,
	allRecipients,
	existingDraft,
	onSave,
	onRemove,
}: Props) {
	const [amountUsdc, setAmountUsdc] = useState("");
	const [releaseType, setReleaseType] =
		useState<PaymentReleaseType>("all_signed");
	const [specificSignerEmail, setSpecificSignerEmail] = useState("");

	const signerOptions = useMemo(() => {
		return allRecipients
			.filter((r) => r.role === "signer")
			.map((r) => {
				const raw = r.email?.trim();
				if (!raw || !isValidRecipientEmail(raw)) return null;
				return {
					email: normalizePlacementRecipientEmail(raw),
					label: recipientPaymentLabel(r),
				};
			})
			.filter((x): x is NonNullable<typeof x> => x !== null);
	}, [allRecipients]);

	useEffect(() => {
		if (!open) return;
		setAmountUsdc(existingDraft?.amountUsdc ?? "");
		setReleaseType(existingDraft?.releaseType ?? "all_signed");
		setSpecificSignerEmail(
			existingDraft?.specificSignerEmail ?? signerOptions[0]?.email ?? "",
		);
	}, [open, existingDraft, signerOptions]);

	const payeeLabel = recipientPaymentLabel(recipient);
	const emailValid = isValidRecipientEmail(recipient.email ?? "");

	const handleSave = () => {
		const trimmed = amountUsdc.trim();
		if (!trimmed || Number(trimmed) <= 0) return;
		if (!emailValid) return;

		const draft = buildDraftFromRecipient(recipient, {
			id: existingDraft?.id,
			amountUsdc: trimmed,
			releaseType,
			specificSignerEmail:
				releaseType === "specific_signer" ? specificSignerEmail : undefined,
		});
		if (!draft) return;

		onSave(draft);
		onOpenChange(false);
	};

	const handleRemove = () => {
		onRemove();
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent showCloseButton className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Attach funds</DialogTitle>
					<DialogDescription>
						Optional USDC payout to <strong>{payeeLabel}</strong> when release
						conditions are met. Funds stay in your wallet until payout executes.
					</DialogDescription>
				</DialogHeader>

				{!emailValid ? (
					<p className="text-sm text-destructive">
						Enter a valid email for this recipient before attaching funds.
					</p>
				) : (
					<div className="grid gap-4 py-1">
						<div className="grid gap-2">
							<Label htmlFor="recipient-payment-amount">Amount (USDC)</Label>
							<Input
								id="recipient-payment-amount"
								inputMode="decimal"
								value={amountUsdc}
								onChange={(e) => setAmountUsdc(e.target.value)}
								placeholder="0.00"
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="recipient-payment-release">Release when</Label>
							<Select
								value={releaseType}
								onValueChange={(v) => setReleaseType(v as PaymentReleaseType)}
							>
								<SelectTrigger id="recipient-payment-release">
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

						{releaseType === "specific_signer" ? (
							<div className="grid gap-2">
								<Label htmlFor="recipient-payment-signer">Signer</Label>
								{signerOptions.length === 0 ? (
									<p className="text-xs text-muted-foreground">
										Add at least one signer with a valid email.
									</p>
								) : (
									<Select
										value={specificSignerEmail}
										onValueChange={(v) => {
											if (v != null) setSpecificSignerEmail(v);
										}}
									>
										<SelectTrigger id="recipient-payment-signer">
											<SelectValue placeholder="Select signer" />
										</SelectTrigger>
										<SelectContent>
											{signerOptions.map((s) => (
												<SelectItem key={s.email} value={s.email}>
													{s.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							</div>
						) : null}

						<p className="text-xs text-muted-foreground">
							Token: {SUPPORTED_TOKENS[0].symbol} on this network. Filosign
							enforces recipient rules only when you send through Filosign;
							on-chain payouts are controlled by your wallet. You will approve
							this amount when sending.
						</p>
					</div>
				)}

				<DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
					{existingDraft ? (
						<Button
							type="button"
							variant="ghost"
							className="text-destructive sm:mr-auto"
							onClick={handleRemove}
						>
							Remove payment
						</Button>
					) : (
						<span className="hidden sm:block sm:mr-auto" />
					)}
					<div className="flex gap-2 sm:justify-end">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="primary"
							disabled={
								!emailValid ||
								!amountUsdc.trim() ||
								Number(amountUsdc) <= 0 ||
								(releaseType === "specific_signer" &&
									(!specificSignerEmail || signerOptions.length === 0))
							}
							onClick={handleSave}
						>
							Save
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
