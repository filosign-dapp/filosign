import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { useEffect, useMemo, useState } from "react";
import { getAddress } from "viem";
import { Button } from "@/src/lib/components/ui/button";
import { Checkbox } from "@/src/lib/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import { Label } from "@/src/lib/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/src/lib/components/ui/select";
import { cn } from "@/src/lib/utils/utils";

export type FieldPlacementSignerOption = {
	/** Normalized email — select value. */
	email: string;
	name: string;
	/** When on-platform, used for display / optional linkage only. */
	walletAddress?: `0x${string}`;
	/** Single-line label for the select (name + email). */
	label: string;
};

export type FieldPlacementConfirmPayload = {
	/** `0x…` when on-platform; empty for invite-only signers. */
	assignedSignerWallet: string;
	assignedSignerName: string;
	assignedSignerEmail: string;
	/** When true, field is required; when false, optional. */
	required: boolean;
};

type FieldPlacementDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	fieldTypeLabel: string;
	signers: FieldPlacementSignerOption[];
	onConfirm: (payload: FieldPlacementConfirmPayload) => void;
};

export function FieldPlacementDialog({
	open,
	onOpenChange,
	fieldTypeLabel,
	signers,
	onConfirm,
}: FieldPlacementDialogProps) {
	const firstEmail = signers[0]?.email ?? "";
	const [selectedEmail, setSelectedEmail] = useState(firstEmail);
	const [required, setRequired] = useState(true);

	const normalizedOptions = useMemo(
		() =>
			signers.map((s) => ({
				...s,
				key: normalizePlacementRecipientEmail(s.email),
			})),
		[signers],
	);

	const selectedSignerLabel = useMemo(() => {
		if (!selectedEmail) return null;
		const key = normalizePlacementRecipientEmail(selectedEmail);
		return normalizedOptions.find((o) => o.key === key)?.label ?? null;
	}, [selectedEmail, normalizedOptions]);

	useEffect(() => {
		if (!open) return;
		const initial = signers[0]?.email
			? normalizePlacementRecipientEmail(signers[0].email)
			: "";
		setSelectedEmail(initial);
		setRequired(true);
	}, [open, signers]);

	const handleConfirm = () => {
		if (!selectedEmail) return;
		const key = normalizePlacementRecipientEmail(selectedEmail);
		const picked = normalizedOptions.find((s) => s.key === key);
		const walletRaw = picked?.walletAddress?.trim();
		const assignedSignerWallet =
			walletRaw && /^0x[a-fA-F0-9]{40}$/.test(walletRaw)
				? getAddress(walletRaw as `0x${string}`)
				: "";
		onConfirm({
			assignedSignerWallet,
			assignedSignerName: picked?.name?.trim() || "Signer",
			assignedSignerEmail: key,
			required,
		});
		onOpenChange(false);
	};

	const handleCancel = () => {
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent showCloseButton className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Configure field</DialogTitle>
					<DialogDescription>
						Choose who must complete this <strong>{fieldTypeLabel}</strong>{" "}
						field and whether it is required before signing.
					</DialogDescription>
				</DialogHeader>

				{signers.length === 0 ? (
					<p className="text-sm text-destructive">
						Add at least one signer with an email before placing fields.
					</p>
				) : (
					<div className="grid gap-4 py-1">
						<div className="grid gap-2">
							<Label htmlFor="field-placement-signer">Assigned signer</Label>
							<Select
								value={selectedEmail}
								onValueChange={(v) => {
									if (v != null) setSelectedEmail(v);
								}}
							>
								<SelectTrigger
									id="field-placement-signer"
									className="h-auto min-h-9 w-full border-border/60 bg-muted/5 py-2 whitespace-normal"
								>
									<span
										className={cn(
											"line-clamp-2 min-w-0 flex-1 text-left text-sm wrap-break-word",
											!selectedSignerLabel && "text-muted-foreground",
										)}
									>
										{selectedSignerLabel ?? "Select signer"}
									</span>
								</SelectTrigger>
								<SelectContent>
									{normalizedOptions.map((s) => (
										<SelectItem key={s.key} value={s.key}>
											<span className="flex min-w-0 flex-col gap-0.5 text-left">
												<span className="truncate font-medium">{s.name}</span>
												<span className="truncate text-xs text-muted-foreground">
													{s.email}
												</span>
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<label
							htmlFor="field-placement-required"
							className="flex cursor-pointer items-start gap-3 rounded-md border border-border/60 bg-muted/5 p-3 text-sm"
						>
							<Checkbox
								id="field-placement-required"
								checked={required}
								onCheckedChange={(v) => setRequired(v === true)}
								className="mt-0.5"
							/>
							<span>
								<span className="font-medium text-foreground">
									Required field
								</span>
								<span className="mt-0.5 block text-xs text-muted-foreground">
									When unchecked, the signer may skip this field when signing.
								</span>
							</span>
						</label>
					</div>
				)}

				<DialogFooter>
					<Button type="button" variant="outline" onClick={handleCancel}>
						Cancel
					</Button>
					<Button
						type="button"
						variant="primary"
						disabled={signers.length === 0 || !selectedEmail}
						onClick={handleConfirm}
					>
						Place field
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
