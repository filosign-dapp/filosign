import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/src/lib/components/ui/card";
import { cn } from "@/src/lib/utils";

/**
 * Inline notice when the signed-in identity does not match a cold-invite recipient list.
 * Use `embedded` when placing inside another card or panel (no nested Card chrome).
 */
export function ColdInviteNotForYouCallout({
	recipientEmails,
	signedInEmailForUi,
	className,
	embedded = false,
}: {
	recipientEmails: string[];
	signedInEmailForUi: string;
	className?: string;
	/** Flat layout for nesting inside a parent card next to actions */
	embedded?: boolean;
}) {
	if (recipientEmails.length === 0) return null;

	const body = (
		<>
			This invite is meant for{" "}
			<span
				translate="no"
				className="font-medium wrap-break-word text-foreground"
			>
				{recipientEmails.join(", ")}
			</span>
			.
			{signedInEmailForUi ? (
				<>
					{" "}
					You’re signed in as{" "}
					<span
						translate="no"
						className="font-medium break-all text-foreground"
					>
						{signedInEmailForUi}
					</span>
					. Switch account to continue.
				</>
			) : (
				<>
					{" "}
					We don’t see a matching email on this login. Switch account, then sign
					in with the invited address.
				</>
			)}
		</>
	);

	if (embedded) {
		return (
			<div role="alert" className={cn("min-w-0 w-full text-left", className)}>
				<p className="font-manrope font-semibold tracking-tight text-foreground">
					Invite Mismatch
				</p>
				<p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
					{body}
				</p>
			</div>
		);
	}

	return (
		<Card
			role="alert"
			size="sm"
			className={cn("min-w-0 w-full text-left", className)}
		>
			<CardHeader className="border-0">
				<CardTitle className="font-manrope font-semibold tracking-tight text-foreground">
					Invite Mismatch
				</CardTitle>
				<CardDescription className="mt-1 leading-relaxed text-pretty">
					{body}
				</CardDescription>
			</CardHeader>
		</Card>
	);
}
