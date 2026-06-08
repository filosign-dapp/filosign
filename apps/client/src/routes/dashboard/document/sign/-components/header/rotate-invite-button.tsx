import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import {
	useSignColdShare,
	useSignMeta,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";
import { useSignHeaderUi } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-header-ui";

type SignHeaderRotateInviteButtonProps = {
	variant: "compact" | "comfortable" | "header-icon";
};

export function SignHeaderRotateInviteButton({
	variant,
}: SignHeaderRotateInviteButtonProps) {
	const { isSender } = useSignMeta();
	const { regenerateColdInvite } = useSignColdShare();
	const { setRotateInviteOpen } = useSignHeaderUi();

	if (!isSender) return null;

	if (variant === "header-icon") {
		return (
			<Button
				type="button"
				variant="outline"
				size="icon-lg"
				onClick={() => setRotateInviteOpen(true)}
				disabled={regenerateColdInvite.isPending}
				aria-label="Rotate invite"
				title="Rotate invite"
			>
				<ArrowClockwiseIcon className="size-4" />
			</Button>
		);
	}

	if (variant === "compact") {
		return (
			<Button
				variant="outline"
				size="sm"
				onClick={() => setRotateInviteOpen(true)}
				disabled={regenerateColdInvite.isPending}
				className="h-8 px-2 text-xs"
			>
				<ArrowClockwiseIcon className="mr-1 size-3.5" />
				Rotate
			</Button>
		);
	}

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={() => setRotateInviteOpen(true)}
			disabled={regenerateColdInvite.isPending}
			className="h-8 gap-1.5"
			title="Rotate invite"
		>
			<ArrowClockwiseIcon className="size-4" />
			Rotate Invite
		</Button>
	);
}
