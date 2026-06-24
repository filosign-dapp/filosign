import { useFilosignContext } from "@filosign/react";
import type { AppRouterClient, InferClientOutputs } from "@filosign/react/orpc";
import { platformInviteEmailVariants } from "@filosign/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import env from "@/src/env";
import { CopyButton } from "@/src/lib/components/app/chrome/copy-button";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import { Input } from "@/src/lib/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/src/lib/components/ui/select";
import { Textarea } from "@/src/lib/components/ui/textarea";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { formatInlineAppError } from "@/src/lib/errors";

type InviteEmailVariant =
	InferClientOutputs<AppRouterClient>["platformAdmin"]["invites"]["list"]["items"][number]["emailVariant"];

const INVITE_EMAIL_VARIANT_LABELS: Record<InviteEmailVariant, string> = {
	warm: "Warm outreach",
	cold: "Cold outreach",
	custom: "Custom message",
};

export function AdminInvitesCreateDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { rpc, rpcQuery } = useFilosignContext();
	const queryClient = useQueryClient();

	const [partnerName, setPartnerName] = useState("");
	const [inviteEmailBody, setInviteEmailBody] = useState("");
	const [inviteEmailVariant, setInviteEmailVariant] =
		useState<InviteEmailVariant>("warm");
	const [recipientEmail, setRecipientEmail] = useState("");
	const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
	const [pendingInvite, setPendingInvite] = useState<{
		id: string;
		email: string;
		partnerName: string | null;
	} | null>(null);
	const [error, setError] = useState<string | null>(null);

	const resetForm = () => {
		setPartnerName("");
		setInviteEmailBody("");
		setInviteEmailVariant("warm");
		setRecipientEmail("");
		setError(null);
	};

	const createInvite = useMutation({
		meta: { suppressErrorToast: true },
		mutationFn: (input: {
			email: string;
			partnerName: string;
			emailVariant: InviteEmailVariant;
			emailBody?: string;
		}) =>
			rpc.platformAdmin.invites.create({
				kind: "partner_trial",
				planId: "teams_pro",
				email: input.email,
				note: input.partnerName,
				emailVariant: input.emailVariant,
				emailBody: input.emailBody || undefined,
			}),
		onSuccess: (result) => {
			const url = new URL("/", env.VITE_CLIENT_URL);
			url.searchParams.set("platformInvite", result.token as string);
			setLastInviteUrl(url.toString());
			if (result.email) {
				setPendingInvite({
					id: result.id,
					email: result.email,
					partnerName: result.note,
				});
				const label = result.note
					? `${result.note} (${result.email})`
					: result.email;
				toastUser.success(TOASTS.admin.inviteCreated(label));
			}
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.platformAdmin.invites.list.key(),
			});
			setRecipientEmail("");
			setPartnerName("");
			setInviteEmailBody("");
			setInviteEmailVariant("warm");
		},
		onError: (err) => setError(formatInlineAppError(err)),
	});

	const sendInviteEmail = useMutation({
		mutationFn: (inviteId: string) =>
			rpc.platformAdmin.invites.send({ inviteId }),
		onSuccess: (result, inviteId) => {
			if (result.emailSent && result.email) {
				toastUser.success(TOASTS.admin.inviteSent(result.email));
			} else if (result.email) {
				const readyCopy = TOASTS.admin.inviteReadyNoEmail(result.email);
				toastUser.success(readyCopy.title, { hint: readyCopy.hint });
			}
			if (pendingInvite?.id === inviteId) setPendingInvite(null);
		},
	});

	const handleCreate = () => {
		setError(null);
		const email = recipientEmail.trim();
		const name = partnerName.trim();
		if (!name) {
			setError("Enter the partner's name.");
			return;
		}
		if (!z.email().safeParse(email).success) {
			setError("Enter a valid recipient email.");
			return;
		}
		if (inviteEmailVariant === "custom" && !inviteEmailBody.trim()) {
			setError("Enter a custom message for the custom email variant.");
			return;
		}
		createInvite.mutate({
			email,
			partnerName: name,
			emailVariant: inviteEmailVariant,
			emailBody:
				inviteEmailVariant === "custom" ? inviteEmailBody.trim() : undefined,
		});
	};

	return (
		<Dialog
			open={props.open}
			onOpenChange={(open) => {
				props.onOpenChange(open);
				if (!open) {
					resetForm();
					setLastInviteUrl(null);
					setPendingInvite(null);
				}
			}}
		>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Create partner invite</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="space-y-1.5">
							<span className="text-xs text-muted-foreground">
								Partner name
							</span>
							<Input
								placeholder="Jordan Lee"
								value={partnerName}
								onChange={(e) => setPartnerName(e.target.value)}
								disabled={createInvite.isPending}
							/>
						</div>
						<div className="space-y-1.5">
							<span className="text-xs text-muted-foreground">
								Recipient email
							</span>
							<Input
								type="email"
								placeholder="partner@acme.com"
								value={recipientEmail}
								onChange={(e) => setRecipientEmail(e.target.value)}
								disabled={createInvite.isPending}
							/>
						</div>
					</div>

					<div className="space-y-1.5">
						<span className="text-xs text-muted-foreground">Email variant</span>
						<Select
							value={inviteEmailVariant}
							onValueChange={(v) =>
								setInviteEmailVariant(v as InviteEmailVariant)
							}
							disabled={createInvite.isPending}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{platformInviteEmailVariants.map((variant) => (
									<SelectItem key={variant} value={variant}>
										{INVITE_EMAIL_VARIANT_LABELS[variant]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{inviteEmailVariant === "custom" ? (
						<div className="space-y-1.5">
							<span className="text-xs text-muted-foreground">
								Custom message
							</span>
							<Textarea
								value={inviteEmailBody}
								onChange={(e) => setInviteEmailBody(e.target.value)}
								rows={4}
								disabled={createInvite.isPending}
							/>
						</div>
					) : null}

					{error ? <p className="text-xs text-destructive">{error}</p> : null}

					{lastInviteUrl ? (
						<div className="space-y-2 rounded-md border border-border/40 bg-muted/10 p-3 text-xs">
							<div className="flex items-center gap-2">
								<span className="flex-1 break-all font-mono">
									{lastInviteUrl}
								</span>
								<CopyButton text={lastInviteUrl} />
							</div>
							{pendingInvite ? (
								<Button
									size="sm"
									variant="secondary"
									onClick={() => sendInviteEmail.mutate(pendingInvite.id)}
									isLoading={sendInviteEmail.isPending}
								>
									Send email to {pendingInvite.email}
								</Button>
							) : null}
						</div>
					) : null}
				</div>

				<DialogFooter>
					<Button
						variant="primary"
						isLoading={createInvite.isPending}
						onClick={handleCreate}
					>
						Create invite
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
