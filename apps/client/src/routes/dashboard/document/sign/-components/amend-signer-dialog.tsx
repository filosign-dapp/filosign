import {
	hashNormalizedSignerEmail,
	normalizePlacementRecipientEmail,
} from "@filosign/shared";
import { useEffect, useState } from "react";
import type { Hex } from "viem";
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
import { isValidRecipientEmail } from "@/src/lib/domains/invites/recipient-email";

export type AmendSignerOption = {
	email: string;
	label: string;
	commitment: Hex;
};

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	signers: AmendSignerOption[];
	signingStarted?: boolean;
	hasSpecificSignerPayout?: boolean;
	onConfirm: (args: {
		oldCommitment: Hex;
		newCommitment: Hex;
		newEmail: string;
	}) => Promise<void>;
	pending?: boolean;
};

export function AmendSignerDialog({
	open,
	onOpenChange,
	signers,
	signingStarted = false,
	hasSpecificSignerPayout = false,
	onConfirm,
	pending,
}: Props) {
	const [selectedEmail, setSelectedEmail] = useState("");
	const [newEmail, setNewEmail] = useState("");

	useEffect(() => {
		if (!open) return;
		setSelectedEmail(signers[0]?.email ?? "");
		setNewEmail("");
	}, [open, signers]);

	const selected = signers.find((s) => s.email === selectedEmail);
	const newEmailValid = isValidRecipientEmail(newEmail.trim());

	const handleConfirm = async () => {
		if (!selected || !newEmailValid) return;
		const newCommitment = hashNormalizedSignerEmail(
			normalizePlacementRecipientEmail(newEmail.trim()),
		);
		await onConfirm({
			oldCommitment: selected.commitment,
			newCommitment,
			newEmail: normalizePlacementRecipientEmail(newEmail.trim()),
		});
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent showCloseButton className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Change a signer</DialogTitle>
					<DialogDescription>
						<div className="space-y-2">
							<p>
								Replace an unsigned roster slot with a new email. Signers who
								already signed cannot be swapped directly.
							</p>
							{signingStarted ? (
								<p>
									Because signing has started, this change goes pending until
									you execute it. Execute clears every signature and everyone
									must sign again.
								</p>
							) : null}
							{hasSpecificSignerPayout ? (
								<p>
									Attached payouts tied to a specific signer will remap their
									release condition on-chain. USDC recipient wallets on payout
									legs do not change automatically.
								</p>
							) : null}
						</div>
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-1">
					{signers.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							Every signer has already signed. Use Clear signatures in Sender
							tools to reopen roster changes.
						</p>
					) : (
						<>
							<div className="grid gap-2">
								<Label>Current signer</Label>
								<Select
									value={selectedEmail}
									onValueChange={(value) => setSelectedEmail(value ?? "")}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select signer" />
									</SelectTrigger>
									<SelectContent>
										{signers.map((s) => (
											<SelectItem key={s.email} value={s.email}>
												{s.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="amend-signer-new-email">New email</Label>
								<Input
									id="amend-signer-new-email"
									type="email"
									value={newEmail}
									onChange={(e) => setNewEmail(e.target.value)}
									placeholder="signer@example.com"
								/>
							</div>
						</>
					)}
				</div>
				<DialogFooter>
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
							signers.length === 0 || !selected || !newEmailValid || pending
						}
						onClick={() => void handleConfirm().catch(console.error)}
					>
						{pending ? "Saving…" : "Save change"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
