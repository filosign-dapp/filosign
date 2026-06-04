import {
	hashNormalizedSignerEmail,
	normalizePlacementRecipientEmail,
} from "@filosign/shared";
import { useEffect, useMemo, useState } from "react";
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
import { isValidRecipientEmail } from "@/src/routes/dashboard/envelope/create/-lib/utils/recipient-email";

type SignerOption = {
	email: string;
	label: string;
	commitment: Hex;
};

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	signers: SignerOption[];
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
	onConfirm,
	pending,
}: Props) {
	const [selectedEmail, setSelectedEmail] = useState("");
	const [newEmail, setNewEmail] = useState("");

	const options = useMemo(() => signers.filter((s) => s.email), [signers]);

	useEffect(() => {
		if (!open) return;
		setSelectedEmail(options[0]?.email ?? "");
		setNewEmail("");
	}, [open, options]);

	const selected = options.find((s) => s.email === selectedEmail);
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
						Replace one signer with a new email. If someone has already signed,
						signing pauses until you execute the change; cleared signatures must
						be collected again.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-1">
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
								{options.map((s) => (
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
						disabled={!selected || !newEmailValid || pending}
						onClick={() => void handleConfirm().catch(console.error)}
					>
						{pending ? "Saving…" : "Save change"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function signerOptionsFromFile(
	signers: readonly {
		email: string | null;
		name: string | null;
		wallet: string;
	}[],
): SignerOption[] {
	return signers
		.filter((s): s is typeof s & { email: string } => Boolean(s.email?.trim()))
		.map((s) => ({
			email: normalizePlacementRecipientEmail(s.email.trim()),
			label: s.name?.trim() || s.email.trim(),
			commitment: hashNormalizedSignerEmail(
				normalizePlacementRecipientEmail(s.email.trim()),
			),
		}));
}
