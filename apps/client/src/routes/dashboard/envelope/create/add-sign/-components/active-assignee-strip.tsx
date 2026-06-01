import { useUserProfile } from "@filosign/react/users";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { useMemo } from "react";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { cn } from "@/src/lib/utils/utils";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import { isValidRecipientEmail } from "@/src/routes/dashboard/envelope/create/-lib/utils/recipient-email";
import type { SignatureField } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";
import { resolveSelfSignerOnRoster } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placement-assignees";
import { SELF_ASSIGNEE_ID } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placement-coordinates";
import { recipientResolvedSignerAddress } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/send-envelope";

export type ActiveAssignee = {
	id: string;
	email: string;
	name: string;
	walletAddress: string;
	isSelf: boolean;
	required: boolean;
	/** False when "Me" is shown but self is not on the signer roster yet. */
	placementEnabled: boolean;
};

type ActiveAssigneeStripProps = {
	activeAssigneeId: string;
	onSelect: (id: string) => void;
	fieldCountsByAssigneeId?: Map<string, number>;
};

export function countFieldsByAssignee(
	fields: SignatureField[],
	assignees: ActiveAssignee[],
): Map<string, number> {
	const counts = new Map<string, number>();
	for (const assignee of assignees) {
		counts.set(assignee.id, 0);
	}
	for (const field of fields) {
		const email = normalizePlacementRecipientEmail(field.assignedSignerEmail);
		const assignee = assignees.find((a) => a.email === email);
		if (!assignee) continue;
		counts.set(assignee.id, (counts.get(assignee.id) ?? 0) + 1);
	}
	return counts;
}

function signerRequiredFromRecipient(recipient: Recipient): boolean {
	return recipient.signerRequired !== false;
}

export function buildActiveAssignees(
	recipients: Recipient[],
	selfProfile:
		| { email?: string | null; walletAddress?: string | null }
		| null
		| undefined,
): ActiveAssignee[] {
	const out: ActiveAssignee[] = [];

	const selfOnRoster = resolveSelfSignerOnRoster(recipients, selfProfile);
	const profileEmail = selfProfile?.email?.trim()
		? normalizePlacementRecipientEmail(selfProfile.email)
		: null;

	if (profileEmail) {
		const rosterAddr = selfOnRoster
			? recipientResolvedSignerAddress(selfOnRoster.recipient)
			: null;
		out.push({
			id: SELF_ASSIGNEE_ID,
			email: selfOnRoster?.email ?? profileEmail,
			name: "Me",
			walletAddress: rosterAddr ?? selfProfile?.walletAddress?.trim() ?? "",
			isSelf: true,
			required: selfOnRoster
				? signerRequiredFromRecipient(selfOnRoster.recipient)
				: true,
			placementEnabled: Boolean(selfOnRoster),
		});
	}

	for (const r of recipients) {
		if (r.role !== "signer") continue;
		const raw = r.email?.trim();
		if (!raw || !isValidRecipientEmail(raw)) continue;
		const email = normalizePlacementRecipientEmail(raw);
		if (out.some((a) => a.email === email)) continue;
		const addr = recipientResolvedSignerAddress(r);
		out.push({
			id: email,
			email,
			name: r.name?.trim() || email,
			walletAddress: addr ?? "",
			isSelf: false,
			required: signerRequiredFromRecipient(r),
			placementEnabled: true,
		});
	}

	return out;
}

export function ActiveAssigneeStrip({
	activeAssigneeId,
	onSelect,
	fieldCountsByAssigneeId,
}: ActiveAssigneeStripProps) {
	const createForm = useStorePersist((s) => s.createForm);
	const { data: selfProfile } = useUserProfile();
	const assignees = buildActiveAssignees(
		createForm?.recipients ?? [],
		selfProfile,
	);

	const counts = useMemo(() => {
		if (fieldCountsByAssigneeId) return fieldCountsByAssigneeId;
		return countFieldsByAssignee(createForm?.signatureFields ?? [], assignees);
	}, [fieldCountsByAssigneeId, createForm?.signatureFields, assignees]);

	if (assignees.length === 0) {
		return (
			<p className="text-xs text-muted-foreground">
				Add signers on the form page first.
			</p>
		);
	}

	return (
		<div className="space-y-2">
			<p className="text-xs font-medium text-muted-foreground">Assign to</p>
			<div className="flex flex-wrap gap-1.5">
				{assignees.map((assignee) => {
					const count = counts.get(assignee.id) ?? 0;
					const disabled = !assignee.placementEnabled;
					return (
						<button
							key={assignee.id}
							type="button"
							disabled={disabled}
							title={
								disabled
									? 'Turn on "I also need to sign" on the form page to place fields for yourself'
									: assignee.isSelf
										? assignee.email
										: undefined
							}
							className={cn(
								"inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors",
								disabled &&
									"cursor-not-allowed opacity-50 hover:border-border/60 hover:text-muted-foreground",
								!disabled &&
									(activeAssigneeId === assignee.id
										? "border-primary bg-primary/10 text-primary font-medium"
										: "border-border/60 bg-background text-muted-foreground hover:border-border hover:text-foreground"),
							)}
							onClick={() => {
								if (disabled) return;
								onSelect(assignee.id);
							}}
						>
							{assignee.isSelf ? "Me" : assignee.name}
							{count > 0 ? (
								<span
									className={cn(
										"inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none",
										activeAssigneeId === assignee.id
											? "bg-primary/20 text-primary"
											: "bg-muted text-muted-foreground",
									)}
								>
									{count}
								</span>
							) : null}
						</button>
					);
				})}
			</div>
		</div>
	);
}

export function resolveActiveAssignee(
	assignees: ActiveAssignee[],
	activeAssigneeId: string,
): ActiveAssignee | null {
	return (
		assignees.find((a) => a.id === activeAssigneeId) ?? assignees[0] ?? null
	);
}
