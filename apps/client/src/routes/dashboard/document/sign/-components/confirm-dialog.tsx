import {
	SETTLEMENT_FEATURE_TERMS_VERSION,
	SETTLEMENT_RECIPIENT_ACK_LABEL,
	SIGN_CONFIRM_DESCRIPTION_V1,
} from "@filosign/shared";
import { SpinnerIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/src/lib/components/ui/alert-dialog";
import { Checkbox } from "@/src/lib/components/ui/checkbox";
import { Label } from "@/src/lib/components/ui/label";

export type SignConfirmResult = {
	settlementRecipientAck?: {
		termsVersion: string;
		acceptedAt: number;
	};
};

type SignConfirmDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: (result: SignConfirmResult) => void | Promise<void>;
	pending?: boolean;
	requiresPayoutAck?: boolean;
};

export function SignConfirmDialog({
	open,
	onOpenChange,
	onConfirm,
	pending,
	requiresPayoutAck = false,
}: SignConfirmDialogProps) {
	const [payoutAckChecked, setPayoutAckChecked] = useState(false);

	useEffect(() => {
		if (!open) setPayoutAckChecked(false);
	}, [open]);

	const canConfirm = !requiresPayoutAck || payoutAckChecked;

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirm signing intent</AlertDialogTitle>
					<AlertDialogDescription>
						{SIGN_CONFIRM_DESCRIPTION_V1}
					</AlertDialogDescription>
				</AlertDialogHeader>
				{requiresPayoutAck ? (
					<div className="flex items-start gap-2 rounded-lg border border-border/80 bg-muted/20 p-3">
						<Checkbox
							id="sign-payout-ack"
							checked={payoutAckChecked}
							onCheckedChange={(v) => setPayoutAckChecked(v === true)}
						/>
						<Label
							htmlFor="sign-payout-ack"
							className="text-sm font-normal leading-snug text-foreground"
						>
							{SETTLEMENT_RECIPIENT_ACK_LABEL}
						</Label>
					</div>
				) : null}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						variant="primary"
						disabled={pending || !canConfirm}
						onClick={() => {
							void (async () => {
								try {
									await onConfirm({
										...(requiresPayoutAck
											? {
													settlementRecipientAck: {
														termsVersion: SETTLEMENT_FEATURE_TERMS_VERSION,
														acceptedAt: Math.floor(Date.now() / 1000),
													},
												}
											: {}),
									});
									onOpenChange(false);
								} catch {
									// Caller handles user feedback; keep dialog open on failure.
								}
							})();
						}}
					>
						{pending ? (
							<>
								<SpinnerIcon className="size-4 animate-spin" />
								Signing…
							</>
						) : (
							"Sign document"
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
