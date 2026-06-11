import { CheckIcon } from "@phosphor-icons/react";
import { isAddress } from "viem";
import {
	Avatar,
	AvatarBadge,
	AvatarFallback,
} from "@/src/lib/components/ui/avatar";
import { initialsFromName } from "@/src/lib/utils/display-name";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import { filosignProfileDisplayName } from "@/src/routes/dashboard/envelope/create/-lib/utils/filosign-profile";

type Profile = {
	email?: string | null;
	firstName?: string | null;
	lastName?: string | null;
	walletAddress?: string | null;
};

export function FilosignRecipientHoverCard({
	recipient,
	profile,
}: {
	recipient: Recipient;
	profile: Profile | undefined;
}) {
	const displayName =
		recipient.name.trim() ||
		(profile
			? filosignProfileDisplayName({
					firstName: profile.firstName ?? null,
					lastName: profile.lastName ?? null,
				})
			: "") ||
		recipient.email.trim() ||
		"Filosign user";
	const email = recipient.email.trim() || profile?.email?.trim() || "";
	const hasWallet =
		!!profile?.walletAddress && isAddress(profile.walletAddress);

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-3">
				<Avatar className="size-10 border border-border/50">
					<AvatarFallback className="bg-muted/30 text-xs font-medium text-muted-foreground">
						{initialsFromName(displayName, email || "?")}
					</AvatarFallback>
					<AvatarBadge className="bg-chart-2 text-black ring-background">
						<CheckIcon className="size-full" />
					</AvatarBadge>
				</Avatar>
				<div className="min-w-0">
					<p className="truncate text-sm font-medium">{displayName}</p>
					<p className="truncate text-xs text-muted-foreground">{email}</p>
				</div>
			</div>
			<div className="space-y-1 border-t border-border/60 pt-3">
				<p className="text-xs font-medium text-foreground/90">
					Filosign account
				</p>
				<p className="text-xs text-muted-foreground">
					{hasWallet
						? "Verified user with a linked wallet."
						: "Verified user on Filosign."}
				</p>
			</div>
		</div>
	);
}
